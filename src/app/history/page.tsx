import type { Metadata } from 'next';
import Link from 'next/link';

import { getHistorySessions } from '@/actions/history';
import { getWeapon, SCOPE_LIST } from '@/game/pubg';
import type { ProfileType, SensitivityAcceptanceFeedback } from '@/types/engine';
import { Header } from '@/ui/components/header';
import { WeaponIcon } from '@/ui/components/weapon-icon';

export const metadata: Metadata = {
    title: 'Historico de Analises',
    description: 'Acompanhe sua evolucao ao longo do tempo com o historico completo de analises.',
};

type HistorySession = Awaited<ReturnType<typeof getHistorySessions>>[number];
type FieldTrendState = 'rising' | 'mixed' | 'review';

const PROFILE_LABELS: Record<ProfileType, string> = {
    low: 'Baixa',
    balanced: 'Balanceada',
    high: 'Alta',
};

const ACCEPTANCE_META = {
    improved: {
        label: 'Melhorou em campo',
        color: 'var(--color-success)',
        background: 'rgba(34, 197, 94, 0.12)',
        border: 'rgba(34, 197, 94, 0.22)',
    },
    same: {
        label: 'Ficou estavel',
        color: '#74d7ff',
        background: 'rgba(116, 215, 255, 0.12)',
        border: 'rgba(116, 215, 255, 0.22)',
    },
    worse: {
        label: 'Piorou em campo',
        color: 'var(--color-error)',
        background: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.22)',
    },
    pending: {
        label: 'Aguardando teste real',
        color: 'var(--color-text-muted)',
        background: 'rgba(148, 163, 184, 0.08)',
        border: 'rgba(148, 163, 184, 0.18)',
    },
} as const;

const FIELD_TREND_META: Record<FieldTrendState, {
    readonly label: string;
    readonly description: string;
    readonly color: string;
    readonly background: string;
    readonly border: string;
}> = {
    rising: {
        label: 'Linha subindo',
        description: 'O retorno de campo esta reforcando a linha de sens recomendada.',
        color: 'var(--color-success)',
        background: 'rgba(34, 197, 94, 0.12)',
        border: 'rgba(34, 197, 94, 0.22)',
    },
    mixed: {
        label: 'Validando',
        description: 'Ja existe feedback util, mas ainda falta campo para fechar a leitura.',
        color: '#74d7ff',
        background: 'rgba(116, 215, 255, 0.12)',
        border: 'rgba(116, 215, 255, 0.22)',
    },
    review: {
        label: 'Pedir revisao',
        description: 'Os testes reais estao sinalizando que essa linha precisa de novo ajuste.',
        color: 'var(--color-error)',
        background: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.22)',
    },
};

function isProfileType(value: string | undefined): value is ProfileType {
    return value === 'low' || value === 'balanced' || value === 'high';
}

function getAcceptanceMeta(feedback?: SensitivityAcceptanceFeedback) {
    if (!feedback) {
        return ACCEPTANCE_META.pending;
    }

    return ACCEPTANCE_META[feedback.outcome];
}

function resolveTrendState(summary: {
    readonly improvedCount: number;
    readonly sameCount: number;
    readonly worseCount: number;
    readonly testedSessions: number;
}): FieldTrendState {
    if (summary.worseCount >= Math.max(1, summary.improvedCount + summary.sameCount)) {
        return 'review';
    }

    if (summary.testedSessions >= 2 && summary.improvedCount > summary.worseCount) {
        return 'rising';
    }

    if ((summary.improvedCount * 2) + summary.sameCount - (summary.worseCount * 2) <= -2) {
        return 'review';
    }

    return 'mixed';
}

function buildFieldTrendSummaries(sessions: readonly HistorySession[]) {
    const grouped = new Map<string, {
        weaponKey: string;
        weaponId: string;
        weaponName: string;
        category: string | null | undefined;
        latestSessionId: string;
        latestFeedbackAt: Date;
        testedSessions: number;
        improvedCount: number;
        sameCount: number;
        worseCount: number;
    }>();

    for (const session of sessions) {
        if (!session.acceptanceFeedback) {
            continue;
        }

        const staticWeapon = getWeapon(session.weaponId) ?? (session.weaponName ? getWeapon(session.weaponName) : undefined);
        const weaponKey = staticWeapon?.id ?? session.weaponName ?? session.weaponId;
        const weaponName = session.weaponName ?? staticWeapon?.name ?? session.weaponId;
        const feedbackDate = new Date(session.acceptanceFeedback.recordedAt);
        const resolvedFeedbackDate = Number.isNaN(feedbackDate.getTime()) ? session.createdAt : feedbackDate;
        const current = grouped.get(weaponKey) ?? {
            weaponKey,
            weaponId: staticWeapon?.id ?? session.weaponId,
            weaponName,
            category: session.weaponCategory ?? staticWeapon?.category,
            latestSessionId: session.id,
            latestFeedbackAt: resolvedFeedbackDate,
            testedSessions: 0,
            improvedCount: 0,
            sameCount: 0,
            worseCount: 0,
        };

        current.testedSessions += 1;
        if (session.acceptanceFeedback.outcome === 'improved') {
            current.improvedCount += 1;
        } else if (session.acceptanceFeedback.outcome === 'same') {
            current.sameCount += 1;
        } else {
            current.worseCount += 1;
        }

        if (resolvedFeedbackDate.getTime() >= current.latestFeedbackAt.getTime()) {
            current.latestFeedbackAt = resolvedFeedbackDate;
            current.latestSessionId = session.id;
            current.weaponId = staticWeapon?.id ?? session.weaponId;
            current.weaponName = weaponName;
            current.category = session.weaponCategory ?? staticWeapon?.category;
        }

        grouped.set(weaponKey, current);
    }

    return Array.from(grouped.values())
        .map((summary) => ({
            ...summary,
            trend: resolveTrendState(summary),
        }))
        .sort((a, b) => {
            if (b.latestFeedbackAt.getTime() !== a.latestFeedbackAt.getTime()) {
                return b.latestFeedbackAt.getTime() - a.latestFeedbackAt.getTime();
            }

            return b.testedSessions - a.testedSessions;
        });
}

export default async function HistoryPage() {
    const sessions = await getHistorySessions();
    const sortedSessions = sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const fieldTrendSummaries = buildFieldTrendSummaries(sortedSessions).slice(0, 6);

    return (
        <>
            <Header />
            <div className="page animate-fade-in">
                <div className="container" style={{ maxWidth: '980px', margin: '0 auto' }}>
                    <h1 style={{ marginBottom: 'var(--space-sm)' }}>Historico de Analises</h1>
                    <p style={{ marginBottom: 'var(--space-2xl)', color: 'var(--color-text-muted)' }}>
                        Acompanhe sua evolucao ao longo do tempo. Agora o historico tambem cruza o resultado real do teste da sens para mostrar quais linhas estao firmando em campo.
                    </p>

                    {sortedSessions.length === 0 ? (
                        <div
                            className="glass-card"
                            style={{
                                textAlign: 'center',
                                padding: 'var(--space-4xl) var(--space-xl)',
                            }}
                        >
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-lg)' }}>📊</div>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>Nenhuma analise ainda</h3>
                            <p style={{ marginBottom: 'var(--space-xl)', color: 'var(--color-text-muted)' }}>
                                Envie seu primeiro clip de spray para criar uma linha de base e acompanhar como seus ajustes evoluem ao longo do tempo.
                            </p>
                            <Link href="/analyze" className="btn btn-primary btn-lg">
                                Fazer Primeira Analise
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div
                                className="glass-card"
                                style={{
                                    padding: 'var(--space-xl)',
                                    marginBottom: 'var(--space-xl)',
                                    background: 'linear-gradient(145deg, rgba(10, 16, 24, 0.96), rgba(8, 8, 12, 0.92))',
                                    border: '1px solid rgba(121, 240, 255, 0.14)',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        gap: 'var(--space-lg)',
                                        marginBottom: fieldTrendSummaries.length > 0 ? 'var(--space-lg)' : 0,
                                    }}
                                >
                                    <div style={{ maxWidth: '540px' }}>
                                        <p
                                            style={{
                                                margin: '0 0 var(--space-xs) 0',
                                                fontSize: '11px',
                                                letterSpacing: '0.18em',
                                                textTransform: 'uppercase',
                                                color: '#74d7ff',
                                            }}
                                        >
                                            Leitura de campo
                                        </p>
                                        <h2 style={{ margin: 0, fontSize: 'var(--text-2xl)', lineHeight: 1.1 }}>
                                            Qual linha de sens esta respondendo melhor fora do laboratorio
                                        </h2>
                                    </div>

                                    <p style={{ margin: 0, maxWidth: '360px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                                        O motor agora separa recomendacoes que estao melhorando em campo das linhas que estao pedindo revisao. Quando a sens piora no teste real, ela deixa de reforcar a convergencia futura.
                                    </p>
                                </div>

                                {fieldTrendSummaries.length > 0 ? (
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                            gap: 'var(--space-md)',
                                        }}
                                    >
                                        {fieldTrendSummaries.map((summary) => {
                                            const trendMeta = FIELD_TREND_META[summary.trend];
                                            return (
                                                <Link
                                                    href={`/history/${summary.latestSessionId}`}
                                                    key={summary.weaponKey}
                                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                                >
                                                    <div
                                                        style={{
                                                            height: '100%',
                                                            padding: 'var(--space-lg)',
                                                            borderRadius: 'var(--radius-lg)',
                                                            background: 'rgba(255, 255, 255, 0.02)',
                                                            border: `1px solid ${trendMeta.border}`,
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: 'var(--space-md)',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                gap: 'var(--space-md)',
                                                            }}
                                                        >
                                                            <WeaponIcon
                                                                category={summary.category}
                                                                size={46}
                                                                weaponId={summary.weaponId}
                                                                weaponName={summary.weaponName}
                                                            />
                                                            <span
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    padding: '6px 10px',
                                                                    borderRadius: '999px',
                                                                    border: `1px solid ${trendMeta.border}`,
                                                                    background: trendMeta.background,
                                                                    color: trendMeta.color,
                                                                    fontSize: '11px',
                                                                    fontWeight: 700,
                                                                    letterSpacing: '0.04em',
                                                                    textTransform: 'uppercase',
                                                                }}
                                                            >
                                                                {trendMeta.label}
                                                            </span>
                                                        </div>

                                                        <div>
                                                            <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', lineHeight: 1.2 }}>
                                                                {summary.weaponName}
                                                            </h3>
                                                            <p style={{ margin: '6px 0 0 0', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                                                                {trendMeta.description}
                                                            </p>
                                                        </div>

                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                            <span
                                                                style={{
                                                                    padding: '6px 10px',
                                                                    borderRadius: '999px',
                                                                    background: 'rgba(34, 197, 94, 0.12)',
                                                                    color: 'var(--color-success)',
                                                                    fontSize: '12px',
                                                                }}
                                                            >
                                                                +{summary.improvedCount} melhorou
                                                            </span>
                                                            <span
                                                                style={{
                                                                    padding: '6px 10px',
                                                                    borderRadius: '999px',
                                                                    background: 'rgba(116, 215, 255, 0.12)',
                                                                    color: '#74d7ff',
                                                                    fontSize: '12px',
                                                                }}
                                                            >
                                                                ={summary.sameCount} igual
                                                            </span>
                                                            <span
                                                                style={{
                                                                    padding: '6px 10px',
                                                                    borderRadius: '999px',
                                                                    background: 'rgba(239, 68, 68, 0.12)',
                                                                    color: 'var(--color-error)',
                                                                    fontSize: '12px',
                                                                }}
                                                            >
                                                                -{summary.worseCount} piorou
                                                            </span>
                                                        </div>

                                                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                                            {summary.testedSessions} teste(s) real(is) salvos · ultimo retorno em{' '}
                                                            {summary.latestFeedbackAt.toLocaleDateString('pt-BR')}
                                                        </p>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            padding: 'var(--space-lg)',
                                            borderRadius: 'var(--radius-lg)',
                                            border: '1px dashed rgba(148, 163, 184, 0.2)',
                                            background: 'rgba(255, 255, 255, 0.02)',
                                            color: 'var(--color-text-muted)',
                                        }}
                                    >
                                        Nenhum teste real foi marcado ainda. Abra uma analise salva e use o painel &quot;Melhorou / Ficou igual / Piorou&quot; para transformar o historico em leitura de campo.
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                {sortedSessions.map((session, index) => {
                                    const scope = SCOPE_LIST.find((candidate) => candidate.id === session.scopeId);
                                    const staticWeapon = getWeapon(session.weaponId) ?? (session.weaponName ? getWeapon(session.weaponName) : undefined);
                                    const weaponName = session.weaponName ?? staticWeapon?.name ?? session.weaponId;
                                    const category = session.weaponCategory ?? staticWeapon?.category;
                                    const acceptanceMeta = getAcceptanceMeta(session.acceptanceFeedback);
                                    const recommendedProfile = isProfileType(session.recommendedProfile)
                                        ? PROFILE_LABELS[session.recommendedProfile]
                                        : undefined;

                                    return (
                                        <Link
                                            href={`/history/${session.id}`}
                                            key={session.id}
                                            style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                                        >
                                            <div
                                                className={`glass-card animate-fade-in-up stagger-${Math.min(index + 1, 5)}`}
                                                style={{
                                                    padding: 'var(--space-lg)',
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: 'var(--space-lg)',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 'var(--space-lg)',
                                                        minWidth: 'min(100%, 320px)',
                                                    }}
                                                >
                                                    <WeaponIcon
                                                        category={category}
                                                        size={54}
                                                        weaponId={session.weaponId}
                                                        weaponName={weaponName}
                                                    />

                                                    <div style={{ minWidth: 0 }}>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                flexWrap: 'wrap',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                marginBottom: '8px',
                                                            }}
                                                        >
                                                            <h3
                                                                style={{
                                                                    margin: 0,
                                                                    fontSize: 'var(--text-lg)',
                                                                    lineHeight: 1.2,
                                                                }}
                                                            >
                                                                {weaponName}
                                                            </h3>

                                                            <span
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    padding: '6px 10px',
                                                                    borderRadius: '999px',
                                                                    border: `1px solid ${acceptanceMeta.border}`,
                                                                    background: acceptanceMeta.background,
                                                                    color: acceptanceMeta.color,
                                                                    fontSize: '11px',
                                                                    fontWeight: 700,
                                                                    letterSpacing: '0.04em',
                                                                    textTransform: 'uppercase',
                                                                }}
                                                            >
                                                                {acceptanceMeta.label}
                                                            </span>

                                                            {recommendedProfile ? (
                                                                <span
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        padding: '6px 10px',
                                                                        borderRadius: '999px',
                                                                        border: '1px solid rgba(148, 163, 184, 0.18)',
                                                                        background: 'rgba(148, 163, 184, 0.08)',
                                                                        color: 'var(--color-text-muted)',
                                                                        fontSize: '11px',
                                                                        fontWeight: 700,
                                                                        letterSpacing: '0.04em',
                                                                        textTransform: 'uppercase',
                                                                    }}
                                                                >
                                                                    Linha: {recommendedProfile}
                                                                </span>
                                                            ) : null}
                                                        </div>

                                                        <p style={{ margin: 0, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                                                            Mira: {scope?.name ?? session.scopeId} · Patch: {session.patchVersion} ·{' '}
                                                            {session.createdAt.toLocaleDateString('pt-BR')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        gap: 'var(--space-lg)',
                                                        flexWrap: 'wrap',
                                                        flexGrow: 1,
                                                        justifyContent: 'space-around',
                                                    }}
                                                >
                                                    <div style={{ textAlign: 'center', minWidth: '60px' }}>
                                                        <div
                                                            style={{
                                                                fontSize: 'var(--text-xl)',
                                                                fontFamily: 'var(--font-mono)',
                                                                fontWeight: 700,
                                                                color: session.stabilityScore >= 70
                                                                    ? 'var(--color-success)'
                                                                    : session.stabilityScore >= 40
                                                                        ? 'var(--color-warning)'
                                                                        : 'var(--color-error)',
                                                            }}
                                                        >
                                                            {Math.round(session.stabilityScore)}
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontSize: '10px',
                                                                color: 'var(--color-text-muted)',
                                                                textTransform: 'uppercase',
                                                            }}
                                                        >
                                                            Estabilidade
                                                        </div>
                                                    </div>

                                                    <div style={{ textAlign: 'center', minWidth: '60px' }}>
                                                        <div
                                                            style={{
                                                                fontSize: 'var(--text-xl)',
                                                                fontFamily: 'var(--font-mono)',
                                                                fontWeight: 700,
                                                                color: Math.abs(session.verticalControl - 1) < 0.15
                                                                    ? 'var(--color-success)'
                                                                    : 'var(--color-warning)',
                                                            }}
                                                        >
                                                            {session.verticalControl.toFixed(2)}x
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontSize: '10px',
                                                                color: 'var(--color-text-muted)',
                                                                textTransform: 'uppercase',
                                                            }}
                                                        >
                                                            Vertical
                                                        </div>
                                                    </div>

                                                    <div style={{ textAlign: 'center', minWidth: '60px' }}>
                                                        <div
                                                            style={{
                                                                fontSize: 'var(--text-xl)',
                                                                fontFamily: 'var(--font-mono)',
                                                                fontWeight: 700,
                                                                color: session.horizontalNoise <= 0.20
                                                                    ? 'var(--color-success)'
                                                                    : 'var(--color-error)',
                                                            }}
                                                        >
                                                            {session.horizontalNoise.toFixed(2)}°
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontSize: '10px',
                                                                color: 'var(--color-text-muted)',
                                                                textTransform: 'uppercase',
                                                            }}
                                                        >
                                                            Ruido
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

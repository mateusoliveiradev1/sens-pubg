import type { Metadata } from 'next';
import Link from 'next/link';

import { getHistorySessions, getPrecisionHistoryLines } from '@/actions/history';
import { getWeapon, SCOPE_LIST } from '@/game/pubg';
import type { ProfileType, SensitivityAcceptanceFeedback } from '@/types/engine';
import { EvidenceChip, type EvidenceTone } from '@/ui/components/evidence-chip';
import { Header } from '@/ui/components/header';
import { LoopRail, type LoopStageKey } from '@/ui/components/loop-rail';
import { MetricTile } from '@/ui/components/metric-tile';
import { PageCommandHeader } from '@/ui/components/page-command-header';
import { ProLockPreview } from '@/ui/components/pro-lock-preview';
import { WeaponIcon } from '@/ui/components/weapon-icon';

export const metadata: Metadata = {
    title: 'Historico de Analises',
    description: 'Acompanhe sua evolucao ao longo do tempo com o historico completo de analises.',
};

type HistorySession = Awaited<ReturnType<typeof getHistorySessions>>[number];
type PrecisionLine = Awaited<ReturnType<typeof getPrecisionHistoryLines>>[number];
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

const COACH_OUTCOME_META = {
    pending: {
        color: 'var(--color-warning)',
        background: 'rgba(255, 193, 7, 0.1)',
        border: 'rgba(255, 193, 7, 0.24)',
    },
    started: {
        color: '#74d7ff',
        background: 'rgba(116, 215, 255, 0.12)',
        border: 'rgba(116, 215, 255, 0.22)',
    },
    completed: {
        color: 'var(--color-warning)',
        background: 'rgba(255, 193, 7, 0.1)',
        border: 'rgba(255, 193, 7, 0.24)',
    },
    improved: {
        color: 'var(--color-success)',
        background: 'rgba(34, 197, 94, 0.12)',
        border: 'rgba(34, 197, 94, 0.22)',
    },
    unchanged: {
        color: '#74d7ff',
        background: 'rgba(116, 215, 255, 0.12)',
        border: 'rgba(116, 215, 255, 0.22)',
    },
    worse: {
        color: 'var(--color-error)',
        background: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.22)',
    },
    invalid_capture: {
        color: 'var(--color-warning)',
        background: 'rgba(255, 193, 7, 0.1)',
        border: 'rgba(255, 193, 7, 0.24)',
    },
    conflict: {
        color: 'var(--color-error)',
        background: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.22)',
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

function getCoachOutcomeMeta(status: HistorySession['coachOutcomeStatus'] | undefined) {
    return status ? COACH_OUTCOME_META[status.status] : null;
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

function formatVariableInTest(variable: PrecisionLine['variableInTest']): string {
    switch (variable) {
        case 'sensitivity':
            return 'sensibilidade';
        case 'vertical_control':
            return 'controle vertical';
        case 'horizontal_noise':
            return 'ruido horizontal';
        case 'consistency':
            return 'consistencia';
        case 'capture_quality':
            return 'qualidade da captura';
        case 'loadout':
            return 'loadout';
        case 'validation':
            return 'validacao';
    }
}

function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
}

function resolveHistoryEvidenceTone(summary: HistorySession['evidenceSummary'] | undefined): EvidenceTone {
    if (!summary) {
        return 'warning';
    }

    if (!summary.usableForAnalysis || summary.actionState === 'capture_again' || summary.actionState === 'inconclusive') {
        return 'warning';
    }

    if (summary.confidence >= 0.8 && summary.coverage >= 0.8) {
        return 'success';
    }

    return 'info';
}

function resolveMetricTone(value: number): EvidenceTone {
    if (value >= 70) {
        return 'success';
    }

    if (value >= 40) {
        return 'info';
    }

    return 'warning';
}

function resolveHistoryLoopStage(input: {
    readonly hasSessions: boolean;
    readonly selectedLine: PrecisionLine | null;
}): LoopStageKey {
    if (!input.hasSessions) {
        return 'clip';
    }

    if (!input.selectedLine) {
        return 'evidence';
    }

    switch (input.selectedLine.status) {
        case 'baseline_created':
        case 'initial_signal':
        case 'in_validation':
        case 'not_comparable':
            return 'validation';
        case 'validated_progress':
        case 'validated_regression':
        case 'oscillation':
        case 'consolidated':
            return 'checkpoint';
    }
}

function findSessionPrecisionContext(
    sessionId: string,
    precisionLines: readonly PrecisionLine[],
): {
    readonly line: PrecisionLine | null;
    readonly checkpoint: PrecisionLine['checkpoints'][number] | null;
} {
    for (const line of precisionLines) {
        const checkpoint = line.checkpoints.find((candidate) => candidate.analysisSessionId === sessionId) ?? null;

        if (checkpoint || line.currentSessionId === sessionId || line.baselineSessionId === sessionId) {
            return { line, checkpoint };
        }
    }

    return { line: null, checkpoint: null };
}

export default async function HistoryPage({
    searchParams,
}: {
    readonly searchParams?: Promise<{ readonly line?: string }>;
}) {
    const [sessions, precisionLines] = await Promise.all([
        getHistorySessions(),
        getPrecisionHistoryLines(),
    ]);
    const resolvedSearchParams = await searchParams;
    const selectedLine = precisionLines.find((line) => line.id === resolvedSearchParams?.line)
        ?? precisionLines[0]
        ?? null;
    const sortedSessions = sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const fieldTrendSummaries = buildFieldTrendSummaries(sortedSessions).slice(0, 6);
    const latestSession = sortedSessions[0] ?? null;
    const latestEvidence = latestSession?.evidenceSummary;
    const latestEvidenceTone = resolveHistoryEvidenceTone(latestEvidence);
    const historyProjection = latestSession?.premiumProjection ?? null;
    const historyDepthLock = historyProjection?.locks.find((lock) => lock.featureKey === 'history.full') ?? null;
    const historyPrimaryAction = latestSession
        ? { label: 'Abrir ultima auditoria', href: `/history/${latestSession.id}` }
        : { label: 'Salvar analise util', href: '/analyze' };
    const historyLoopStage = resolveHistoryLoopStage({
        hasSessions: sortedSessions.length > 0,
        selectedLine,
    });
    const historyLoopBlocked = sortedSessions.length === 0
        || selectedLine?.status === 'not_comparable'
        || (latestEvidence ? latestEvidence.blockerReasons.length > 0 : false);
    const historyEvidenceLabel = latestEvidence
        ? `${formatPercent(latestEvidence.confidence)} confianca / ${formatPercent(latestEvidence.coverage)} cobertura`
        : selectedLine
            ? selectedLine.statusLabel
            : 'Sem evidencia recente';

    return (
        <>
            <Header />
            <div className="page animate-fade-in">
                <div className="container" style={{ maxWidth: '980px', margin: '0 auto' }}>
                    <PageCommandHeader
                        body="Revise sessoes salvas como uma timeline de evidencia: veredito, confianca, cobertura, outcomes, checkpoints e bloqueadores continuam visiveis antes de qualquer leitura de evolucao."
                        evidenceItems={[
                            { label: 'Sessoes', value: String(sortedSessions.length), tone: sortedSessions.length > 0 ? 'success' : 'warning' },
                            { label: 'Linhas', value: String(precisionLines.length), tone: precisionLines.length > 0 ? 'info' : 'warning' },
                            { label: 'Evidencia recente', value: latestEvidence ? latestEvidence.verdictLabel : 'Sem leitura', tone: latestEvidenceTone },
                            { label: 'Historia Pro', value: historyProjection?.canSeeFullHistory ? 'Profunda' : 'Preview', tone: historyProjection?.canSeeFullHistory ? 'success' : 'pro' },
                        ]}
                        primaryAction={historyPrimaryAction}
                        roleLabel="Timeline de auditoria"
                        title="Historico de Analises"
                    />
                    <div style={{ margin: 'var(--space-lg) 0 var(--space-2xl)' }}>
                        <LoopRail
                            blocked={historyLoopBlocked}
                            currentStage={historyLoopStage}
                            evidenceLabel={historyEvidenceLabel}
                            nextActionLabel={historyPrimaryAction.label}
                        />
                    </div>

                    {sortedSessions.length === 0 ? (
                        <div
                            className="glass-card"
                            style={{
                                padding: 'var(--space-xl)',
                                display: 'grid',
                                gap: 'var(--space-lg)',
                            }}
                        >
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-lg)' }}>📊</div>
                            <h2 style={{ margin: '0 0 var(--space-sm)' }}>Nenhuma analise salva ainda</h2>
                            <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
                                Salve uma analise util depois do primeiro clip usavel para abrir historico, checkpoints e auditoria do coach.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 'var(--space-md)' }}>
                                <MetricTile
                                    helper="Sem sessoes salvas."
                                    label="Historico"
                                    tone="warning"
                                    value="0"
                                />
                                <MetricTile
                                    helper="A linha de evolucao aparece depois de clips compativeis."
                                    label="Checkpoints"
                                    tone="warning"
                                    value="Aguardando"
                                />
                            </div>
                            <Link href="/analyze" className="btn btn-primary btn-lg" style={{ width: 'fit-content' }}>
                                Salvar analise util
                            </Link>
                        </div>
                    ) : (
                        <>
                            {precisionLines.length > 0 ? (
                                <section
                                    className="glass-card"
                                    style={{
                                        padding: 'var(--space-xl)',
                                        marginBottom: 'var(--space-xl)',
                                        background: 'linear-gradient(145deg, rgba(10, 16, 24, 0.96), rgba(8, 8, 12, 0.92))',
                                        border: '1px solid rgba(255, 193, 7, 0.16)',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            justifyContent: 'space-between',
                                            gap: 'var(--space-lg)',
                                            marginBottom: 'var(--space-lg)',
                                        }}
                                    >
                                        <div style={{ maxWidth: '560px' }}>
                                            <p
                                                style={{
                                                    margin: '0 0 var(--space-xs) 0',
                                                    fontSize: '11px',
                                                    letterSpacing: '0.18em',
                                                    textTransform: 'uppercase',
                                                    color: '#fbbf24',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                Evolucao de precisao
                                            </p>
                                            <h2 style={{ margin: 0, fontSize: 'var(--text-2xl)', lineHeight: 1.1 }}>
                                                Linhas compativeis e checkpoints
                                            </h2>
                                        </div>
                                        <Link href="/analyze" className="btn btn-primary">
                                            Gravar validacao compativel
                                        </Link>
                                    </div>

                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                            gap: 'var(--space-md)',
                                            marginBottom: selectedLine ? 'var(--space-lg)' : 0,
                                        }}
                                    >
                                        {precisionLines.map((line) => (
                                            <Link
                                                href={`/history?line=${line.id}`}
                                                key={line.id}
                                                style={{ color: 'inherit', textDecoration: 'none' }}
                                            >
                                                <div
                                                    style={{
                                                        height: '100%',
                                                        padding: 'var(--space-lg)',
                                                        borderRadius: 'var(--radius-lg)',
                                                        border: line.id === selectedLine?.id
                                                            ? '1px solid rgba(251, 191, 36, 0.42)'
                                                            : '1px solid rgba(255, 255, 255, 0.08)',
                                                        background: line.id === selectedLine?.id
                                                            ? 'rgba(251, 191, 36, 0.08)'
                                                            : 'rgba(255, 255, 255, 0.02)',
                                                        display: 'grid',
                                                        gap: 'var(--space-sm)',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                        <span className="badge badge-info">{line.statusLabel}</span>
                                                        <span className="badge badge-info">
                                                            variavel em teste: {formatVariableInTest(line.variableInTest)}
                                                        </span>
                                                    </div>
                                                    <h3 style={{ margin: 0, fontSize: 'var(--text-base)', lineHeight: 1.35 }}>
                                                        {line.contextLabel}
                                                    </h3>
                                                    <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                                        {line.validClipCount} clip(s) validos, {line.blockedClipCount} bloqueado(s). Proxima validacao: {line.nextValidation}
                                                    </p>
                                                    {line.blockerReasons.length > 0 ? (
                                                        <div style={{ display: 'grid', gap: '6px' }}>
                                                            {line.blockerReasons.slice(0, 2).map((reason) => (
                                                                <span
                                                                    key={reason}
                                                                    style={{
                                                                        padding: '7px 9px',
                                                                        borderRadius: '8px',
                                                                        border: '1px solid rgba(239, 68, 68, 0.22)',
                                                                        background: 'rgba(239, 68, 68, 0.08)',
                                                                        color: 'var(--color-text-secondary)',
                                                                        fontSize: '12px',
                                                                        lineHeight: 1.45,
                                                                    }}
                                                                >
                                                                    {reason}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>

                                    {selectedLine ? (
                                        <div
                                            style={{
                                                padding: 'var(--space-lg)',
                                                borderRadius: 'var(--radius-lg)',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                background: 'rgba(0, 0, 0, 0.18)',
                                            }}
                                        >
                                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                                                <div>
                                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                                                        Linha selecionada
                                                    </span>
                                                    <h3 style={{ margin: '6px 0 0 0', fontSize: 'var(--text-xl)' }}>
                                                        {selectedLine.latestTrendText}
                                                    </h3>
                                                </div>
                                                <span className="badge badge-info">
                                                    {selectedLine.checkpoints.length} checkpoint(s)
                                                </span>
                                            </div>
                                            <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                                {selectedLine.checkpoints.map((checkpoint) => (
                                                    <Link
                                                        href={checkpoint.analysisSessionId ? `/history/${checkpoint.analysisSessionId}` : '/history'}
                                                        key={checkpoint.id}
                                                        style={{ color: 'inherit', textDecoration: 'none' }}
                                                    >
                                                        <div
                                                            style={{
                                                                padding: 'var(--space-md)',
                                                                borderRadius: '10px',
                                                                border: '1px solid rgba(255, 255, 255, 0.07)',
                                                                background: 'rgba(255, 255, 255, 0.025)',
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                                                                <span className="badge badge-info">{checkpoint.stateLabel}</span>
                                                                <span className="badge badge-info">
                                                                    variavel em teste: {formatVariableInTest(checkpoint.variableInTest)}
                                                                </span>
                                                                <span className="badge badge-info">
                                                                    {checkpoint.createdAt.toLocaleDateString('pt-BR')}
                                                                </span>
                                                            </div>
                                                            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                                                Proxima validacao: {checkpoint.nextValidation}
                                                            </p>
                                                            {checkpoint.blockerReasons.length > 0 ? (
                                                                <p style={{ margin: '6px 0 0 0', color: 'var(--color-error)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                                                    Bloqueio: {checkpoint.blockerReasons.join(' | ')}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </section>
                            ) : null}

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

                            {historyDepthLock ? (
                                <div style={{ marginBottom: 'var(--space-xl)' }}>
                                    <ProLockPreview
                                        currentValueLabel={`Historico recente visivel: ${Math.min(sortedSessions.length, 3)} sessoes com evidencia basica.`}
                                        lock={historyDepthLock}
                                        proValueLabel="Pro amplia continuidade, linhas compativeis completas, checkpoints antigos e auditoria de outcomes sem esconder a verdade recente."
                                    />
                                </div>
                            ) : null}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                {sortedSessions.map((session, index) => {
                                    const scope = SCOPE_LIST.find((candidate) => candidate.id === session.scopeId);
                                    const staticWeapon = getWeapon(session.weaponId) ?? (session.weaponName ? getWeapon(session.weaponName) : undefined);
                                    const weaponName = session.weaponName ?? staticWeapon?.name ?? session.weaponId;
                                    const category = session.weaponCategory ?? staticWeapon?.category;
                                    const acceptanceMeta = getAcceptanceMeta(session.acceptanceFeedback);
                                    const coachOutcomeMeta = getCoachOutcomeMeta(session.coachOutcomeStatus);
                                    const recommendedProfile = isProfileType(session.recommendedProfile)
                                        ? PROFILE_LABELS[session.recommendedProfile]
                                        : undefined;
                                    const evidenceSummary = session.evidenceSummary;
                                    const evidenceTone = resolveHistoryEvidenceTone(evidenceSummary);
                                    const precisionContext = findSessionPrecisionContext(session.id, precisionLines);
                                    const sessionActionLabel = session.coachOutcomeStatus
                                        ? 'Ver auditoria do coach'
                                        : 'Abrir auditoria';

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
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                                                    gap: 'var(--space-lg)',
                                                    alignItems: 'center',
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
                                                        showStatus
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

                                                            {session.coachOutcomeStatus && coachOutcomeMeta ? (
                                                                <span
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        padding: '6px 10px',
                                                                        borderRadius: '999px',
                                                                        border: `1px solid ${coachOutcomeMeta.border}`,
                                                                        background: coachOutcomeMeta.background,
                                                                        color: coachOutcomeMeta.color,
                                                                        fontSize: '11px',
                                                                        fontWeight: 700,
                                                                        letterSpacing: '0.04em',
                                                                        textTransform: 'uppercase',
                                                                    }}
                                                                >
                                                                    Coach: {session.coachOutcomeStatus.label}
                                                                    {session.coachOutcomeStatus.revisionCount > 0
                                                                        ? ` (${session.coachOutcomeStatus.revisionCount} rev.)`
                                                                        : ''}
                                                                </span>
                                                            ) : null}

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
                                                        <p style={{ margin: '6px 0 0 0', color: 'var(--color-accent-cyan)', fontSize: '12px', fontWeight: 700 }}>
                                                            {sessionActionLabel}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }} aria-label="Evidencia e checkpoint da sessao">
                                                        <EvidenceChip
                                                            label="Veredito"
                                                            tone={evidenceTone}
                                                            value={evidenceSummary?.verdictLabel ?? 'Sem mastery'}
                                                        />
                                                        <EvidenceChip
                                                            label="Confianca"
                                                            tone={evidenceTone}
                                                            value={evidenceSummary ? formatPercent(evidenceSummary.confidence) : 'Aguardando'}
                                                        />
                                                        <EvidenceChip
                                                            label="Cobertura"
                                                            tone={evidenceTone}
                                                            value={evidenceSummary ? formatPercent(evidenceSummary.coverage) : 'Aguardando'}
                                                        />
                                                        <EvidenceChip
                                                            label="Bloqueadores"
                                                            tone={(evidenceSummary?.blockerReasons.length ?? 0) > 0 ? 'warning' : 'success'}
                                                            value={String(evidenceSummary?.blockerReasons.length ?? 0)}
                                                        />
                                                        <EvidenceChip
                                                            label="Linha"
                                                            tone={precisionContext.line ? 'info' : 'warning'}
                                                            value={precisionContext.line?.statusLabel ?? 'Sem linha ativa'}
                                                        />
                                                        <EvidenceChip
                                                            label="Checkpoint"
                                                            tone={precisionContext.checkpoint ? 'info' : 'warning'}
                                                            value={precisionContext.checkpoint?.stateLabel ?? 'Nao vinculado'}
                                                        />
                                                        <EvidenceChip
                                                            label="Outcome"
                                                            tone={session.coachOutcomeStatus?.status === 'conflict' ? 'warning' : session.coachOutcomeStatus ? 'info' : 'warning'}
                                                            value={session.coachOutcomeStatus?.label ?? 'Pendente'}
                                                        />
                                                    </div>
                                                    {evidenceSummary?.blockerReasons.length ? (
                                                        <div style={{ display: 'grid', gap: '6px' }} aria-label="Bloqueadores visiveis">
                                                            {evidenceSummary.blockerReasons.slice(0, 2).map((reason) => (
                                                                <span
                                                                    key={reason}
                                                                    style={{
                                                                        padding: '7px 9px',
                                                                        borderRadius: '8px',
                                                                        border: '1px solid rgba(255, 193, 7, 0.24)',
                                                                        background: 'rgba(255, 193, 7, 0.08)',
                                                                        color: 'var(--color-text-secondary)',
                                                                        fontSize: '12px',
                                                                        lineHeight: 1.45,
                                                                    }}
                                                                >
                                                                    {reason}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <div
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))',
                                                        gap: 'var(--space-sm)',
                                                    }}
                                                >
                                                    <MetricTile
                                                        helper="score salvo"
                                                        label="Estabilidade"
                                                        tone={resolveMetricTone(session.stabilityScore)}
                                                        value={String(Math.round(session.stabilityScore))}
                                                    />

                                                    <MetricTile
                                                        helper="controle vertical"
                                                        label="Vertical"
                                                        tone={Math.abs(session.verticalControl - 1) < 0.15 ? 'success' : 'warning'}
                                                        value={`${session.verticalControl.toFixed(2)}x`}
                                                    />

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

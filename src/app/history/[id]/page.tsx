import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { analysisSessions, precisionCheckpoints, precisionEvolutionLines, weaponProfiles } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import Link from 'next/link';
import { SCOPE_LIST } from '@/game/pubg';
import { formatAnalysisDistancePresentation } from '@/app/analyze/analysis-distance-presentation';
import { ResultsDashboard } from '@/app/analyze/results-dashboard';
import { formatPrecisionTrendLabel } from '@/core/precision-loop';
import { hydrateAnalysisResultFromHistory } from '../analysis-result-hydration';
import { PublishAnalysisButton } from './publish-analysis-button';
import { SensitivityAcceptancePanel } from './sensitivity-acceptance-panel';
import type {
    CoachDecisionTier,
    PrecisionCheckpointState,
    PrecisionCompatibilityKey,
    PrecisionTrendSummary,
    PrecisionVariableInTest,
} from '@/types/engine';

interface Props {
    params: Promise<{ id: string }>;
}

const HISTORY_COACH_TIER_LABELS: Record<CoachDecisionTier, string> = {
    capture_again: 'Capturar novamente',
    test_protocol: 'Testar protocolo',
    stabilize_block: 'Estabilizar bloco',
    apply_protocol: 'Aplicar protocolo',
};

function precisionCheckpointStateLabel(state: PrecisionCheckpointState): string {
    switch (state) {
        case 'baseline_created':
            return 'Baseline criado';
        case 'initial_signal':
            return 'Sinal inicial';
        case 'in_validation':
            return 'Em validacao';
        case 'validated_progress':
            return 'Progresso validado';
        case 'validated_regression':
            return 'Regressao validada';
        case 'oscillation':
            return 'Oscilacao';
        case 'consolidated':
            return 'Consolidado';
        case 'not_comparable':
            return 'Nao comparavel';
    }
}

function precisionVariableLabel(variable: PrecisionVariableInTest): string {
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

function precisionBlockerReasons(trend: PrecisionTrendSummary | null): readonly string[] {
    if (!trend) {
        return [];
    }

    return Array.from(new Set([
        ...trend.blockerSummaries.map((summary) => summary.message),
        ...trend.blockedClips.flatMap((clip) => clip.blockers.map((blocker) => blocker.message)),
    ].filter((message) => message.trim().length > 0)));
}

function precisionLineContextLabel(compatibilityKey: string | null | undefined): string | null {
    if (!compatibilityKey || compatibilityKey.startsWith('blocked:')) {
        return null;
    }

    try {
        const key = JSON.parse(compatibilityKey) as Partial<PrecisionCompatibilityKey>;
        const loadout = [
            key.stance,
            key.muzzle,
            key.grip,
            key.stock,
        ].filter(Boolean).join('/');

        return [
            key.weaponId,
            key.scopeId,
            key.patchVersion ? `patch ${key.patchVersion}` : null,
            typeof key.distanceMeters === 'number' ? `${key.distanceMeters}m` : null,
            loadout || null,
        ].filter(Boolean).join(' | ') || null;
    } catch {
        return null;
    }
}

export default async function HistoryDetailRoute({ params }: Props) {
    const session = await auth();
    if (!session?.user?.id) {
        redirect('/login?callbackUrl=/history');
    }

    const { id } = await params;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        notFound();
    }

    const [record] = await db
        .select({
            id: analysisSessions.id,
            weaponId: analysisSessions.weaponId,
            scopeId: analysisSessions.scopeId,
            patchVersion: analysisSessions.patchVersion,
            distance: analysisSessions.distance,
            createdAt: analysisSessions.createdAt,
            fullResult: analysisSessions.fullResult,
            weaponName: weaponProfiles.name,
        })
        .from(analysisSessions)
        .leftJoin(
            weaponProfiles,
            sql`CASE WHEN ${analysisSessions.weaponId} ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ${analysisSessions.weaponId}::uuid ELSE NULL END = ${weaponProfiles.id}`
        )
        .where(
            and(
                eq(analysisSessions.id, id),
                eq(analysisSessions.userId, session.user.id)
            )
        )
        .limit(1);

    if (!record) {
        notFound();
    }

    const [precisionCheckpoint] = await db
        .select({
            id: precisionCheckpoints.id,
            lineId: precisionCheckpoints.lineId,
            state: precisionCheckpoints.state,
            variableInTest: precisionCheckpoints.variableInTest,
            payload: precisionCheckpoints.payload,
            createdAt: precisionCheckpoints.createdAt,
            lineCompatibilityKey: precisionEvolutionLines.compatibilityKey,
            lineStatus: precisionEvolutionLines.status,
            lineCurrentSessionId: precisionEvolutionLines.currentSessionId,
        })
        .from(precisionCheckpoints)
        .leftJoin(
            precisionEvolutionLines,
            eq(precisionCheckpoints.lineId, precisionEvolutionLines.id),
        )
        .where(
            and(
                eq(precisionCheckpoints.analysisSessionId, id),
                eq(precisionEvolutionLines.userId, session.user.id),
            ),
        )
        .limit(1);

    const scope = SCOPE_LIST.find((item) => item.id === record.scopeId);
    const fullResult = (record.fullResult ?? {}) as Record<string, unknown>;
    const analysisResult = hydrateAnalysisResultFromHistory({
        fullResult,
        recordPatchVersion: record.patchVersion,
        scopeId: record.scopeId,
        distanceMeters: record.distance,
    });

    if (!analysisResult || !analysisResult.trajectory) {
        return (
            <div className="container center" style={{ marginTop: 'var(--space-3xl)' }}>
                <h2 style={{ color: 'var(--color-error)' }}>Analise Incompleta</h2>
                <p style={{ color: 'var(--color-text-muted)' }}>
                    Esta sessao e antiga e nao possui os dados detalhados salvos na nuvem.
                </p>
                <Link href="/history" className="btn btn-outline" style={{ marginTop: 'var(--space-md)' }}>
                    Voltar
                </Link>
            </div>
        );
    }

    const displayName = record.weaponName || record.weaponId;
    const distancePresentation = formatAnalysisDistancePresentation({
        targetDistanceMeters: analysisResult.analysisContext?.targetDistanceMeters ?? record.distance,
        distanceMode: analysisResult.analysisContext?.distanceMode,
        distanceNote: analysisResult.analysisContext?.distanceNote,
    });
    const checkpointTrend = precisionCheckpoint?.payload.trend ?? analysisResult.precisionTrend ?? null;
    const checkpointBlockers = precisionBlockerReasons(checkpointTrend);
    const checkpointNextValidation = precisionCheckpoint?.payload.nextValidationHint
        ?? checkpointTrend?.nextValidationHint
        ?? 'Gravar validacao compativel mantendo as variaveis fixas.';
    const checkpointLineContext = precisionLineContextLabel(precisionCheckpoint?.lineCompatibilityKey);

    return (
        <>
            <div className="bg-glow bg-glow-primary" style={{ top: '-10%', left: '-10%' }} />

            <div
                className="container"
                style={{ padding: 'calc(var(--header-height) + var(--space-2xl)) var(--space-md) var(--space-3xl)' }}
            >
                <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-md)' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <Link
                                href="/history"
                                className="btn btn-outline"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}
                            >
                                <span>{'<-'}</span> Voltar
                            </Link>
                            <PublishAnalysisButton
                                analysisSessionId={record.id}
                                weaponName={displayName}
                                scopeName={scope?.name || record.scopeId}
                                patchVersion={analysisResult.patchVersion}
                                createdAtIso={record.createdAt.toISOString()}
                            />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h1
                                style={{
                                    margin: 0,
                                    fontSize: 'var(--text-3xl)',
                                    letterSpacing: '-0.02em',
                                    textShadow: '0 0 20px rgba(121, 40, 202, 0.3)',
                                }}
                            >
                                {displayName}
                            </h1>
                            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                                {scope?.name || record.scopeId} | <span title={distancePresentation.note}>{distancePresentation.inlineLabel}</span> | Patch {analysisResult.patchVersion} |{' '}
                                {new Date(record.createdAt).toLocaleString('pt-BR')}
                            </p>
                        </div>
                    </div>

                    {analysisResult.coachPlan ? (
                        <section
                            className="glass-card"
                            style={{
                                padding: 'var(--space-lg)',
                                border: '1px solid rgba(116, 215, 255, 0.18)',
                                background: 'linear-gradient(145deg, rgba(10, 16, 24, 0.96), rgba(8, 8, 12, 0.92))',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'space-between',
                                    gap: 'var(--space-lg)',
                                    alignItems: 'flex-start',
                                }}
                            >
                                <div style={{ maxWidth: 520 }}>
                                    <p
                                        style={{
                                            margin: '0 0 var(--space-xs) 0',
                                            fontSize: '11px',
                                            letterSpacing: '0.18em',
                                            textTransform: 'uppercase',
                                            color: '#74d7ff',
                                            fontWeight: 700,
                                        }}
                                    >
                                        Coach da sessao salva
                                    </p>
                                    <h2 style={{ margin: 0, fontSize: 'var(--text-2xl)', lineHeight: 1.15 }}>
                                        {analysisResult.coachPlan.primaryFocus.title}
                                    </h2>
                                    <p style={{ margin: 'var(--space-sm) 0 0 0', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                                        {analysisResult.coachPlan.sessionSummary}
                                    </p>
                                </div>

                                <div style={{ display: 'grid', gap: '8px', minWidth: 220 }}>
                                    <span className="badge badge-info">
                                        {HISTORY_COACH_TIER_LABELS[analysisResult.coachPlan.tier]}
                                    </span>
                                    <div>
                                        <span
                                            style={{
                                                display: 'block',
                                                marginBottom: '4px',
                                                color: 'var(--color-text-muted)',
                                                fontSize: '11px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.12em',
                                            }}
                                        >
                                            Proximo bloco
                                        </span>
                                        <strong style={{ color: 'var(--color-text)' }}>
                                            {analysisResult.coachPlan.nextBlock.title}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        </section>
                    ) : null}

                    {precisionCheckpoint || checkpointTrend ? (
                        <section
                            className="glass-card"
                            style={{
                                padding: 'var(--space-lg)',
                                border: '1px solid rgba(251, 191, 36, 0.2)',
                                background: 'linear-gradient(145deg, rgba(18, 12, 4, 0.72), rgba(8, 8, 12, 0.92))',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'space-between',
                                    gap: 'var(--space-lg)',
                                    alignItems: 'flex-start',
                                }}
                            >
                                <div style={{ maxWidth: 540 }}>
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
                                        Checkpoint de precisao
                                    </p>
                                    <h2 style={{ margin: 0, fontSize: 'var(--text-2xl)', lineHeight: 1.15 }}>
                                        {precisionCheckpoint
                                            ? precisionCheckpointStateLabel(precisionCheckpoint.state)
                                            : checkpointTrend
                                                ? formatPrecisionTrendLabel(checkpointTrend.label)
                                                : 'Trend salvo'}
                                    </h2>
                                    {checkpointLineContext ? (
                                        <p style={{ margin: 'var(--space-xs) 0 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
                                            Linha: {checkpointLineContext}
                                        </p>
                                    ) : null}
                                    <p style={{ margin: 'var(--space-sm) 0 0 0', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                                        Esta sessao {precisionCheckpoint?.lineCurrentSessionId === record.id ? 'atualizou' : 'registrou'} a linha de precisao. Proxima validacao: {checkpointNextValidation}
                                    </p>
                                </div>

                                <div style={{ display: 'grid', gap: '8px', minWidth: 220 }}>
                                    {precisionCheckpoint ? (
                                        <span className="badge badge-info">
                                            variavel em teste: {precisionVariableLabel(precisionCheckpoint.variableInTest)}
                                        </span>
                                    ) : null}
                                    {checkpointTrend ? (
                                        <>
                                            <span className="badge badge-info">
                                                {checkpointTrend.compatibleCount} clip(s) compativel(is)
                                            </span>
                                            <span className="badge badge-info">
                                                Cobertura {Math.round(checkpointTrend.coverage * 100)}% | Confianca {Math.round(checkpointTrend.confidence * 100)}%
                                            </span>
                                        </>
                                    ) : null}
                                </div>
                            </div>

                            {checkpointBlockers.length > 0 ? (
                                <div style={{ display: 'grid', gap: '8px', marginTop: 'var(--space-md)' }}>
                                    {checkpointBlockers.map((reason) => (
                                        <p
                                            key={reason}
                                            style={{
                                                margin: 0,
                                                padding: '8px 10px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(239, 68, 68, 0.24)',
                                                background: 'rgba(239, 68, 68, 0.08)',
                                                color: 'var(--color-text-secondary)',
                                                fontSize: 'var(--text-sm)',
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            Bloqueio: {reason}
                                        </p>
                                    ))}
                                </div>
                            ) : null}

                            {precisionCheckpoint ? (
                                <Link
                                    href={`/history?line=${precisionCheckpoint.lineId}`}
                                    className="btn btn-outline"
                                    style={{ marginTop: 'var(--space-md)' }}
                                >
                                    Abrir auditoria da linha
                                </Link>
                            ) : null}
                        </section>
                    ) : null}

                    <SensitivityAcceptancePanel
                        sessionId={record.id}
                        sensitivity={analysisResult.sensitivity}
                    />
                    <ResultsDashboard result={analysisResult} />
                </div>
            </div>
        </>
    );
}

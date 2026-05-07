import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { analysisSessions, precisionCheckpoints, precisionEvolutionLines, weaponProfiles } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import Link from 'next/link';
import { SCOPE_LIST } from '@/game/pubg';
import { formatAnalysisDistancePresentation } from '@/app/analyze/analysis-distance-presentation';
import { ResultsDashboard } from '@/app/analyze/results-dashboard';
import { getCoachProtocolOutcomesForSession } from '@/actions/history';
import { formatPrecisionTrendLabel } from '@/core/precision-loop';
import { EvidenceChip, type EvidenceTone } from '@/ui/components/evidence-chip';
import { Header } from '@/ui/components/header';
import { LoopRail, type LoopStageKey } from '@/ui/components/loop-rail';
import { MetricTile } from '@/ui/components/metric-tile';
import { PageCommandHeader } from '@/ui/components/page-command-header';
import { hydrateAnalysisResultFromHistory } from '../analysis-result-hydration';
import { CoachProtocolOutcomePanel } from './coach-protocol-outcome-panel';
import { PublishAnalysisButton } from './publish-analysis-button';
import { SensitivityAcceptancePanel } from './sensitivity-acceptance-panel';
import type {
    AnalysisResult,
    CoachDecisionTier,
    CoachProtocolOutcome,
    CoachProtocolOutcomeSnapshot,
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

const HISTORY_OUTCOME_REASON_LABELS = {
    capture_quality: 'Qualidade da captura',
    incompatible_context: 'Contexto incompativel',
    poor_execution: 'Execucao ruim',
    variable_changed: 'Variavel alterada',
    confusing_protocol: 'Protocolo confuso',
    fatigue_or_pain: 'Dor/fadiga',
    other: 'Outro motivo',
} as const;

function historyOutcomeStatusLabel(status: CoachProtocolOutcome['status']): string {
    switch (status) {
        case 'started':
            return 'Comecei o bloco';
        case 'completed':
            return 'Completei sem medir';
        case 'improved':
            return 'Melhorou no treino';
        case 'unchanged':
            return 'Ficou igual';
        case 'worse':
            return 'Piorou no treino';
        case 'invalid_capture':
            return 'Captura invalida';
    }
}

function buildHistoryCoachOutcomeSnapshot(
    outcomes: readonly CoachProtocolOutcome[],
): CoachProtocolOutcomeSnapshot {
    const latest = outcomes[outcomes.length - 1] ?? null;

    return {
        latest,
        revisions: outcomes,
        pending: latest?.status === 'started' || latest?.status === 'completed',
        validationCta: 'Gravar validacao compativel',
        conflicts: outcomes.flatMap((outcome) => outcome.conflict ? [outcome.conflict] : []),
    };
}

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

function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
}

function resolveDetailEvidenceTone(result: AnalysisResult): EvidenceTone {
    const mastery = result.mastery;

    if (!mastery || !mastery.evidence.usableForAnalysis || mastery.actionState === 'capture_again' || mastery.actionState === 'inconclusive') {
        return 'warning';
    }

    if (mastery.evidence.confidence >= 0.8 && mastery.evidence.coverage >= 0.8) {
        return 'success';
    }

    return 'info';
}

function resolveDetailLoopStage(input: {
    readonly hasCoachPlan: boolean;
    readonly hasOutcome: boolean;
    readonly hasCheckpoint: boolean;
    readonly actionState: NonNullable<AnalysisResult['mastery']>['actionState'] | undefined;
}): LoopStageKey {
    if (input.actionState === 'capture_again') {
        return 'clip';
    }

    if (input.actionState === 'inconclusive') {
        return 'validation';
    }

    if (input.hasOutcome || input.hasCheckpoint) {
        return 'checkpoint';
    }

    if (input.hasCoachPlan) {
        return 'outcome';
    }

    return 'evidence';
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
            <>
                <Header />
                <div className="container center" style={{ marginTop: 'calc(var(--header-height) + var(--space-3xl))' }}>
                    <h2 style={{ color: 'var(--color-error)' }}>Analise Incompleta</h2>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        Esta sessao e antiga e nao possui os dados detalhados salvos na nuvem.
                    </p>
                    <Link href="/history" className="btn btn-outline" style={{ marginTop: 'var(--space-md)' }}>
                        Voltar para o historico
                    </Link>
                </div>
            </>
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
    const coachProtocolOutcomes = analysisResult.coachPlan
        ? await getCoachProtocolOutcomesForSession(record.id)
        : [];
    const analysisResultForDisplay: AnalysisResult = {
        ...analysisResult,
        historySessionId: record.id,
        ...(analysisResult.coachPlan ? {
            coachOutcomeSnapshot: buildHistoryCoachOutcomeSnapshot(coachProtocolOutcomes),
        } : {}),
    };
    const detailEvidenceTone = resolveDetailEvidenceTone(analysisResultForDisplay);
    const detailBlockerCount = (analysisResultForDisplay.mastery?.blockedRecommendations.length ?? 0)
        + checkpointBlockers.length
        + (analysisResultForDisplay.coachDecisionSnapshot?.blockerReasons.length ?? 0);
    const detailPrimaryAction = analysisResultForDisplay.coachPlan
        ? {
            label: coachProtocolOutcomes.length > 0 ? 'Gravar validacao compativel' : 'Registrar resultado do bloco',
            href: coachProtocolOutcomes.length > 0 ? '/analyze' : '#coach-outcome-panel',
        }
        : {
            label: 'Registrar resultado de campo',
            href: '#sensitivity-feedback',
        };
    const detailLoopStage = resolveDetailLoopStage({
        hasCoachPlan: Boolean(analysisResultForDisplay.coachPlan),
        hasOutcome: coachProtocolOutcomes.length > 0,
        hasCheckpoint: Boolean(precisionCheckpoint || checkpointTrend),
        actionState: analysisResultForDisplay.mastery?.actionState,
    });
    const detailEvidenceLabel = analysisResultForDisplay.mastery
        ? `${formatPercent(analysisResultForDisplay.mastery.evidence.confidence)} confianca / ${formatPercent(analysisResultForDisplay.mastery.evidence.coverage)} cobertura`
        : 'Sem mastery salvo';

    return (
        <>
            <Header />
            <div className="bg-glow bg-glow-primary" style={{ top: '-10%', left: '-10%' }} />

            <div
                className="container"
                style={{
                    overflowX: 'hidden',
                    padding: 'calc(var(--header-height) + var(--space-xl)) var(--space-md) var(--space-3xl)',
                }}
            >
                <div
                    style={{
                        width: '100%',
                        maxWidth: 1040,
                        minWidth: 0,
                        margin: '0 auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-xl)',
                    }}
                >
                    <nav
                        aria-label="Navegacao da analise"
                        className="glass-card"
                        style={{
                            minWidth: 0,
                            padding: 'var(--space-md)',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 'var(--space-md)',
                        }}
                    >
                        <Link
                            href="/history"
                            className="btn btn-secondary"
                            style={{ flex: '0 1 auto', minWidth: 0 }}
                        >
                            <span aria-hidden="true">{'<-'}</span>
                            Historico
                        </Link>
                        <PublishAnalysisButton
                            analysisSessionId={record.id}
                            weaponName={displayName}
                            scopeName={scope?.name || record.scopeId}
                            patchVersion={analysisResult.patchVersion}
                            createdAtIso={record.createdAt.toISOString()}
                        />
                    </nav>
                    <PageCommandHeader
                        body="Resultado completo do clip salvo, com evidencia, coach, outcome, revisoes, checkpoint de precisao e bloqueadores preservados antes de qualquer proxima acao."
                        evidenceItems={[
                            { label: 'Veredito', value: analysisResultForDisplay.mastery?.actionLabel ?? 'Sem mastery', tone: detailEvidenceTone },
                            { label: 'Confianca', value: analysisResultForDisplay.mastery ? formatPercent(analysisResultForDisplay.mastery.evidence.confidence) : 'Aguardando', tone: detailEvidenceTone },
                            { label: 'Cobertura', value: analysisResultForDisplay.mastery ? formatPercent(analysisResultForDisplay.mastery.evidence.coverage) : 'Aguardando', tone: detailEvidenceTone },
                            { label: 'Bloqueadores', value: String(detailBlockerCount), tone: detailBlockerCount > 0 ? 'warning' : 'success' },
                        ]}
                        primaryAction={detailPrimaryAction}
                        roleLabel="Analise salva"
                        title={displayName}
                    />
                    <LoopRail
                        blocked={detailBlockerCount > 0 || analysisResultForDisplay.mastery?.actionState === 'capture_again' || analysisResultForDisplay.mastery?.actionState === 'inconclusive'}
                        currentStage={detailLoopStage}
                        evidenceLabel={detailEvidenceLabel}
                        nextActionLabel={detailPrimaryAction.label}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 'var(--space-md)' }}>
                        <MetricTile
                            helper="score acionavel salvo"
                            label="Acao"
                            tone={detailEvidenceTone}
                            value={analysisResultForDisplay.mastery ? String(Math.round(analysisResultForDisplay.mastery.actionableScore)) : 'n/a'}
                        />
                        <MetricTile
                            helper="mecanica salva"
                            label="Mecanica"
                            tone="info"
                            value={analysisResultForDisplay.mastery ? String(Math.round(analysisResultForDisplay.mastery.mechanicalScore)) : 'n/a'}
                        />
                        <MetricTile
                            helper="bloqueadores auditaveis"
                            label="Bloqueios"
                            tone={detailBlockerCount > 0 ? 'warning' : 'success'}
                            value={String(detailBlockerCount)}
                        />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minWidth: 0 }} aria-label="Contexto salvo da auditoria">
                        <EvidenceChip label="Patch" tone="info" value={analysisResult.patchVersion} />
                        <EvidenceChip label="Mira" tone="info" value={scope?.name || record.scopeId} />
                        <EvidenceChip label="Distancia" tone="info" value={distancePresentation.inlineLabel} />
                        <EvidenceChip label="Data" tone="info" value={new Date(record.createdAt).toLocaleString('pt-BR')} />
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
                                <div style={{ maxWidth: 520, minWidth: 0 }}>
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

                                <div style={{ display: 'grid', gap: '8px', minWidth: 'min(100%, 220px)' }}>
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

                    {analysisResultForDisplay.coachPlan ? (
                        <section
                            className="glass-card"
                            style={{
                                padding: 'var(--space-lg)',
                                border: '1px solid rgba(255, 107, 0, 0.2)',
                                background: 'linear-gradient(145deg, rgba(28, 12, 2, 0.72), rgba(8, 8, 12, 0.92))',
                            }}
                        >
                            <div style={{ display: 'grid', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: '11px',
                                        letterSpacing: '0.18em',
                                        textTransform: 'uppercase',
                                        color: 'var(--color-accent-primary)',
                                        fontWeight: 700,
                                    }}
                                >
                                    Ver auditoria do coach
                                </p>
                                <h2 style={{ margin: 0, fontSize: 'var(--text-2xl)', lineHeight: 1.15 }}>
                                    Auditoria do coach
                                </h2>
                                <p style={{ margin: 0, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                                    Snapshot deterministico, outcomes, revisoes, conflitos, clips compativeis e memoria usada nesta decisao.
                                </p>
                            </div>

                            {analysisResultForDisplay.coachDecisionSnapshot ? (
                                <div style={{ display: 'grid', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        <span className="badge badge-info">
                                            {HISTORY_COACH_TIER_LABELS[analysisResultForDisplay.coachDecisionSnapshot.tier]}
                                        </span>
                                        <span className="badge badge-info">
                                            Foco: {analysisResultForDisplay.coachDecisionSnapshot.primaryFocusTitle}
                                        </span>
                                        <span className={analysisResultForDisplay.coachDecisionSnapshot.outcomeEvidenceState === 'conflict' ? 'badge badge-warning' : 'badge badge-info'}>
                                            Outcome: {analysisResultForDisplay.coachDecisionSnapshot.outcomeEvidenceState}
                                        </span>
                                        {analysisResultForDisplay.precisionTrend ? (
                                            <span className="badge badge-info">
                                                Clips compativeis: {analysisResultForDisplay.precisionTrend.compatibleCount}
                                            </span>
                                        ) : null}
                                    </div>
                                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                        Memoria: {analysisResultForDisplay.coachDecisionSnapshot.memorySummary}
                                    </p>
                                    {analysisResultForDisplay.coachDecisionSnapshot.blockerReasons.length > 0 ? (
                                        <div style={{ display: 'grid', gap: '6px' }}>
                                            {analysisResultForDisplay.coachDecisionSnapshot.blockerReasons.slice(0, 5).map((reason) => (
                                                <span
                                                    key={reason}
                                                    style={{
                                                        padding: '7px 9px',
                                                        borderRadius: '8px',
                                                        border: '1px solid rgba(255, 193, 7, 0.22)',
                                                        background: 'rgba(255, 193, 7, 0.08)',
                                                        color: 'var(--color-text-secondary)',
                                                        fontSize: '12px',
                                                        lineHeight: 1.45,
                                                    }}
                                                >
                                                    Bloqueio: {reason}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <p style={{ margin: '0 0 var(--space-md) 0', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                    Snapshot de decisao ausente neste registro salvo.
                                </p>
                            )}

                            <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>
                                    Linha de outcomes e revisoes
                                </h3>
                                {coachProtocolOutcomes.length > 0 ? (
                                    coachProtocolOutcomes.map((outcome) => (
                                        <div
                                            key={outcome.id}
                                            style={{
                                                padding: 'var(--space-md)',
                                                borderRadius: '8px',
                                                border: outcome.conflict
                                                    ? '1px solid rgba(239, 68, 68, 0.28)'
                                                    : '1px solid rgba(255, 255, 255, 0.08)',
                                                background: outcome.conflict
                                                    ? 'rgba(239, 68, 68, 0.08)'
                                                    : 'rgba(0, 0, 0, 0.18)',
                                            }}
                                        >
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                                                <span className={outcome.conflict ? 'badge badge-warning' : 'badge badge-info'}>
                                                    {historyOutcomeStatusLabel(outcome.status)}
                                                </span>
                                                <span className="badge badge-info">{outcome.evidenceStrength}</span>
                                                {outcome.revisionOfOutcomeId ? (
                                                    <span className="badge badge-warning">
                                                        Revisao de {outcome.revisionOfOutcomeId}
                                                    </span>
                                                ) : null}
                                                <span className="badge badge-info">
                                                    {new Date(outcome.recordedAt).toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                            {outcome.reasonCodes.length > 0 ? (
                                                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                                    Motivos: {outcome.reasonCodes.map((reason) => HISTORY_OUTCOME_REASON_LABELS[reason]).join(', ')}
                                                </p>
                                            ) : null}
                                            {outcome.note ? (
                                                <p style={{ margin: '6px 0 0 0', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                                    Nota: {outcome.note}
                                                </p>
                                            ) : null}
                                            {outcome.conflict ? (
                                                <p style={{ margin: '6px 0 0 0', color: 'var(--color-warning)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                                    Conflito: {outcome.conflict.nextValidationCopy}
                                                </p>
                                            ) : null}
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                        Nenhum outcome registrado ainda. Use o painel de resultado para iniciar a trilha auditavel.
                                    </p>
                                )}
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
                                <div style={{ maxWidth: 540, minWidth: 0 }}>
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

                                <div style={{ display: 'grid', gap: '8px', minWidth: 'min(100%, 220px)' }}>
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

                    {analysisResult.coachPlan ? (
                        <div id="coach-outcome-panel">
                            <CoachProtocolOutcomePanel
                                sessionId={record.id}
                                coachPlan={analysisResult.coachPlan}
                                outcomes={coachProtocolOutcomes}
                            />
                        </div>
                    ) : (
                        <div id="sensitivity-feedback">
                            <SensitivityAcceptancePanel
                                sessionId={record.id}
                                sensitivity={analysisResult.sensitivity}
                            />
                        </div>
                    )}
                    <ResultsDashboard mode="audit-detail" result={analysisResultForDisplay} />
                </div>
            </div>
        </>
    );
}

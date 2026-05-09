import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import {
    analysisSessions,
    completeTrainingProtocolRevisions,
    precisionCheckpoints,
    precisionEvolutionLines,
    sprayLabBenchmarkSnapshots,
    sprayLabSessions,
    sprayLabValidationLinks,
    trainingProtocolTransferRecords,
    trainingProgramCycles,
    weaponProfiles,
} from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import Link from 'next/link';
import { SCOPE_LIST } from '@/game/pubg';
import { formatAnalysisDistancePresentation } from '@/app/analyze/analysis-distance-presentation';
import { ResultsDashboard } from '@/app/analyze/results-dashboard';
import { getCoachProtocolOutcomesForSession } from '@/actions/history';
import { formatPrecisionTrendLabel } from '@/core/precision-loop';
import { buildSprayLabCoachHandoff } from '@/core/spray-lab-coach-handoff';
import { trainingProgramReasonCopy } from '@/core/training-programs';
import { EvidenceChip, type EvidenceTone } from '@/ui/components/evidence-chip';
import { Header } from '@/ui/components/header';
import { LoopRail, type LoopStageKey } from '@/ui/components/loop-rail';
import { MetricTile } from '@/ui/components/metric-tile';
import { PageCommandHeader } from '@/ui/components/page-command-header';
import { hydrateAnalysisResultFromHistory } from '../analysis-result-hydration';
import { buildHistoryProtocolViewModel } from '../history-protocol-view-model';
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
import type {
    TrainingProgramCheckpoint,
    TrainingProgramCycleSnapshot,
    TrainingProgramEventType,
    TrainingProgramKind,
    TrainingProgramMissionStatus,
    TrainingProgramReasonCode,
    TrainingProgramState,
} from '@/types/training-programs';

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

type ProgramAuditCycleRow = {
    readonly id: string;
    readonly kind: TrainingProgramKind;
    readonly state: TrainingProgramState;
    readonly visibleReason: string;
    readonly blockerSummary: string;
    readonly snapshot: TrainingProgramCycleSnapshot;
    readonly updatedAt: Date;
    readonly archivedAt: Date | null;
    readonly completedAt: Date | null;
};

interface TrainingProgramEvidenceLink {
    readonly key: string;
    readonly label: string;
    readonly href: string | null;
}

interface TrainingProgramAuditViewModel {
    readonly cycleId: string;
    readonly kindLabel: string;
    readonly label: string;
    readonly stateLabel: string;
    readonly strictContextLabel: string;
    readonly currentWeekLabel: string;
    readonly reasonLabel: string;
    readonly blockerReasons: readonly string[];
    readonly technicalCheckpointLabel: string;
    readonly monthlyCheckpointLabel: string;
    readonly weeklyCheckpoints: readonly TrainingProgramCheckpoint[];
    readonly technicalCheckpoints: readonly TrainingProgramCheckpoint[];
    readonly monthlyCheckpoints: readonly TrainingProgramCheckpoint[];
    readonly missionRows: readonly {
        readonly id: string;
        readonly weekLabel: string;
        readonly title: string;
        readonly statusLabel: string;
        readonly categoryLabel: string;
        readonly reasonLabel: string;
        readonly evidenceLinks: readonly TrainingProgramEvidenceLink[];
    }[];
    readonly eventRows: readonly {
        readonly id: string;
        readonly typeLabel: string;
        readonly occurredAtLabel: string;
        readonly reasonLabel: string;
    }[];
    readonly relatedSprayLabLinks: readonly TrainingProgramEvidenceLink[];
    readonly relatedValidationLinks: readonly TrainingProgramEvidenceLink[];
    readonly relatedAnalysisLinks: readonly TrainingProgramEvidenceLink[];
    readonly cicloProHref: string;
    readonly archivedAtLabel: string | null;
    readonly completedAtLabel: string | null;
}

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
        case 'fatigue_or_pain':
            return 'Dor ou fadiga';
        case 'confused':
            return 'Protocolo confuso';
        case 'variable_changed':
            return 'Variavel mudou';
    }
}

function trainingProgramKindLabel(kind: TrainingProgramKind): string {
    switch (kind) {
        case 'ciclo_pro':
            return 'Ciclo Pro';
        case 'ciclo_reparo':
            return 'Ciclo Reparo';
    }
}

function trainingProgramStateLabel(state: TrainingProgramState): string {
    switch (state) {
        case 'preparando':
            return 'Preparando';
        case 'ativo':
            return 'Ativo';
        case 'reparando':
            return 'Em reparo';
        case 'consolidando':
            return 'Consolidando';
        case 'validacao_pendente':
            return 'Validacao pendente';
        case 'progresso_validado':
            return 'Progresso validado';
        case 'sem_mudanca_clara':
            return 'Sem mudanca clara';
        case 'regressao_validada':
            return 'Regressao validada';
        case 'inconclusivo':
            return 'Inconclusivo';
        case 'linha_reiniciada':
            return 'Linha reiniciada';
        case 'concluido':
            return 'Concluido';
        case 'pausado':
            return 'Pausado';
        case 'contexto_desatualizado':
            return 'Contexto desatualizado';
    }
}

function trainingProgramMissionStatusLabel(status: TrainingProgramMissionStatus): string {
    switch (status) {
        case 'locked':
            return 'bloqueada';
        case 'available':
            return 'disponivel';
        case 'active':
            return 'ativa';
        case 'completed':
            return 'concluida';
        case 'blocked':
            return 'bloqueada por evidencia';
        case 'skipped_reentered':
            return 'reencaixada';
    }
}

function trainingProgramEventTypeLabel(type: TrainingProgramEventType): string {
    switch (type) {
        case 'mission_started':
            return 'Missao iniciada';
        case 'mission_completed':
            return 'Missao concluida';
        case 'lab_evidence_attached':
            return 'Spray Lab anexado';
        case 'validation_attached':
            return 'Validacao anexada';
        case 'checkpoint_recorded':
            return 'Checkpoint registrado';
        case 'fatigue_reported':
            return 'Fadiga reportada';
        case 'discomfort_reported':
            return 'Pausa por desconforto';
        case 'confusion_reported':
            return 'Protocolo simplificado';
        case 'variable_changed':
            return 'Variavel mudou';
        case 'missed_day_reentered':
            return 'Reentrada de agenda';
        case 'context_marked_stale':
            return 'Contexto desatualizado';
        case 'line_restarted':
            return 'Linha reiniciada';
        case 'cycle_completed':
            return 'Ciclo concluido';
    }
}

function formatProgramReasons(
    reasonCodes: readonly TrainingProgramReasonCode[],
    fallback: string,
): string {
    if (reasonCodes.length === 0) {
        return fallback;
    }

    return reasonCodes.map(trainingProgramReasonCopy).join(' ');
}

function formatProgramDate(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime())
        ? 'data nao registrada'
        : date.toLocaleDateString('pt-BR');
}

function evidenceLinkLabel(kind: TrainingProgramEvidenceLink['label'], id: string): string {
    return `${kind}: ${id.slice(0, 8)}`;
}

function buildTrainingProgramEvidenceLinks(
    cycle: TrainingProgramCycleSnapshot,
): readonly TrainingProgramEvidenceLink[] {
    const refs = [
        ...(cycle.evidenceSummary.savedAnalysisId ? [{
            kind: 'analysis' as const,
            id: cycle.evidenceSummary.savedAnalysisId,
            href: `/history/${cycle.evidenceSummary.savedAnalysisId}`,
        }] : []),
        ...cycle.weeks.flatMap((week) => week.missions.flatMap((mission) => mission.evidenceRefs)),
        ...cycle.checkpoints.flatMap((checkpoint) => [
            ...(checkpoint.evidenceSummary.savedAnalysisId ? [{
                kind: 'analysis' as const,
                id: checkpoint.evidenceSummary.savedAnalysisId,
                href: `/history/${checkpoint.evidenceSummary.savedAnalysisId}`,
            }] : []),
            ...(checkpoint.evidenceSummary.sprayLabSession ? [{
                kind: 'spray_lab_session' as const,
                id: checkpoint.evidenceSummary.sprayLabSession.id,
                href: `/spray-lab?sessionId=${checkpoint.evidenceSummary.sprayLabSession.id}`,
            }] : []),
            ...(checkpoint.evidenceSummary.validationLink ? [{
                kind: 'validation_link' as const,
                id: checkpoint.evidenceSummary.validationLink.id,
                href: `/analyze?mode=validation&validationLinkId=${checkpoint.evidenceSummary.validationLink.id}`,
            }] : []),
        ]),
        ...cycle.transitionEvents.flatMap((event) => event.evidenceRefs),
    ];
    const seen = new Set<string>();

    return refs
        .filter((ref) => {
            const key = `${ref.kind}:${ref.id}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        })
        .map((ref): TrainingProgramEvidenceLink => {
            switch (ref.kind) {
                case 'analysis':
                    return {
                        key: `${ref.kind}:${ref.id}`,
                        label: evidenceLinkLabel('Analyze', ref.id),
                        href: ref.href ?? `/history/${ref.id}`,
                    };
                case 'spray_lab_session':
                case 'spray_lab_benchmark':
                    return {
                        key: `${ref.kind}:${ref.id}`,
                        label: evidenceLinkLabel('Spray Lab', ref.id),
                        href: ref.href ?? `/spray-lab?sessionId=${ref.id}`,
                    };
                case 'validation_link':
                case 'precision_trend':
                case 'precision_checkpoint':
                    return {
                        key: `${ref.kind}:${ref.id}`,
                        label: evidenceLinkLabel('Validacao', ref.id),
                        href: ref.href ?? null,
                    };
                case 'protocol':
                case 'coach_outcome':
                    return {
                        key: `${ref.kind}:${ref.id}`,
                        label: evidenceLinkLabel('Coach', ref.id),
                        href: ref.href ?? null,
                    };
            }
        });
}

function linksForMission(
    missionRefs: TrainingProgramCycleSnapshot['weeks'][number]['missions'][number]['evidenceRefs'],
    allLinks: readonly TrainingProgramEvidenceLink[],
): readonly TrainingProgramEvidenceLink[] {
    const wanted = new Set(missionRefs.map((ref) => `${ref.kind}:${ref.id}`));

    return allLinks.filter((link) => wanted.has(link.key));
}

function buildTrainingProgramAuditViewModel(row: ProgramAuditCycleRow): TrainingProgramAuditViewModel {
    const cycle = row.snapshot;
    const weeklyCheckpoints = cycle.checkpoints.filter((checkpoint) => checkpoint.layer === 'weekly_operational');
    const technicalCheckpoints = cycle.checkpoints.filter((checkpoint) => checkpoint.layer === 'technical_validated');
    const monthlyCheckpoints = cycle.checkpoints.filter((checkpoint) => checkpoint.layer === 'monthly_program');
    const evidenceLinks = buildTrainingProgramEvidenceLinks(cycle);
    const relatedSprayLabLinks = evidenceLinks.filter((link) => link.label.startsWith('Spray Lab'));
    const relatedValidationLinks = evidenceLinks.filter((link) => link.label.startsWith('Validacao'));
    const relatedAnalysisLinks = evidenceLinks.filter((link) => link.label.startsWith('Analyze'));
    const reasonCodes = row.snapshot.reasonCodes.length > 0 ? row.snapshot.reasonCodes : row.snapshot.evidenceSummary.blockers;
    const technicalCheckpointLabel = technicalCheckpoints.at(-1)?.summary
        ?? 'Checkpoint tecnico pendente: so conta quando existe clip compativel confirmado.';
    const monthlyCheckpointLabel = monthlyCheckpoints.at(-1)?.summary
        ?? 'Resumo mensal pendente; o ciclo nao classifica jogador nem fecha certeza final.';

    return {
        cycleId: cycle.id,
        kindLabel: trainingProgramKindLabel(row.kind),
        label: cycle.label,
        stateLabel: trainingProgramStateLabel(row.state),
        strictContextLabel: cycle.strictContextLabel,
        currentWeekLabel: `Semana ${cycle.currentWeekNumber}/4`,
        reasonLabel: formatProgramReasons(reasonCodes, row.visibleReason || row.blockerSummary),
        blockerReasons: Array.from(new Set([
            ...cycle.evidenceSummary.blockers.map(trainingProgramReasonCopy),
            ...reasonCodes.map(trainingProgramReasonCopy),
        ])),
        technicalCheckpointLabel,
        monthlyCheckpointLabel,
        weeklyCheckpoints,
        technicalCheckpoints,
        monthlyCheckpoints,
        missionRows: cycle.weeks.flatMap((week) => week.missions.map((mission) => ({
            id: mission.id,
            weekLabel: `Semana ${week.weekNumber}`,
            title: mission.title,
            statusLabel: trainingProgramMissionStatusLabel(mission.status),
            categoryLabel: mission.category,
            reasonLabel: formatProgramReasons(mission.reasonCodes, mission.anatomy.porQueImporta),
            evidenceLinks: linksForMission(mission.evidenceRefs, evidenceLinks),
        }))),
        eventRows: [...cycle.transitionEvents]
            .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))
            .map((event) => ({
                id: event.id,
                typeLabel: trainingProgramEventTypeLabel(event.type),
                occurredAtLabel: formatProgramDate(event.occurredAt),
                reasonLabel: event.userVisibleReason || formatProgramReasons(event.reasonCodes, 'Mudanca registrada no ciclo.'),
            })),
        relatedSprayLabLinks,
        relatedValidationLinks,
        relatedAnalysisLinks,
        cicloProHref: `/ciclo-pro?cycleId=${encodeURIComponent(cycle.id)}`,
        archivedAtLabel: row.archivedAt ? formatProgramDate(row.archivedAt) : null,
        completedAtLabel: row.completedAt ? formatProgramDate(row.completedAt) : null,
    };
}

function ProgramEvidenceLinkList({
    emptyLabel,
    links,
}: {
    readonly emptyLabel: string;
    readonly links: readonly TrainingProgramEvidenceLink[];
}) {
    if (links.length === 0) {
        return (
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                {emptyLabel}
            </span>
        );
    }

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {links.map((link) => (
                link.href ? (
                    <Link
                        className="badge badge-info"
                        href={link.href}
                        key={link.key}
                        style={{ textDecoration: 'none' }}
                    >
                        {link.label}
                    </Link>
                ) : (
                    <span className="badge badge-info" key={link.key}>
                        {link.label}
                    </span>
                )
            ))}
        </div>
    );
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

function resolveDetailPrimaryAction(input: {
    readonly hasCoachPlan: boolean;
    readonly hasProtocolAudit: boolean;
    readonly latestOutcome: CoachProtocolOutcome | null;
    readonly transferCount: number;
}) {
    if (!input.hasCoachPlan) {
        return {
            label: 'Registrar resultado de campo',
            href: '#sensitivity-feedback',
        };
    }

    if (!input.latestOutcome) {
        return {
            label: 'Registrar resultado',
            href: '#coach-outcome-panel',
        };
    }

    if (
        input.hasProtocolAudit
        && (
            input.latestOutcome.conflict
            || input.latestOutcome.status === 'fatigue_or_pain'
            || input.latestOutcome.status === 'confused'
            || input.latestOutcome.status === 'variable_changed'
        )
    ) {
        return {
            label: 'Revisar protocolo',
            href: '#history-protocol-audit',
        };
    }

    if (input.hasProtocolAudit && input.transferCount === 0) {
        return {
            label: 'Registrar transferencia',
            href: '#coach-outcome-panel',
        };
    }

    return {
        label: 'Revisar protocolo',
        href: input.hasProtocolAudit ? '#history-protocol-audit' : '#coach-outcome-panel',
    };
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
    const protocolRevisionRows = analysisResult.coachPlan?.completeProtocol
        ? await db
            .select({
                revisionReason: completeTrainingProtocolRevisions.revisionReason,
                tierDirection: completeTrainingProtocolRevisions.tierDirection,
                changedFields: completeTrainingProtocolRevisions.changedFields,
                createdAt: completeTrainingProtocolRevisions.createdAt,
            })
            .from(completeTrainingProtocolRevisions)
            .where(
                and(
                    eq(completeTrainingProtocolRevisions.analysisSessionId, record.id),
                    eq(completeTrainingProtocolRevisions.userId, session.user.id),
                ),
            )
            .orderBy(completeTrainingProtocolRevisions.createdAt)
        : [];
    const protocolTransferRows = analysisResult.coachPlan?.completeProtocol
        ? await db
            .select({
                situation: trainingProtocolTransferRecords.situation,
                weaponId: trainingProtocolTransferRecords.weaponId,
                opticId: trainingProtocolTransferRecords.opticId,
                approximateDistanceMeters: trainingProtocolTransferRecords.approximateDistanceMeters,
                pressureLevel: trainingProtocolTransferRecords.pressureLevel,
                feltControl: trainingProtocolTransferRecords.feltControl,
                result: trainingProtocolTransferRecords.result,
                countsAsTechnicalValidation: trainingProtocolTransferRecords.countsAsTechnicalValidation,
                createdAt: trainingProtocolTransferRecords.createdAt,
            })
            .from(trainingProtocolTransferRecords)
            .where(
                and(
                    eq(trainingProtocolTransferRecords.analysisSessionId, record.id),
                    eq(trainingProtocolTransferRecords.userId, session.user.id),
                ),
            )
            .orderBy(trainingProtocolTransferRecords.createdAt)
        : [];
    const programCycleRows = await db
        .select({
            id: trainingProgramCycles.id,
            kind: trainingProgramCycles.kind,
            state: trainingProgramCycles.state,
            visibleReason: trainingProgramCycles.visibleReason,
            blockerSummary: trainingProgramCycles.blockerSummary,
            snapshot: trainingProgramCycles.snapshot,
            updatedAt: trainingProgramCycles.updatedAt,
            archivedAt: trainingProgramCycles.archivedAt,
            completedAt: trainingProgramCycles.completedAt,
        })
        .from(trainingProgramCycles)
        .where(
            and(
                eq(trainingProgramCycles.baseAnalysisSessionId, record.id),
                eq(trainingProgramCycles.userId, session.user.id),
            ),
        )
        .orderBy(desc(trainingProgramCycles.updatedAt));
    const trainingProgramAudits = programCycleRows.map(buildTrainingProgramAuditViewModel);
    const [sprayLabRow] = analysisResult.coachPlan?.completeProtocol
        ? await db
            .select({
                id: sprayLabSessions.id,
                snapshot: sprayLabSessions.snapshot,
            })
            .from(sprayLabSessions)
            .where(
                and(
                    eq(sprayLabSessions.baseAnalysisSessionId, record.id),
                    eq(sprayLabSessions.userId, session.user.id),
                ),
            )
            .orderBy(desc(sprayLabSessions.updatedAt))
            .limit(1)
        : [];
    const [sprayLabBenchmarkRow] = sprayLabRow
        ? await db
            .select({
                snapshot: sprayLabBenchmarkSnapshots.snapshot,
            })
            .from(sprayLabBenchmarkSnapshots)
            .where(
                and(
                    eq(sprayLabBenchmarkSnapshots.labSessionId, sprayLabRow.id),
                    eq(sprayLabBenchmarkSnapshots.userId, session.user.id),
                ),
            )
            .orderBy(desc(sprayLabBenchmarkSnapshots.createdAt))
            .limit(1)
        : [];
    const [sprayLabValidationRow] = sprayLabRow
        ? await db
            .select({
                payload: sprayLabValidationLinks.payload,
            })
            .from(sprayLabValidationLinks)
            .where(
                and(
                    eq(sprayLabValidationLinks.labSessionId, sprayLabRow.id),
                    eq(sprayLabValidationLinks.userId, session.user.id),
                ),
            )
            .orderBy(desc(sprayLabValidationLinks.updatedAt))
            .limit(1)
        : [];
    const sprayLabHandoff = buildSprayLabCoachHandoff({
        session: sprayLabRow?.snapshot ?? null,
        benchmark: sprayLabBenchmarkRow?.snapshot ?? null,
        validationLink: sprayLabValidationRow?.payload ?? null,
        transfers: protocolTransferRows.map((transfer) => ({
            situation: transfer.situation,
            result: transfer.result,
            countsAsTechnicalValidation: false,
            createdAt: transfer.createdAt,
        })),
    });
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
    const historyProtocol = buildHistoryProtocolViewModel({
        result: analysisResultForDisplay,
        savedAt: record.createdAt,
        outcomes: coachProtocolOutcomes,
        revisions: protocolRevisionRows,
        transfers: protocolTransferRows.map((transfer) => ({
            ...transfer,
            countsAsTechnicalValidation: false,
        })),
        sprayLabHandoff,
        canSeeFullProtocol: true,
    });
    const latestCoachOutcome = coachProtocolOutcomes.at(-1) ?? null;
    const detailPrimaryAction = resolveDetailPrimaryAction({
        hasCoachPlan: Boolean(analysisResultForDisplay.coachPlan),
        hasProtocolAudit: Boolean(historyProtocol),
        latestOutcome: latestCoachOutcome,
        transferCount: protocolTransferRows.length,
    });
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

                    {trainingProgramAudits.length > 0 ? (
                        <section
                            id="history-training-program-audit"
                            className="glass-card"
                            style={{
                                padding: 'var(--space-lg)',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                background: 'linear-gradient(145deg, rgba(5, 24, 15, 0.78), rgba(8, 8, 12, 0.92))',
                            }}
                        >
                            <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        justifyContent: 'space-between',
                                        gap: 'var(--space-lg)',
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <div style={{ maxWidth: 620, minWidth: 0 }}>
                                        <p
                                            style={{
                                                margin: '0 0 var(--space-xs) 0',
                                                fontSize: '11px',
                                                letterSpacing: '0.18em',
                                                textTransform: 'uppercase',
                                                color: 'var(--color-success)',
                                                fontWeight: 700,
                                            }}
                                        >
                                            Auditoria do Ciclo Pro
                                        </p>
                                        <h2 style={{ margin: 0, fontSize: 'var(--text-2xl)', lineHeight: 1.15 }}>
                                            Ciclo, checkpoints e reentrada
                                        </h2>
                                        <p style={{ margin: 'var(--space-sm) 0 0 0', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                                            Historico preserva o motivo de cada mudanca do programa. Execucao, Spray Lab e transferencia pratica ajudam o coach, mas progresso tecnico depende de validacao compativel.
                                        </p>
                                    </div>
                                    <Link href="/ciclo-pro" className="btn btn-secondary">
                                        Abrir Ciclo Pro
                                    </Link>
                                </div>

                                {trainingProgramAudits.map((program) => (
                                    <div
                                        key={program.cycleId}
                                        style={{
                                            display: 'grid',
                                            gap: 'var(--space-lg)',
                                            paddingTop: 'var(--space-lg)',
                                            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                        }}
                                    >
                                        <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                <span className="badge badge-info">{program.kindLabel}</span>
                                                <span className="badge badge-info">{program.stateLabel}</span>
                                                <span className="badge badge-info">{program.currentWeekLabel}</span>
                                                {program.archivedAtLabel ? (
                                                    <span className="badge badge-warning">Arquivado em {program.archivedAtLabel}</span>
                                                ) : null}
                                                {program.completedAtLabel ? (
                                                    <span className="badge badge-info">Concluido em {program.completedAtLabel}</span>
                                                ) : null}
                                            </div>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: 'var(--text-xl)', lineHeight: 1.2 }}>
                                                    {program.label}
                                                </h3>
                                                <p style={{ margin: '6px 0 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                                    Contexto estrito: {program.strictContextLabel}
                                                </p>
                                                <p style={{ margin: '6px 0 0 0', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                                    Motivo visivel: {program.reasonLabel}
                                                </p>
                                            </div>
                                            {program.blockerReasons.length > 0 ? (
                                                <div style={{ display: 'grid', gap: '6px' }} aria-label="Bloqueadores do Ciclo Pro">
                                                    {program.blockerReasons.slice(0, 5).map((reason) => (
                                                        <span
                                                            key={reason}
                                                            style={{
                                                                padding: '8px 10px',
                                                                borderRadius: '8px',
                                                                border: '1px solid rgba(255, 193, 7, 0.22)',
                                                                background: 'rgba(255, 193, 7, 0.08)',
                                                                color: 'var(--color-text-secondary)',
                                                                fontSize: 'var(--text-sm)',
                                                                lineHeight: 1.5,
                                                            }}
                                                        >
                                                            Reparo/pendencia: {reason}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 'var(--space-md)' }}>
                                            <div style={{ display: 'grid', gap: '8px' }}>
                                                <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>
                                                    Checkpoints semanais operacionais
                                                </h3>
                                                {program.weeklyCheckpoints.length > 0 ? (
                                                    program.weeklyCheckpoints.map((checkpoint) => (
                                                        <p key={checkpoint.id} style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                                            Semana {checkpoint.weekNumber ?? '-'}: {checkpoint.summary}
                                                        </p>
                                                    ))
                                                ) : (
                                                    <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                                        Nenhum checkpoint semanal registrado ainda.
                                                    </p>
                                                )}
                                            </div>

                                            <div style={{ display: 'grid', gap: '8px' }}>
                                                <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>
                                                    Checkpoint tecnico validado
                                                </h3>
                                                <p style={{ margin: 0, color: program.technicalCheckpoints.length > 0 ? 'var(--color-text-muted)' : 'var(--color-warning)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                                    {program.technicalCheckpointLabel}
                                                </p>
                                            </div>

                                            <div style={{ display: 'grid', gap: '8px' }}>
                                                <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>
                                                    Checkpoint mensal
                                                </h3>
                                                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                                    {program.monthlyCheckpointLabel}
                                                </p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                            <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>
                                                Missoes, outcomes e motivos
                                            </h3>
                                            <div style={{ display: 'grid', gap: '8px' }}>
                                                {program.missionRows.map((mission) => (
                                                    <div
                                                        key={mission.id}
                                                        style={{
                                                            padding: 'var(--space-sm)',
                                                            borderRadius: '8px',
                                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                                            background: 'rgba(0, 0, 0, 0.16)',
                                                            display: 'grid',
                                                            gap: '6px',
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                            <span className="badge badge-info">{mission.weekLabel}</span>
                                                            <span className="badge badge-info">{mission.categoryLabel}</span>
                                                            <span className={mission.statusLabel === 'bloqueada por evidencia' ? 'badge badge-warning' : 'badge badge-info'}>
                                                                {mission.statusLabel}
                                                            </span>
                                                        </div>
                                                        <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
                                                            {mission.title}
                                                        </p>
                                                        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', lineHeight: 1.5 }}>
                                                            Motivo: {mission.reasonLabel}
                                                        </p>
                                                        <ProgramEvidenceLinkList
                                                            emptyLabel="Sem evidencia anexada diretamente nesta missao."
                                                            links={mission.evidenceLinks}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 'var(--space-md)' }}>
                                            <div style={{ display: 'grid', gap: '8px' }}>
                                                <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>
                                                    Spray Lab relacionado
                                                </h3>
                                                <ProgramEvidenceLinkList
                                                    emptyLabel="Sem sessao Spray Lab anexada ao ciclo."
                                                    links={program.relatedSprayLabLinks}
                                                />
                                            </div>
                                            <div style={{ display: 'grid', gap: '8px' }}>
                                                <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>
                                                    Clips de validacao Analyze
                                                </h3>
                                                <ProgramEvidenceLinkList
                                                    emptyLabel="Sem clip de validacao compativel anexado."
                                                    links={program.relatedValidationLinks}
                                                />
                                            </div>
                                            <div style={{ display: 'grid', gap: '8px' }}>
                                                <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>
                                                    Analises base
                                                </h3>
                                                <ProgramEvidenceLinkList
                                                    emptyLabel="Sem analise base vinculada."
                                                    links={program.relatedAnalysisLinks}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gap: '8px' }}>
                                            <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>
                                                Reparos, reentrada e reinicio de linha
                                            </h3>
                                            {program.eventRows.length > 0 ? (
                                                program.eventRows.map((event) => (
                                                    <p key={event.id} style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                                        {event.occurredAtLabel} - {event.typeLabel}: {event.reasonLabel}
                                                    </p>
                                                ))
                                            ) : (
                                                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                                    Nenhum reparo, reentrada ou reinicio registrado para este ciclo.
                                                </p>
                                            )}
                                        </div>

                                        <Link href={program.cicloProHref} className="btn btn-secondary" style={{ width: 'fit-content' }}>
                                            Voltar para o Ciclo Pro
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {historyProtocol ? (
                        <section
                            id="history-protocol-audit"
                            className="glass-card"
                            style={{
                                padding: 'var(--space-lg)',
                                border: '1px solid rgba(116, 215, 255, 0.18)',
                                background: 'linear-gradient(145deg, rgba(8, 18, 22, 0.82), rgba(8, 8, 12, 0.92))',
                            }}
                        >
                            <div style={{ display: 'grid', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: '11px',
                                        letterSpacing: '0.18em',
                                        textTransform: 'uppercase',
                                        color: '#74d7ff',
                                        fontWeight: 700,
                                    }}
                                >
                                    Protocolo salvo
                                </p>
                                <h2 style={{ margin: 0, fontSize: 'var(--text-2xl)', lineHeight: 1.15 }}>
                                    {historyProtocol.snapshotCard.title}
                                </h2>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    <span className="badge badge-info">{historyProtocol.snapshotCard.tierLabel}</span>
                                    <span className="badge badge-info">{historyProtocol.snapshotCard.duration}</span>
                                    <span className="badge badge-info">{historyProtocol.snapshotCard.drillId}</span>
                                    <span className="badge badge-info">Foco: {historyProtocol.snapshotCard.focus}</span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 'var(--space-md)' }}>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>Resultado do bloco</h3>
                                    <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                        {historyProtocol.outcomeCard.statusLabel} - evidencia {historyProtocol.outcomeCard.evidenceStrength}.
                                        {historyProtocol.outcomeCard.needsCompatibleValidation ? ' Falta clip compativel.' : ' Clip compativel confirmado.'}
                                    </p>
                                    {historyProtocol.outcomeCard.conflictCopy ? (
                                        <p style={{ margin: 0, color: 'var(--color-warning)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                            Conflito: {historyProtocol.outcomeCard.conflictCopy}
                                        </p>
                                    ) : null}
                                </div>

                                <div style={{ display: 'grid', gap: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>
                                        Validacao compativel
                                    </h3>
                                    <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                        {historyProtocol.validationCard.checklist.slice(0, 5).map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', lineHeight: 1.6 }}>
                                        {historyProtocol.validationCard.nextClipCopy}
                                    </p>
                                </div>

                                <div style={{ display: 'grid', gap: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>
                                        Transferencia em partida/TDM
                                    </h3>
                                    <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                        {historyProtocol.transferCard.latestRecord
                                            ? `${historyProtocol.transferCard.latestRecord.situation}: ${historyProtocol.transferCard.latestRecord.result}`
                                            : historyProtocol.transferCard.checklist.slice(0, 3).join(' | ')}
                                    </p>
                                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', lineHeight: 1.6 }}>
                                        {historyProtocol.transferCard.countsAsTechnicalValidationCopy}
                                    </p>
                                </div>

                                {historyProtocol.sprayLabCard ? (
                                    <div id="history-spray-lab-audit" style={{ display: 'grid', gap: '8px' }}>
                                        <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>
                                            Spray Lab
                                        </h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            <span className="badge badge-info">{historyProtocol.sprayLabCard.contextLabel}</span>
                                            <span className="badge badge-info">{historyProtocol.sprayLabCard.fidelityLabel}</span>
                                            <span className="badge badge-info">{historyProtocol.sprayLabCard.indexLabel}</span>
                                        </div>
                                        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                            {historyProtocol.sprayLabCard.validationLabel}
                                        </p>
                                        <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', lineHeight: 1.6 }}>
                                            {historyProtocol.sprayLabCard.transferLabel}
                                        </p>
                                        {historyProtocol.sprayLabCard.blockerReasons.length > 0 ? (
                                            <div style={{ display: 'grid', gap: '6px' }}>
                                                {historyProtocol.sprayLabCard.blockerReasons.slice(0, 3).map((reason) => (
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
                                                        Reparo: {reason}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                        <Link href={historyProtocol.sprayLabCard.nextActionHref} className="btn btn-secondary" style={{ width: 'fit-content' }}>
                                            {historyProtocol.sprayLabCard.nextActionLabel}
                                        </Link>
                                    </div>
                                ) : null}
                            </div>

                            <div style={{ display: 'grid', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>Revisoes do protocolo</h3>
                                    {historyProtocol.revisionTimeline.length > 0 ? (
                                        historyProtocol.revisionTimeline.map((revision) => (
                                            <p key={`${revision.createdAt}:${revision.revisionReason}`} style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                                {revision.createdAt} - {revision.revisionReason} ({revision.tierDirection}; {revision.changedFieldsLabel})
                                            </p>
                                        ))
                                    ) : (
                                        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                                            Nenhuma revisao explicita registrada para este protocolo.
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {historyProtocol.auditRows.map((row) => (
                                        <EvidenceChip
                                            key={row.label}
                                            label={row.label}
                                            tone={row.label === 'Blocker reasons' ? 'warning' : 'info'}
                                            value={row.value}
                                        />
                                    ))}
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
                                sprayLabSessionId={sprayLabHandoff?.labSessionId ?? null}
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

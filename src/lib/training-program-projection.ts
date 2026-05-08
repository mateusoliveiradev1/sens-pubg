import { hasProductEntitlement, type ProductAccessResolution } from '@/lib/product-entitlements';
import { createPremiumProjectionSummary } from '@/lib/premium-projection';
import type {
    PremiumFeatureLock,
    ProductAccessState,
    ProductEntitlementKey,
    ProductTier,
} from '@/types/monetization';
import type {
    TrainingProgramActiveLineReference,
    TrainingProgramAdaptiveWeek,
    TrainingProgramCheckpoint,
    TrainingProgramCta,
    TrainingProgramCycleSnapshot,
    TrainingProgramEvidenceReference,
    TrainingProgramMission,
    TrainingProgramMissionCategory,
    TrainingProgramMissionSlot,
    TrainingProgramMissionStatus,
    TrainingProgramReasonCode,
    TrainingProgramRecoveryAction,
    TrainingProgramState,
    TrainingProgramTransitionEvent,
} from '@/types/training-programs';

export const TRAINING_PROGRAM_WEEKLY_FEATURE: ProductEntitlementKey = 'programs.guided_weekly';
export const TRAINING_PROGRAM_MONTHLY_FEATURE: ProductEntitlementKey = 'programs.guided_monthly';

export interface TrainingProgramProjectedEvidence {
    readonly summary: string;
    readonly confidence: number;
    readonly coverage: number;
    readonly blockers: readonly TrainingProgramReasonCode[];
    readonly reasonCodes: readonly TrainingProgramReasonCode[];
    readonly evidenceRefs: readonly TrainingProgramEvidenceReference[];
}

export interface TrainingProgramProjectedMission {
    readonly id: string;
    readonly weekNumber: 1 | 2 | 3 | 4;
    readonly slot: TrainingProgramMissionSlot;
    readonly category: TrainingProgramMissionCategory;
    readonly status: TrainingProgramMissionStatus;
    readonly title: string;
    readonly agora: string;
    readonly porQueImporta: string;
    readonly oQueInvalida: string;
    readonly evidenciaGerada: string;
    readonly proximoCta: TrainingProgramCta;
    readonly reasonCodes: readonly TrainingProgramReasonCode[];
    readonly evidenceRefs: readonly TrainingProgramEvidenceReference[];
}

export interface TrainingProgramProjectedWeek {
    readonly id: string;
    readonly weekNumber: 1 | 2 | 3 | 4;
    readonly label: string;
    readonly state: TrainingProgramState;
    readonly missions: readonly TrainingProgramProjectedMission[];
    readonly checkpointIds: readonly string[];
    readonly reasonCodes: readonly TrainingProgramReasonCode[];
    readonly canIncreaseDifficulty: boolean;
    readonly recoveryAction: TrainingProgramRecoveryAction | null;
}

export interface TrainingProgramProjectedCycle {
    readonly id: string;
    readonly kind: TrainingProgramCycleSnapshot['kind'];
    readonly state: TrainingProgramState;
    readonly label: string;
    readonly strictContextKey: string;
    readonly strictContextLabel: string;
    readonly currentWeekNumber: 1 | 2 | 3 | 4;
    readonly currentMissionId: string | null;
    readonly recoveryAction: TrainingProgramRecoveryAction;
    readonly activeLine: TrainingProgramActiveLineReference | null;
    readonly archivedLines: readonly TrainingProgramActiveLineReference[];
    readonly weeks: readonly TrainingProgramProjectedWeek[];
    readonly checkpoints: readonly TrainingProgramCheckpoint[];
    readonly transitionEvents: readonly TrainingProgramTransitionEvent[];
}

export interface TrainingProgramProjection {
    readonly tier: ProductTier;
    readonly accessState: ProductAccessState;
    readonly canSeeNextStep: true;
    readonly canUseGuidedWeekly: boolean;
    readonly canUseGuidedMonthly: boolean;
    readonly canSeeFullThirtyDayCycle: boolean;
    readonly canSeeProgramAudit: boolean;
    readonly canSeeRecoveryAndReentry: boolean;
    readonly depth: 'basic_next_step' | 'full_30_day_cycle';
    readonly freeValueCopy: string;
    readonly proValueCopy: string;
    readonly locks: readonly PremiumFeatureLock[];
    readonly nextStep: TrainingProgramCta;
    readonly basicMission: TrainingProgramProjectedMission | null;
    readonly evidence: TrainingProgramProjectedEvidence | null;
    readonly fullCycle: TrainingProgramProjectedCycle | null;
}

export interface ProjectTrainingProgramForAccessInput {
    readonly access: ProductAccessResolution;
    readonly cycle?: TrainingProgramCycleSnapshot | null;
}

function projectMission(mission: TrainingProgramMission): TrainingProgramProjectedMission {
    return {
        id: mission.id,
        weekNumber: mission.weekNumber,
        slot: mission.slot,
        category: mission.category,
        status: mission.status,
        title: mission.title,
        agora: mission.anatomy.agora,
        porQueImporta: mission.anatomy.porQueImporta,
        oQueInvalida: mission.anatomy.oQueInvalida,
        evidenciaGerada: mission.anatomy.evidenciaGerada,
        proximoCta: mission.anatomy.proximoCta,
        reasonCodes: mission.reasonCodes,
        evidenceRefs: mission.evidenceRefs,
    };
}

function projectWeek(week: TrainingProgramAdaptiveWeek): TrainingProgramProjectedWeek {
    return {
        id: week.id,
        weekNumber: week.weekNumber,
        label: week.label,
        state: week.state,
        missions: week.missions.map(projectMission),
        checkpointIds: week.checkpointIds,
        reasonCodes: week.reasonCodes,
        canIncreaseDifficulty: week.canIncreaseDifficulty,
        recoveryAction: week.recoveryAction ?? null,
    };
}

function findBasicMission(cycle: TrainingProgramCycleSnapshot): TrainingProgramMission | null {
    if (cycle.currentMissionId) {
        const current = cycle.weeks
            .flatMap((week) => week.missions)
            .find((mission) => mission.id === cycle.currentMissionId);

        if (current) {
            return current;
        }
    }

    return cycle.weeks[0]?.missions.find((mission) => mission.status !== 'completed') ?? null;
}

function projectEvidence(cycle: TrainingProgramCycleSnapshot): TrainingProgramProjectedEvidence {
    const refs: TrainingProgramEvidenceReference[] = [];

    if (cycle.evidenceSummary.savedAnalysisId) {
        refs.push({
            kind: 'analysis',
            id: cycle.evidenceSummary.savedAnalysisId,
            href: `/history/${cycle.evidenceSummary.savedAnalysisId}`,
        });
    }

    if (cycle.evidenceSummary.protocolId) {
        refs.push({
            kind: 'protocol',
            id: cycle.evidenceSummary.protocolId,
        });
    }

    return {
        summary: cycle.evidenceSummary.summary,
        confidence: cycle.evidenceSummary.confidence,
        coverage: cycle.evidenceSummary.coverage,
        blockers: cycle.evidenceSummary.blockers,
        reasonCodes: cycle.reasonCodes,
        evidenceRefs: refs,
    };
}

function projectFullCycle(cycle: TrainingProgramCycleSnapshot): TrainingProgramProjectedCycle {
    return {
        id: cycle.id,
        kind: cycle.kind,
        state: cycle.state,
        label: cycle.label,
        strictContextKey: cycle.strictContextKey,
        strictContextLabel: cycle.strictContextLabel,
        currentWeekNumber: cycle.currentWeekNumber,
        currentMissionId: cycle.currentMissionId,
        recoveryAction: cycle.recoveryAction,
        activeLine: cycle.activeLine,
        archivedLines: cycle.archivedLines,
        weeks: cycle.weeks.map(projectWeek),
        checkpoints: cycle.checkpoints,
        transitionEvents: cycle.transitionEvents,
    };
}

function defaultNextStep(): TrainingProgramCta {
    return {
        label: 'Salvar analise para abrir Ciclo Pro',
        href: '/analyze',
        target: 'ciclo_pro',
    };
}

export function projectTrainingProgramForAccess(
    input: ProjectTrainingProgramForAccessInput,
): TrainingProgramProjection {
    const canUseGuidedWeekly = hasProductEntitlement(input.access, TRAINING_PROGRAM_WEEKLY_FEATURE);
    const canUseGuidedMonthly = hasProductEntitlement(input.access, TRAINING_PROGRAM_MONTHLY_FEATURE);
    const premiumProjection = createPremiumProjectionSummary(input.access);
    const locks = premiumProjection.locks.filter((lock) => (
        lock.featureKey === TRAINING_PROGRAM_WEEKLY_FEATURE
        || lock.featureKey === TRAINING_PROGRAM_MONTHLY_FEATURE
    ));
    const cycle = input.cycle ?? null;
    const basicMission = cycle ? findBasicMission(cycle) : null;

    return {
        tier: input.access.effectiveTier,
        accessState: input.access.accessState,
        canSeeNextStep: true,
        canUseGuidedWeekly,
        canUseGuidedMonthly,
        canSeeFullThirtyDayCycle: canUseGuidedMonthly,
        canSeeProgramAudit: canUseGuidedMonthly,
        canSeeRecoveryAndReentry: canUseGuidedWeekly,
        depth: canUseGuidedMonthly ? 'full_30_day_cycle' : 'basic_next_step',
        freeValueCopy: 'O Free te mostra o proximo passo real, uma missao basica, blockers, evidencia e CTA do Ciclo Pro sem dados falsos.',
        proValueCopy: 'O Pro organiza sua evolucao em um Ciclo Pro de 30 dias completo, adaptativo e auditavel com quatro semanas, checkpoints, reparo, recuperacao e continuidade de linha ativa.',
        locks,
        nextStep: cycle?.nextCta ?? defaultNextStep(),
        basicMission: basicMission ? projectMission(basicMission) : null,
        evidence: cycle ? projectEvidence(cycle) : null,
        fullCycle: canUseGuidedMonthly && cycle ? projectFullCycle(cycle) : null,
    };
}

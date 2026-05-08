import { hasProductEntitlement, type ProductAccessResolution } from '@/lib/product-entitlements';
import { createPremiumProjectionSummary } from '@/lib/premium-projection';
import type {
    PremiumFeatureLock,
    ProductAccessState,
    ProductEntitlementKey,
    ProductTier,
} from '@/types/monetization';
import type {
    SprayLabBenchmarkSnapshot,
    SprayLabEvidenceLevel,
    SprayLabFidelityReasonCode,
    SprayLabFidelityTier,
    SprayLabIndexState,
    SprayLabSessionSnapshot,
    SprayLabSessionStatus,
    SprayLabStepState,
    SprayLabValidationStatus,
} from '@/types/engine';

export const SPRAY_LAB_SESSION_RUNNER_FEATURE: ProductEntitlementKey = 'spray_lab.session_runner';
export const SPRAY_LAB_BENCHMARKS_FEATURE: ProductEntitlementKey = 'spray_lab.benchmarks';

export interface SprayLabProjectedLane {
    readonly id: string;
    readonly label: string;
    readonly shortLabel: string;
    readonly objective: string;
    readonly difficulty: string;
    readonly supportLevel: string;
}

export interface SprayLabProjectedIndex {
    readonly state: SprayLabIndexState;
    readonly evidenceLevel: SprayLabEvidenceLevel;
    readonly provisionalScore: number;
    readonly validatedScore: number | null;
    readonly fidelityTier: SprayLabFidelityTier;
    readonly validationStatus: SprayLabValidationStatus;
    readonly blockerReasons: readonly SprayLabFidelityReasonCode[];
}

export interface SprayLabProjectedAudit {
    readonly protocolTitle: string;
    readonly target: string;
    readonly preparation: readonly string[];
    readonly executionSteps: readonly string[];
    readonly stopConditions: readonly string[];
    readonly antiMixingNotes: readonly string[];
    readonly fidelityComponents: readonly {
        readonly key: string;
        readonly label: string;
        readonly score: number;
        readonly impact: string;
    }[];
    readonly eventIds: readonly string[];
}

export interface SprayLabProjectedSession {
    readonly id: string;
    readonly status: SprayLabSessionStatus;
    readonly stepState: SprayLabStepState;
    readonly protocolId: string;
    readonly contextKey: string;
    readonly lane: SprayLabProjectedLane;
    readonly progress: {
        readonly completedReps: number;
        readonly totalReps: number;
        readonly completedSprays: number;
        readonly totalSprays: number;
    };
    readonly provisionalIndex: SprayLabProjectedIndex | null;
    readonly validatedIndex: SprayLabProjectedIndex | null;
    readonly repairState: SprayLabSessionSnapshot['repairState'];
    readonly audit: SprayLabProjectedAudit | null;
    readonly benchmark: SprayLabBenchmarkSnapshot | null;
}

export interface SprayLabProjection {
    readonly tier: ProductTier;
    readonly accessState: ProductAccessState;
    readonly canStartBasicSession: boolean;
    readonly canUseFullSessionRunner: boolean;
    readonly canSeeAuditDrawers: boolean;
    readonly canSeeSessionHistory: boolean;
    readonly canSeeValidatedIndex: boolean;
    readonly canSeeContextBenchmarks: boolean;
    readonly canCompareSessions: boolean;
    readonly laneDepth: 'basic' | 'advanced';
    readonly freeValueCopy: string;
    readonly proValueCopy: string;
    readonly locks: readonly PremiumFeatureLock[];
    readonly session: SprayLabProjectedSession | null;
}

export interface ProjectSprayLabForAccessInput {
    readonly access: ProductAccessResolution;
    readonly session?: SprayLabSessionSnapshot | null;
    readonly benchmark?: SprayLabBenchmarkSnapshot | null;
}

function projectLane(session: SprayLabSessionSnapshot): SprayLabProjectedLane {
    return {
        id: session.lane.id,
        label: session.lane.label,
        shortLabel: session.lane.shortLabel,
        objective: session.lane.objective,
        difficulty: session.lane.difficulty,
        supportLevel: session.lane.supportLevel,
    };
}

function projectIndex(
    session: SprayLabSessionSnapshot,
    canSeeValidatedIndex: boolean,
): {
    readonly provisionalIndex: SprayLabProjectedIndex | null;
    readonly validatedIndex: SprayLabProjectedIndex | null;
} {
    const index = session.index;
    if (!index) {
        return {
            provisionalIndex: null,
            validatedIndex: null,
        };
    }

    const projected: SprayLabProjectedIndex = {
        state: index.state,
        evidenceLevel: index.evidenceLevel,
        provisionalScore: index.provisionalScore,
        validatedScore: canSeeValidatedIndex ? index.validatedScore ?? null : null,
        fidelityTier: index.fidelityTier,
        validationStatus: index.validationStatus,
        blockerReasons: index.blockerReasons,
    };

    return {
        provisionalIndex: {
            ...projected,
            validatedScore: null,
        },
        validatedIndex: canSeeValidatedIndex && index.validatedScore !== undefined
            ? projected
            : null,
    };
}

function projectAudit(
    session: SprayLabSessionSnapshot,
    canSeeAuditDrawers: boolean,
): SprayLabProjectedAudit | null {
    if (!canSeeAuditDrawers) {
        return null;
    }

    return {
        protocolTitle: session.protocol.title,
        target: session.protocol.target,
        preparation: session.protocol.preparation.map((item) => item.label),
        executionSteps: session.protocol.executionSteps,
        stopConditions: session.protocol.stopConditions,
        antiMixingNotes: session.protocol.antiMixingNotes,
        fidelityComponents: session.fidelity?.components.map((component) => ({
            key: component.key,
            label: component.label,
            score: component.score,
            impact: component.impact,
        })) ?? [],
        eventIds: session.eventIds,
    };
}

function projectSession(input: {
    readonly session: SprayLabSessionSnapshot;
    readonly benchmark: SprayLabBenchmarkSnapshot | null;
    readonly canSeeAuditDrawers: boolean;
    readonly canSeeValidatedIndex: boolean;
    readonly canSeeContextBenchmarks: boolean;
}): SprayLabProjectedSession {
    const { provisionalIndex, validatedIndex } = projectIndex(
        input.session,
        input.canSeeValidatedIndex,
    );

    return {
        id: input.session.id,
        status: input.session.status,
        stepState: input.session.stepState,
        protocolId: input.session.protocolId,
        contextKey: input.session.contextKey,
        lane: projectLane(input.session),
        progress: {
            completedReps: input.session.completedReps,
            totalReps: input.session.totalReps,
            completedSprays: input.session.completedSprays,
            totalSprays: input.session.totalSprays,
        },
        provisionalIndex,
        validatedIndex,
        repairState: input.session.repairState,
        audit: projectAudit(input.session, input.canSeeAuditDrawers),
        benchmark: input.canSeeContextBenchmarks ? input.benchmark : null,
    };
}

export function projectSprayLabForAccess(input: ProjectSprayLabForAccessInput): SprayLabProjection {
    const canUseFullSessionRunner = hasProductEntitlement(input.access, SPRAY_LAB_SESSION_RUNNER_FEATURE);
    const canSeeContextBenchmarks = hasProductEntitlement(input.access, SPRAY_LAB_BENCHMARKS_FEATURE);
    const canSeeValidatedIndex = canSeeContextBenchmarks;
    const premiumProjection = createPremiumProjectionSummary(input.access);
    const locks = premiumProjection.locks.filter((lock) => (
        lock.featureKey === SPRAY_LAB_SESSION_RUNNER_FEATURE
        || lock.featureKey === SPRAY_LAB_BENCHMARKS_FEATURE
    ));

    return {
        tier: input.access.effectiveTier,
        accessState: input.access.accessState,
        canStartBasicSession: true,
        canUseFullSessionRunner,
        canSeeAuditDrawers: canUseFullSessionRunner,
        canSeeSessionHistory: canUseFullSessionRunner,
        canSeeValidatedIndex,
        canSeeContextBenchmarks,
        canCompareSessions: canSeeContextBenchmarks,
        laneDepth: canUseFullSessionRunner ? 'advanced' : 'basic',
        freeValueCopy: 'Free executa uma sessao guiada basica com checklist, timer simples, score provisorio e validacao compativel.',
        proValueCopy: 'Pro aprofunda o runner com auditoria, historico de sessoes, indice validado, benchmark por contexto e comparacoes das suas proprias sessoes.',
        locks,
        session: input.session
            ? projectSession({
                session: input.session,
                benchmark: input.benchmark ?? null,
                canSeeAuditDrawers: canUseFullSessionRunner,
                canSeeValidatedIndex,
                canSeeContextBenchmarks,
            })
            : null,
    };
}

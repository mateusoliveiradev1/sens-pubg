'use server';

import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { createAnalysisContext } from '@/app/analyze/analysis-context';
import { hydrateAnalysisResultFromHistory } from '@/app/history/analysis-result-hydration';
import { createSprayLabValidationLinkAction } from '@/actions/spray-lab';
import { auth } from '@/auth';
import { enrichAnalysisResultCoaching } from '@/core/analysis-result-coach-enrichment';
import { buildCoachMemorySnapshot, type CoachMemoryHistorySession } from '@/core/coach-memory';
import {
    detectCoachOutcomePrecisionConflict,
    normalizeCoachProtocolOutcomeInput,
    resolveCoachOutcomeEvidence,
} from '@/core/coach-outcomes';
import { buildCoachPlan } from '@/core/coach-plan-builder';
import { resolveMeasurementTruth } from '@/core/measurement-truth';
import { buildPrecisionCompatibilityKey, formatPrecisionTrendLabel, resolvePrecisionTrend } from '@/core/precision-loop';
import {
    buildSprayLabCoachHandoff,
    type SprayLabCoachHandoff,
} from '@/core/spray-lab-coach-handoff';
import {
    applySensitivityHistoryConvergence,
    type HistoricalSensitivitySignal,
} from '@/core/sensitivity-history-convergence';
import { trainingProgramReasonCopy } from '@/core/training-programs';
import { db } from '@/db';
import {
    analysisSessions,
    coachProtocolOutcomes,
    completeTrainingProtocolRevisions,
    playerProfiles,
    precisionCheckpoints,
    precisionEvolutionLines,
    sensitivityHistory,
    sprayLabBenchmarkSnapshots,
    sprayLabSessions,
    sprayLabValidationLinks,
    socialProCollectionItems,
    socialProCollections,
    socialProReportLinks,
    socialProReports,
    trainingProtocolTransferRecords,
    trainingProgramCycles,
    weaponProfiles,
    type CoachProtocolOutcomeRow,
} from '@/db/schema';
import { normalizePatchVersion } from '@/game/pubg';
import { createGroqCoachClient } from '@/server/coach/groq-coach-client';
import {
    recordFirstUsableAnalysis,
    recordQuotaEvent,
    recordUpgradeIntent,
} from '@/lib/product-analytics';
import {
    createPremiumProjectionSummary,
    projectAnalysisForAccess,
} from '@/lib/premium-projection';
import {
    createAnalysisSaveAttemptId,
    createDrizzleQuotaLedgerRepository,
    finalizeAnalysisQuota,
    reserveAnalysisQuota,
    resolveAnalysisSaveAccessWithResolution,
    voidAnalysisQuota,
    type AnalysisQuotaReservation,
} from '@/lib/quota-ledger';
import {
    hasProductEntitlement,
    resolveProductAccess,
    type ProductAccessResolution,
} from '@/lib/product-entitlements';
import { projectTrainingProgramForAccess } from '@/lib/training-program-projection';
import type {
    AnalysisSaveAccessState,
    AnalysisSaveQuotaNotice,
    PremiumFeatureLock,
    ProductQuotaSummary,
} from '@/types/monetization';
import type {
    SocialProPrivateLinkStatus,
    SocialProReportStatus,
    SocialProReportVisibility,
} from '@/types/social-pro';
import type {
    TrainingProgramCheckpointLayer,
    TrainingProgramCycleSnapshot,
    TrainingProgramKind,
    TrainingProgramMissionStatus,
    TrainingProgramReasonCode,
    TrainingProgramState,
} from '@/types/training-programs';
import type {
    AnalysisResult,
    CoachDecisionSnapshot,
    CoachDecisionTier,
    CoachFocusArea,
    CoachProtocolOutcome,
    CoachProtocolOutcomeCoachSnapshot,
    CoachProtocolOutcomeReasonCode,
    CoachProtocolOutcomeStatus,
    CompleteTrainingProtocol,
    PrecisionCheckpointState,
    PrecisionCompatibilityKey,
    PrecisionTrendLabel,
    PrecisionTrendSummary,
    PrecisionVariableInTest,
    ProfileType,
    RecommendationEvidenceTier,
    SensitivityAcceptanceFeedback,
    SensitivityAcceptanceOutcome,
    SensitivityRecommendationTier,
    SprayLabBenchmarkSnapshot,
    SprayLabSessionSnapshot,
    SprayLabValidationLink,
    WeaponLoadout,
} from '@/types/engine';

interface StoredHistoryAttachments {
    readonly muzzle: string;
    readonly grip: string;
    readonly stock: string;
}

interface StoredSensitivityHistorySession {
    readonly id: string;
    readonly createdAt: Date;
    readonly weaponId: string;
    readonly scopeId: string;
    readonly patchVersion: string;
    readonly distance: number;
    readonly stance: string;
    readonly attachments: StoredHistoryAttachments;
    readonly fullResult: Record<string, unknown> | null;
}

interface HistorySprayLabSessionRow {
    readonly baseAnalysisSessionId: string;
    readonly snapshot: SprayLabSessionSnapshot;
    readonly updatedAt: Date;
}

interface HistorySprayLabBenchmarkRow {
    readonly labSessionId: string;
    readonly snapshot: SprayLabBenchmarkSnapshot;
    readonly createdAt: Date;
}

interface HistorySprayLabValidationRow {
    readonly labSessionId: string;
    readonly payload: SprayLabValidationLink;
    readonly updatedAt: Date;
}

interface HistoryTrainingProgramCycleRow {
    readonly baseAnalysisSessionId: string;
    readonly kind: TrainingProgramKind;
    readonly state: TrainingProgramState;
    readonly currentWeekNumber: number;
    readonly reasonCodes: readonly TrainingProgramReasonCode[];
    readonly visibleReason: string;
    readonly blockerSummary: string;
    readonly snapshot: TrainingProgramCycleSnapshot;
    readonly updatedAt: Date;
    readonly archivedAt: Date | null;
    readonly completedAt: Date | null;
}

interface HistorySocialProReportRow {
    readonly id: string;
    readonly sourceAnalysisSessionId: string | null;
    readonly sourceHistorySessionId: string | null;
    readonly title: string;
    readonly visibility: SocialProReportVisibility;
    readonly status: SocialProReportStatus;
    readonly updatedAt: Date;
}

interface HistorySocialProPrivateLinkRow {
    readonly reportId: string;
    readonly id: string;
    readonly status: SocialProPrivateLinkStatus;
    readonly expiresAt: Date | null;
    readonly updatedAt: Date;
}

interface HistorySocialProLibraryRow {
    readonly reportId: string | null;
    readonly collectionId: string;
    readonly collectionLabel: string | null;
    readonly collectionMode: string | null;
    readonly contextKey: string;
    readonly createdAt: Date;
}

export interface PrecisionHistoryCheckpointSummary {
    readonly id: string;
    readonly lineId: string;
    readonly analysisSessionId: string | null;
    readonly state: PrecisionCheckpointState;
    readonly stateLabel: string;
    readonly variableInTest: PrecisionVariableInTest;
    readonly nextValidation: string;
    readonly blockerReasons: readonly string[];
    readonly createdAt: Date;
}

export interface PrecisionHistoryLineSummary {
    readonly id: string;
    readonly compatibilityKey: string;
    readonly contextLabel: string;
    readonly status: PrecisionCheckpointState;
    readonly statusLabel: string;
    readonly variableInTest: PrecisionVariableInTest;
    readonly nextValidation: string;
    readonly validClipCount: number;
    readonly blockedClipCount: number;
    readonly latestTrendLabel: PrecisionTrendLabel | null;
    readonly latestTrendText: string;
    readonly blockerReasons: readonly string[];
    readonly baselineSessionId: string | null;
    readonly currentSessionId: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly checkpoints: readonly PrecisionHistoryCheckpointSummary[];
}

export interface HistorySessionEvidenceSummary {
    readonly actionState: NonNullable<AnalysisResult['mastery']>['actionState'];
    readonly verdictLabel: string;
    readonly confidence: number;
    readonly coverage: number;
    readonly sampleSize: number;
    readonly blockerReasons: readonly string[];
    readonly usableForAnalysis: boolean;
}

export interface HistorySprayLabContinuitySummary {
    readonly sessionId: string;
    readonly contextLabel: string;
    readonly statusLabel: string;
    readonly fidelityLabel: string;
    readonly indexLabel: string;
    readonly validationLabel: string;
    readonly transferLabel: string;
    readonly nextActionLabel: string;
    readonly nextActionHref: string;
    readonly blockerReasons: readonly string[];
}

export interface HistoryTrainingProgramContinuitySummary {
    readonly cycleId: string;
    readonly kindLabel: string;
    readonly cycleLabel: string;
    readonly stateLabel: string;
    readonly strictContextLabel: string;
    readonly weekLabel: string;
    readonly latestMissionLabel: string;
    readonly latestMissionStatusLabel: string;
    readonly latestCheckpointLabel: string;
    readonly latestCheckpointLayerLabel: string;
    readonly reasonLabel: string;
    readonly blockerReasons: readonly string[];
    readonly nextActionLabel: string;
    readonly nextActionHref: string;
    readonly auditHref: string;
    readonly projectionDepth: 'basic_next_step' | 'full_30_day_cycle';
    readonly canSeeProgramAudit: boolean;
    readonly archivedLineCount: number;
    readonly archivedAt: Date | null;
    readonly completedAt: Date | null;
}

export interface HistorySocialProContinuitySummary {
    readonly canGenerateReport: boolean;
    readonly canSaveToLibrary: boolean;
    readonly canManagePrivateLinks: boolean;
    readonly report: {
        readonly id: string;
        readonly title: string;
        readonly visibility: SocialProReportVisibility;
        readonly visibilityLabel: string;
        readonly status: SocialProReportStatus;
        readonly statusLabel: string;
        readonly discoverableInFeed: boolean;
        readonly href: string;
        readonly updatedAt: Date;
    } | null;
    readonly privateLink: {
        readonly id: string;
        readonly status: SocialProPrivateLinkStatus;
        readonly statusLabel: string;
        readonly expiresAt: Date | null;
    } | null;
    readonly library: {
        readonly saved: boolean;
        readonly normalCommunitySaveAllowed: true;
        readonly collectionCount: number;
        readonly collectionLabels: readonly string[];
        readonly visibilityLabel: 'Privada';
        readonly contextKey: string | null;
    };
    readonly reportLock: PremiumFeatureLock | null;
    readonly libraryLock: PremiumFeatureLock | null;
    readonly nextAction: {
        readonly kind: 'generate_report' | 'manage_report' | 'save_to_library' | 'upgrade';
        readonly label: string;
        readonly href: string;
    };
    readonly continuityCopy: string;
}

export interface RecordCoachProtocolOutcomeInput {
    readonly sessionId: string;
    readonly coachPlanId: string;
    readonly protocolId: string;
    readonly focusArea: CoachFocusArea;
    readonly status: CoachProtocolOutcomeStatus;
    readonly reasonCodes?: readonly CoachProtocolOutcomeReasonCode[];
    readonly note?: string;
    readonly revisionOfOutcomeId?: string;
}

export interface RecordCompleteTrainingProtocolRevisionInput {
    readonly sessionId: string;
    readonly coachPlanId: string;
    readonly revisionReason: string;
    readonly changedFields: readonly string[] | Record<string, unknown>;
    readonly revisedProtocol: CompleteTrainingProtocol;
    readonly evidencePayload: Record<string, unknown>;
}

export interface CompleteTrainingProtocolRevisionRecord {
    readonly id: string;
    readonly sessionId: string;
    readonly coachPlanId: string;
    readonly protocolId: string;
    readonly revisionReason: string;
    readonly tierDirection: 'stronger' | 'same' | 'more_conservative';
    readonly changedFields: readonly string[] | Record<string, unknown>;
    readonly previousProtocol: CompleteTrainingProtocol;
    readonly revisedProtocol: CompleteTrainingProtocol;
    readonly evidencePayload: Record<string, unknown>;
    readonly createdAt: string;
}

export interface RecordTrainingProtocolTransferInput {
    readonly sessionId: string;
    readonly protocolId: string;
    readonly situation: string;
    readonly weaponId?: string;
    readonly opticId?: string;
    readonly approximateDistanceMeters?: number;
    readonly pressureLevel: string;
    readonly feltControl: string;
    readonly result: string;
    readonly note?: string;
}

export interface TrainingProtocolTransferRecord {
    readonly id: string;
    readonly sessionId: string;
    readonly protocolId: string;
    readonly situation: string;
    readonly weaponId?: string;
    readonly opticId?: string;
    readonly approximateDistanceMeters?: number;
    readonly pressureLevel: string;
    readonly feltControl: string;
    readonly result: string;
    readonly note?: string;
    readonly countsAsTechnicalValidation: false;
    readonly createdAt: string;
}

type SaveAnalysisResultQuotaCode = 'limit_reached' | 'save_failed';

export interface SaveAnalysisResultMetadata {
    readonly sprayLabValidation?: {
        readonly labSessionId: string;
        readonly validationLinkId?: string | null;
        readonly confirmedVariables: boolean;
    };
}

export type SaveAnalysisResultResult =
    | {
        readonly success: true;
        readonly sessionId: string;
        readonly result: AnalysisResult;
        readonly quota: AnalysisSaveQuotaNotice;
    }
    | {
        readonly success: false;
        readonly error: string;
        readonly code: SaveAnalysisResultQuotaCode;
        readonly result: AnalysisResult;
        readonly quota?: AnalysisSaveQuotaNotice;
    };

function normalizeStoredAttachments(
    value: unknown,
): StoredHistoryAttachments {
    const attachments = value && typeof value === 'object'
        ? value as Partial<StoredHistoryAttachments>
        : {};

    return {
        muzzle: typeof attachments.muzzle === 'string' ? attachments.muzzle : 'none',
        grip: typeof attachments.grip === 'string' ? attachments.grip : 'none',
        stock: typeof attachments.stock === 'string' ? attachments.stock : 'none',
    };
}

function createUnauthenticatedSaveAccessState(): AnalysisSaveAccessState {
    const quota: ProductQuotaSummary = {
        tier: 'free',
        limit: 3,
        used: 0,
        remaining: 0,
        state: 'blocked',
        periodStart: null,
        periodEnd: null,
        warningAt: 2,
        reason: 'entitlement_blocked',
    };

    return {
        authenticated: false,
        canSave: false,
        accessState: 'free',
        billingStatus: 'none',
        quota,
        blocker: 'entitlement_blocked',
        message: 'Entre na conta para salvar analises no historico.',
        ctaHref: null,
    };
}

function quotaStateAfterUsage(quota: ProductQuotaSummary, used: number): ProductQuotaSummary['state'] {
    if (quota.limit <= 0) {
        return 'blocked';
    }

    if (used >= quota.limit) {
        return 'limit_reached';
    }

    if (quota.warningAt !== null && used >= quota.warningAt) {
        return 'warning';
    }

    return 'available';
}

function removeReservedBillableUse(quota: ProductQuotaSummary): ProductQuotaSummary {
    const used = Math.max(0, quota.used - 1);

    return {
        ...quota,
        used,
        remaining: Math.max(0, quota.limit - used),
        state: quotaStateAfterUsage(quota, used),
    };
}

function createQuotaNotice(input: {
    readonly status: AnalysisSaveQuotaNotice['status'];
    readonly analysisSaveAttemptId: string | null;
    readonly quota: ProductQuotaSummary;
    readonly ctaHref?: AnalysisSaveQuotaNotice['ctaHref'];
    readonly message?: string;
}): AnalysisSaveQuotaNotice {
    const usedLabel = `${input.quota.used}/${input.quota.limit}`;
    let message = input.message;

    if (!message) {
        switch (input.status) {
            case 'limit_reached':
                message = input.quota.tier === 'free'
                    ? `Limite Free atingido (${usedLabel}). A analise local continua, mas salvar outro resultado util pede Pro.`
                    : `Limite Pro atingido neste ciclo (${usedLabel}). Salvar outro resultado util fica bloqueado ate o proximo ciclo.`;
                break;
            case 'non_billable':
                message = 'Este resultado foi salvo como evidencia de captura, sem consumir quota, porque a qualidade do clip nao sustenta uma leitura util.';
                break;
            case 'technical_failure':
                message = 'A tentativa de salvar falhou tecnicamente e a reserva de quota foi anulada.';
                break;
            case 'warning':
                message = `Analise salva. Voce esta perto do limite deste periodo (${usedLabel}).`;
                break;
            case 'saved':
                message = `Analise salva. Uso do periodo: ${usedLabel}.`;
                break;
            case 'available':
                message = `Voce ainda pode salvar analises uteis neste periodo (${usedLabel}).`;
                break;
        }
    }

    return {
        status: input.status,
        analysisSaveAttemptId: input.analysisSaveAttemptId,
        quota: input.quota,
        message,
        ctaHref: input.ctaHref ?? null,
    };
}

function withQuotaNotice(result: AnalysisResult, quota: AnalysisSaveQuotaNotice): AnalysisResult {
    return {
        ...result,
        quota,
    };
}

function isNonBillableWeakCapture(result: AnalysisResult): boolean {
    if (result.analysisDecision?.permissionMatrix.countsAsUsefulAnalysis === false) {
        return true;
    }

    const mastery = result.mastery;
    const unusableQuality = result.videoQualityReport?.usableForAnalysis === false
        || mastery?.evidence.usableForAnalysis === false;

    if (!unusableQuality) {
        return false;
    }

    return mastery?.actionState === 'capture_again'
        || mastery?.actionState === 'inconclusive'
        || result.videoQualityReport?.usableForAnalysis === false;
}

async function resolveSaveAccessForUser(userId: string) {
    const repository = createDrizzleQuotaLedgerRepository(db);
    const resolved = await resolveAnalysisSaveAccessWithResolution({
        repository,
        userId,
    });

    return {
        repository,
        ...resolved,
    };
}

async function resolveProductAccessForRead(userId: string): Promise<ProductAccessResolution> {
    try {
        const resolved = await resolveSaveAccessForUser(userId);
        return resolved.access;
    } catch {
        return resolveProductAccess({ userId });
    }
}

export async function getAnalysisSaveAccess(): Promise<AnalysisSaveAccessState> {
    const session = await auth();
    if (!session?.user?.id) {
        return createUnauthenticatedSaveAccessState();
    }

    return (await resolveSaveAccessForUser(session.user.id)).state;
}

function resolveHistoryDistanceTolerance(distanceMeters: number): number {
    if (distanceMeters <= 35) {
        return 10;
    }

    if (distanceMeters <= 80) {
        return 15;
    }

    return 25;
}

function normalizeHistoryEvidenceTier(value: unknown): RecommendationEvidenceTier {
    return value === 'strong' || value === 'moderate' || value === 'weak'
        ? value
        : 'moderate';
}

function normalizeHistoryAcceptanceOutcome(
    value: unknown,
): SensitivityAcceptanceOutcome | undefined {
    return value === 'improved' || value === 'same' || value === 'worse'
        ? value
        : undefined;
}

function normalizeStoredAcceptanceFeedback(
    value: unknown,
): SensitivityAcceptanceFeedback | undefined {
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const feedback = value as Partial<SensitivityAcceptanceFeedback>;
    const outcome = normalizeHistoryAcceptanceOutcome(feedback.outcome);
    const testedProfile = feedback.testedProfile;
    const recordedAt = feedback.recordedAt;

    if (
        outcome === undefined
        || (testedProfile !== 'low' && testedProfile !== 'balanced' && testedProfile !== 'high')
        || typeof recordedAt !== 'string'
    ) {
        return undefined;
    }

    return {
        outcome,
        testedProfile: testedProfile as ProfileType,
        recordedAt,
    };
}

function normalizeHistoryTier(
    value: unknown,
    evidenceTier: RecommendationEvidenceTier,
    confidenceScore: number,
    clipCount: number,
): SensitivityRecommendationTier {
    if (value === 'capture_again' || value === 'test_profiles' || value === 'apply_ready') {
        return value;
    }

    if (evidenceTier === 'weak' || confidenceScore < 0.58) {
        return 'capture_again';
    }

    if (evidenceTier === 'strong' && confidenceScore >= 0.8 && clipCount >= 3) {
        return 'apply_ready';
    }

    return 'test_profiles';
}

function extractHistoricalSensitivitySignal(
    session: StoredSensitivityHistorySession,
): HistoricalSensitivitySignal | null {
    const fullResult = session.fullResult;
    const sensitivity = fullResult?.sensitivity;

    if (!sensitivity || typeof sensitivity !== 'object') {
        return null;
    }

    const storedSensitivity = sensitivity as Record<string, unknown>;
    const recommendedProfile = storedSensitivity.recommended;
    if (recommendedProfile !== 'low' && recommendedProfile !== 'balanced' && recommendedProfile !== 'high') {
        return null;
    }

    const confidenceScore = typeof storedSensitivity.confidenceScore === 'number'
        ? storedSensitivity.confidenceScore
        : 0.5;
    const acceptanceFeedback = normalizeStoredAcceptanceFeedback(storedSensitivity.acceptanceFeedback);
    let evidenceTier = normalizeHistoryEvidenceTier(storedSensitivity.evidenceTier);
    const clipCount = Array.isArray(fullResult?.subSessions)
        ? fullResult.subSessions.length
        : 1;
    let adjustedConfidenceScore = confidenceScore;

    if (acceptanceFeedback?.outcome === 'improved') {
        adjustedConfidenceScore = Math.min(0.98, adjustedConfidenceScore + 0.06);
    } else if (acceptanceFeedback?.outcome === 'same') {
        adjustedConfidenceScore = Math.min(0.96, adjustedConfidenceScore + 0.02);
    } else if (acceptanceFeedback?.outcome === 'worse') {
        adjustedConfidenceScore = Math.max(0.35, adjustedConfidenceScore - 0.3);
        evidenceTier = 'weak';
    }

    let tier = normalizeHistoryTier(storedSensitivity.tier, evidenceTier, adjustedConfidenceScore, clipCount);
    if (acceptanceFeedback?.outcome === 'worse') {
        tier = 'capture_again';
    }

    return {
        sessionId: session.id,
        createdAt: session.createdAt,
        recommendedProfile,
        tier,
        evidenceTier,
        confidenceScore: adjustedConfidenceScore,
        ...(acceptanceFeedback ? { acceptanceOutcome: acceptanceFeedback.outcome } : {}),
    };
}

function enrichResultWithSensitivityHistory(
    result: AnalysisResult,
    distance: number,
    historySessions: readonly StoredSensitivityHistorySession[],
): AnalysisResult {
    const distanceTolerance = resolveHistoryDistanceTolerance(distance);
    const compatibleSignals = historySessions
        .filter((session) => {
            const attachments = normalizeStoredAttachments(session.attachments);

            return session.stance === result.loadout.stance
                && attachments.muzzle === result.loadout.muzzle
                && attachments.grip === result.loadout.grip
                && attachments.stock === result.loadout.stock
                && Math.abs(session.distance - distance) <= distanceTolerance;
        })
        .map(extractHistoricalSensitivitySignal)
        .filter((signal): signal is HistoricalSensitivitySignal => signal !== null);

    if (compatibleSignals.length === 0) {
        return result;
    }

    return {
        ...result,
        sensitivity: applySensitivityHistoryConvergence(result.sensitivity, compatibleSignals),
    };
}

function normalizeStoredPlayerStance(value: string): WeaponLoadout['stance'] | undefined {
    return value === 'standing' || value === 'crouching' || value === 'prone'
        ? value
        : undefined;
}

function toCoachMemoryHistorySession(
    session: StoredSensitivityHistorySession,
): CoachMemoryHistorySession {
    const attachments = normalizeStoredAttachments(session.attachments);
    const stance = normalizeStoredPlayerStance(session.stance);

    return {
        id: session.id,
        createdAt: session.createdAt,
        patchVersion: session.patchVersion,
        distance: session.distance,
        ...(stance ? {
            loadout: {
                stance,
                muzzle: attachments.muzzle,
                grip: attachments.grip,
                stock: attachments.stock,
            } as WeaponLoadout,
        } : {}),
        fullResult: session.fullResult,
    };
}

function withSaveAnalysisContext(
    result: AnalysisResult,
    input: {
        readonly patchVersion: string;
        readonly scopeId: string;
        readonly distance: number;
    },
): AnalysisResult {
    return {
        ...result,
        patchVersion: input.patchVersion,
        analysisContext: result.analysisContext ?? createAnalysisContext({
            patchVersion: input.patchVersion,
            scopeId: input.scopeId,
            distanceMeters: input.distance,
            distanceMode: 'exact',
        }),
    };
}

function toPrecisionHistoryResult(
    session: StoredSensitivityHistorySession,
): AnalysisResult | null {
    if (!session.fullResult) {
        return null;
    }

    try {
        return hydrateAnalysisResultFromHistory({
            fullResult: session.fullResult,
            recordPatchVersion: session.patchVersion,
            scopeId: session.scopeId,
            distanceMeters: session.distance,
        });
    } catch {
        return null;
    }
}

function serializePrecisionCompatibilityKey(key: PrecisionCompatibilityKey): string {
    return JSON.stringify({
        patchVersion: key.patchVersion,
        weaponId: key.weaponId,
        scopeId: key.scopeId,
        opticStateId: key.opticStateId ?? null,
        stance: key.stance,
        muzzle: key.muzzle,
        grip: key.grip,
        stock: key.stock,
        distanceMeters: key.distanceMeters,
        sprayProtocolKey: key.sprayProtocolKey,
        sensitivityProfile: key.sensitivityProfile ?? null,
        sensitivitySignature: key.sensitivitySignature ?? null,
    });
}

function checkpointStateForTrend(label: PrecisionTrendLabel): PrecisionCheckpointState {
    switch (label) {
        case 'baseline':
            return 'baseline_created';
        case 'initial_signal':
            return 'initial_signal';
        case 'in_validation':
            return 'in_validation';
        case 'validated_progress':
            return 'validated_progress';
        case 'validated_regression':
            return 'validated_regression';
        case 'oscillation':
            return 'oscillation';
        case 'not_comparable':
            return 'not_comparable';
        case 'consolidated':
            return 'consolidated';
    }
}

function variableForFocus(area: CoachFocusArea | undefined): PrecisionVariableInTest {
    switch (area) {
        case 'sensitivity':
            return 'sensitivity';
        case 'vertical_control':
            return 'vertical_control';
        case 'horizontal_control':
            return 'horizontal_noise';
        case 'consistency':
            return 'consistency';
        case 'capture_quality':
            return 'capture_quality';
        case 'loadout':
            return 'loadout';
        case 'timing':
        case 'validation':
        case undefined:
            return 'validation';
    }
}

function resolvePrecisionVariableInTest(result: AnalysisResult, trend: PrecisionTrendSummary): PrecisionVariableInTest {
    const blockerCodes = new Set(trend.blockerSummaries.map((summary) => summary.code));

    if (blockerCodes.has('capture_quality_unusable') || blockerCodes.has('capture_quality_weak')) {
        return 'capture_quality';
    }

    if (blockerCodes.has('sensitivity_change')) {
        return 'sensitivity';
    }

    if (
        blockerCodes.has('stance_mismatch')
        || blockerCodes.has('muzzle_mismatch')
        || blockerCodes.has('grip_mismatch')
        || blockerCodes.has('stock_mismatch')
    ) {
        return 'loadout';
    }

    if (trend.label === 'baseline' || trend.label === 'initial_signal' || trend.label === 'not_comparable') {
        return 'validation';
    }

    return variableForFocus(result.coachPlan?.primaryFocus.area);
}

function buildResultIdToSessionIdMap(
    priorSessions: readonly StoredSensitivityHistorySession[],
    current: {
        readonly resultId: string;
        readonly sessionId: string;
    },
): Map<string, string> {
    const map = new Map<string, string>([[current.resultId, current.sessionId]]);

    for (const session of priorSessions) {
        map.set(session.id, session.id);

        const fullResultId = session.fullResult?.id;
        if (typeof fullResultId === 'string') {
            map.set(fullResultId, session.id);
        }
    }

    return map;
}

async function persistPrecisionEvolution(input: {
    readonly userId: string;
    readonly sessionId: string;
    readonly result: AnalysisResult;
    readonly trend: PrecisionTrendSummary;
    readonly priorSessions: readonly StoredSensitivityHistorySession[];
}): Promise<void> {
    const compatibility = buildPrecisionCompatibilityKey(input.result);
    const state = checkpointStateForTrend(input.trend.label);
    const variableInTest = resolvePrecisionVariableInTest(input.result, input.trend);
    const resultIdToSessionId = buildResultIdToSessionIdMap(input.priorSessions, {
        resultId: input.result.id,
        sessionId: input.sessionId,
    });
    const compatibilityKey = compatibility.key
        ? serializePrecisionCompatibilityKey(compatibility.key)
        : `blocked:${input.sessionId}`;
    const baselineSessionId = input.trend.baseline
        ? resultIdToSessionId.get(input.trend.baseline.resultId) ?? null
        : null;
    const blockedClipCount = Math.max(
        input.trend.blockedClips.length,
        input.trend.label === 'not_comparable' ? 1 : 0,
    );
    const payload = {
        trend: input.trend,
        nextValidationHint: input.trend.nextValidationHint,
        blockedClips: input.trend.blockedClips,
        validResultIds: [
            ...(input.trend.recentWindow?.resultIds ?? []),
            input.trend.current?.resultId,
        ].filter((value): value is string => typeof value === 'string'),
        metadata: {
            compatibilityBlocked: !compatibility.compatible,
        },
    };

    const lineRows = await db
        .insert(precisionEvolutionLines)
        .values({
            userId: input.userId,
            compatibilityKey,
            status: state,
            variableInTest,
            baselineSessionId,
            currentSessionId: input.sessionId,
            validClipCount: input.trend.label === 'not_comparable' ? 0 : input.trend.compatibleCount,
            blockedClipCount,
            payload,
        })
        .onConflictDoUpdate({
            target: [
                precisionEvolutionLines.userId,
                precisionEvolutionLines.compatibilityKey,
            ],
            set: {
                status: state,
                variableInTest,
                baselineSessionId,
                currentSessionId: input.sessionId,
                validClipCount: input.trend.label === 'not_comparable' ? 0 : input.trend.compatibleCount,
                blockedClipCount,
                payload,
                updatedAt: new Date(),
            },
        })
        .returning({ id: precisionEvolutionLines.id });

    const lineId = lineRows[0]?.id;
    if (!lineId) {
        return;
    }

    await db.insert(precisionCheckpoints).values({
        lineId,
        analysisSessionId: input.sessionId,
        state,
        variableInTest,
        payload: {
            trend: input.trend,
            nextValidationHint: input.trend.nextValidationHint,
            blockerReasons: input.trend.blockerSummaries,
            metadata: {
                compatibilityKey,
            },
        },
    });
}

function checkpointStateLabel(state: PrecisionCheckpointState): string {
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

function extractPrecisionTrendFromPayload(payload: { readonly trend?: PrecisionTrendSummary } | null | undefined): PrecisionTrendSummary | null {
    return payload?.trend && typeof payload.trend.label === 'string'
        ? payload.trend
        : null;
}

function extractPrecisionBlockerReasons(trend: PrecisionTrendSummary | null): readonly string[] {
    if (!trend) {
        return [];
    }

    return Array.from(new Set([
        ...trend.blockerSummaries.map((summary) => summary.message),
        ...trend.blockedClips.flatMap((clip) => clip.blockers.map((blocker) => blocker.message)),
    ].filter((message) => message.trim().length > 0)));
}

function formatPrecisionContextLabel(compatibilityKey: string): string {
    if (compatibilityKey.startsWith('blocked:')) {
        return 'Clip bloqueado sem linha compativel';
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
        ].filter(Boolean).join(' | ') || 'Contexto de precisao';
    } catch {
        return 'Contexto de precisao';
    }
}

function precisionNextValidation(payload: { readonly nextValidationHint?: string } | null | undefined, trend: PrecisionTrendSummary | null): string {
    return payload?.nextValidationHint
        ?? trend?.nextValidationHint
        ?? 'Gravar validacao compativel mantendo as variaveis fixas.';
}

function resolveCoachOutcomeEvidenceState(
    outcomeMemory: CoachDecisionSnapshot['outcomeMemory'],
): CoachDecisionSnapshot['outcomeEvidenceState'] {
    if (outcomeMemory.conflictCount > 0) {
        return 'conflict';
    }

    if (outcomeMemory.confirmedCount > 0) {
        return 'confirmed_by_compatible_clip';
    }

    if (outcomeMemory.invalidCount > 0) {
        return 'invalid';
    }

    if (outcomeMemory.pendingCount > 0 || outcomeMemory.neutralCount > 0) {
        return 'neutral';
    }

    return 'none';
}

function compactCoachOutcomeMemory(
    outcomeMemory: CoachDecisionSnapshot['outcomeMemory'],
): CoachDecisionSnapshot['outcomeMemory'] {
    const compactLayer = (
        layer: CoachDecisionSnapshot['outcomeMemory']['strictCompatible'],
    ): CoachDecisionSnapshot['outcomeMemory']['strictCompatible'] => ({
        source: layer.source,
        outcomeCount: layer.outcomeCount,
        pendingCount: layer.pendingCount,
        neutralCount: layer.neutralCount,
        weakSelfReportCount: layer.weakSelfReportCount,
        confirmedCount: layer.confirmedCount,
        invalidCount: layer.invalidCount,
        conflictCount: layer.conflictCount,
        repeatedFailureCount: layer.repeatedFailureCount,
        staleOutcomeCount: layer.staleOutcomeCount,
        technicalEvidenceCount: layer.technicalEvidenceCount,
        focusAreas: layer.focusAreas,
        confidence: layer.confidence,
        summary: layer.summary,
    });

    return {
        activeLayer: outcomeMemory.activeLayer,
        strictCompatible: compactLayer(outcomeMemory.strictCompatible),
        globalFallback: compactLayer(outcomeMemory.globalFallback),
        pendingCount: outcomeMemory.pendingCount,
        neutralCount: outcomeMemory.neutralCount,
        confirmedCount: outcomeMemory.confirmedCount,
        invalidCount: outcomeMemory.invalidCount,
        conflictCount: outcomeMemory.conflictCount,
        repeatedFailureCount: outcomeMemory.repeatedFailureCount,
        staleOutcomeCount: outcomeMemory.staleOutcomeCount,
        confidence: outcomeMemory.confidence,
        summary: outcomeMemory.summary,
    };
}

function buildCoachDecisionSnapshot(input: {
    readonly coachPlan: NonNullable<AnalysisResult['coachPlan']>;
    readonly memorySnapshot: ReturnType<typeof buildCoachMemorySnapshot>;
    readonly precisionTrend: PrecisionTrendSummary;
    readonly protocolOutcomes: readonly CoachProtocolOutcome[];
    readonly createdAt: Date;
}): CoachDecisionSnapshot {
    const protocol = input.coachPlan.actionProtocols[0];
    const validationCheck = input.coachPlan.nextBlock.checks[0];
    const conflicts = input.protocolOutcomes
        .map((outcome) => outcome.conflict)
        .filter((conflict): conflict is NonNullable<CoachProtocolOutcome['conflict']> => conflict !== undefined);
    const visiblePriorities = [
        input.coachPlan.primaryFocus,
        ...input.coachPlan.secondaryFocuses,
    ];
    const blockerReasons = Array.from(new Set([
        ...visiblePriorities.flatMap((priority) => priority.blockedBy),
        ...input.memorySnapshot.conflictingFocusAreas.map((area) => `memory_conflict:${area}`),
        ...input.memorySnapshot.signals
            .filter((signal) => (
                signal.key.includes('conflict')
                || signal.key.includes('failure')
                || signal.key.includes('pending')
                || signal.key.includes('invalid_capture')
            ))
            .map((signal) => signal.key),
        ...input.precisionTrend.blockerSummaries.map((summary) => summary.message),
    ].filter((reason) => reason.trim().length > 0)));

    return {
        tier: input.coachPlan.tier,
        primaryFocusArea: input.coachPlan.primaryFocus.area,
        primaryFocusTitle: input.coachPlan.primaryFocus.title,
        secondaryFocusAreas: input.coachPlan.secondaryFocuses.map((focus) => focus.area),
        protocolId: protocol?.id ?? 'validation-block-protocol',
        validationTarget: validationCheck?.target ?? input.precisionTrend.nextValidationHint,
        memorySummary: input.memorySnapshot.summary,
        outcomeMemory: compactCoachOutcomeMemory(input.memorySnapshot.outcomeMemory),
        outcomeEvidenceState: resolveCoachOutcomeEvidenceState(input.memorySnapshot.outcomeMemory),
        conflicts,
        blockerReasons,
        precisionTrendLabel: input.precisionTrend.label,
        createdAt: input.createdAt.toISOString(),
    };
}

export async function saveAnalysisResult(
    result: AnalysisResult,
    weaponId: string,
    scopeId: string,
    distance: number,
    metadata: SaveAnalysisResultMetadata = {},
): Promise<SaveAnalysisResultResult> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Nao autenticado.');
    }

    let enrichedResult = result;
    let quotaReservation: AnalysisQuotaReservation | null = null;
    const {
        repository: quotaRepository,
        access,
        state: saveAccess,
    } = await resolveSaveAccessForUser(session.user.id);
    const analysisSaveAttemptId = createAnalysisSaveAttemptId({
        userId: session.user.id,
        analysisResultId: result.id,
    });
    const initialBillable = !isNonBillableWeakCapture(result);
    const reservationResult = await reserveAnalysisQuota({
        repository: quotaRepository,
        userId: session.user.id,
        access,
        analysisSaveAttemptId,
        billable: initialBillable,
        nonBillableReason: 'non_billable_weak_capture',
        metadata: {
            surface: 'saveAnalysisResult',
            weaponId,
            scopeId,
        },
    });

    if (reservationResult.status === 'blocked') {
        const quota = createQuotaNotice({
            status: 'limit_reached',
            analysisSaveAttemptId,
            quota: reservationResult.quota,
            ctaHref: saveAccess.ctaHref,
        });
        await recordQuotaEvent({
            userId: session.user.id,
            eventType: 'quota.exhausted',
            quotaState: reservationResult.quota.state,
            reasonCode: 'limit_blocked',
            quotaUsed: reservationResult.quota.used,
            quotaLimit: reservationResult.quota.limit,
        });
        await recordUpgradeIntent({
            userId: session.user.id,
            surface: 'analysis_save',
            featureKey: 'analysis.save.pro_limit',
            accessState: access.accessState,
            reasonCode: 'limit_blocked',
        });

        return {
            success: false,
            code: 'limit_reached',
            error: quota.message,
            quota,
            result: projectAnalysisForAccess(withQuotaNotice(enrichedResult, quota), access),
        };
    }

    quotaReservation = reservationResult.reservation;

    try {
        const patchVersion = normalizePatchVersion(result.patchVersion);
        const profile = await db
            .select({ id: playerProfiles.id })
            .from(playerProfiles)
            .where(eq(playerProfiles.userId, session.user.id))
            .limit(1);

        if (!profile[0]) {
            throw new Error('Perfil incompleto.');
        }

        const priorSessions = await db
            .select({
                id: analysisSessions.id,
                createdAt: analysisSessions.createdAt,
                weaponId: analysisSessions.weaponId,
                scopeId: analysisSessions.scopeId,
                patchVersion: analysisSessions.patchVersion,
                distance: analysisSessions.distance,
                stance: analysisSessions.stance,
                attachments: analysisSessions.attachments,
                fullResult: analysisSessions.fullResult,
            })
            .from(analysisSessions)
            .where(eq(analysisSessions.userId, session.user.id))
            .limit(12) as StoredSensitivityHistorySession[];

        const protocolOutcomeRows = await db
            .select()
            .from(coachProtocolOutcomes)
            .where(eq(coachProtocolOutcomes.userId, session.user.id))
            .orderBy(desc(coachProtocolOutcomes.createdAt)) as CoachProtocolOutcomeRow[];
        const protocolOutcomes = protocolOutcomeRows.map(toCoachProtocolOutcome);

        const compatiblePriorSessions = priorSessions.filter((storedSession) => (
            storedSession.fullResult !== null
            && storedSession.patchVersion === patchVersion
            && storedSession.weaponId === weaponId
            && storedSession.scopeId === scopeId
        ));

        const resultWithHistory = enrichResultWithSensitivityHistory(
            withSaveAnalysisContext(result, {
                patchVersion,
                scopeId,
                distance,
            }),
            distance,
            compatiblePriorSessions,
        );
        const coachMemoryHistorySessions = priorSessions.map(toCoachMemoryHistorySession);
        const precisionHistoryResults = priorSessions
            .map(toPrecisionHistoryResult)
            .filter((historyResult): historyResult is AnalysisResult => historyResult !== null);

        const resultWithCoaching = await enrichAnalysisResultCoaching(
            resultWithHistory,
            createGroqCoachClient()
        );
        const initialCoachMemorySnapshot = buildCoachMemorySnapshot({
            currentResult: resultWithCoaching,
            historySessions: coachMemoryHistorySessions,
            protocolOutcomes,
        });
        const initialCoachPlan = buildCoachPlan({
            analysisResult: resultWithCoaching,
            memorySnapshot: initialCoachMemorySnapshot,
        });
        const resultWithTruth = {
            ...resultWithCoaching,
            coachPlan: initialCoachPlan,
            mastery: resolveMeasurementTruth({
                ...resultWithCoaching,
                coachPlan: initialCoachPlan,
            }),
        };
        const precisionTrend = resolvePrecisionTrend({
            current: resultWithTruth,
            history: precisionHistoryResults,
        });
        const resultWithPrecision = {
            ...resultWithTruth,
            precisionTrend,
        };
        const precisionCoachMemorySnapshot = buildCoachMemorySnapshot({
            currentResult: resultWithPrecision,
            historySessions: coachMemoryHistorySessions,
            protocolOutcomes,
        });
        const coachPlan = buildCoachPlan({
            analysisResult: resultWithPrecision,
            memorySnapshot: precisionCoachMemorySnapshot,
        });
        const coachDecisionSnapshot = buildCoachDecisionSnapshot({
            coachPlan,
            memorySnapshot: precisionCoachMemorySnapshot,
            precisionTrend,
            protocolOutcomes,
            createdAt: resultWithPrecision.timestamp,
        });
        enrichedResult = {
            ...resultWithPrecision,
            coachPlan,
            coachDecisionSnapshot,
            mastery: resolveMeasurementTruth({
                ...resultWithPrecision,
                coachPlan,
            }),
        };

        const metrics = enrichedResult.metrics;
        const diagnoses = enrichedResult.diagnoses.map((diagnosis) => diagnosis.type);

        const insertedSession = await db.insert(analysisSessions).values({
            userId: session.user.id,
            weaponId,
            scopeId,
            patchVersion,
            distance,
            stance: enrichedResult.loadout.stance,
            attachments: {
                muzzle: enrichedResult.loadout.muzzle,
                grip: enrichedResult.loadout.grip,
                stock: enrichedResult.loadout.stock,
            },
            stabilityScore: metrics.stabilityScore,
            verticalControl: metrics.verticalControlIndex,
            horizontalNoise: metrics.horizontalNoiseIndex,
            recoilResponseMs: metrics.initialRecoilResponseMs,
            driftBias: metrics.driftDirectionBias,
            consistencyScore: metrics.consistencyScore,
            sprayScore: metrics.sprayScore || 0,
            diagnoses,
            coachingData: enrichedResult.coaching as unknown as Record<string, unknown>[],
            fullResult: {
                ...enrichedResult,
                patchVersion,
                videoQualityReport: enrichedResult.videoQualityReport,
            } as unknown as Record<string, unknown>,
        }).returning({ id: analysisSessions.id });

        const sessionId = insertedSession[0]!.id;

        await persistPrecisionEvolution({
            userId: session.user.id,
            sessionId,
            result: enrichedResult,
            trend: enrichedResult.precisionTrend!,
            priorSessions,
        });

        if (metadata.sprayLabValidation?.labSessionId) {
            try {
                await createSprayLabValidationLinkAction({
                    labSessionId: metadata.sprayLabValidation.labSessionId,
                    validationAnalysisSessionId: sessionId,
                    confirmedVariables: metadata.sprayLabValidation.confirmedVariables,
                });
            } catch (validationError) {
                console.error('[saveAnalysisResult:sprayLabValidation]', validationError);
            }
        }

        const historyRows = enrichedResult.sensitivity.profiles.map((profileItem) => ({
            userId: session.user.id,
            sessionId,
            profileType: profileItem.type,
            generalSens: profileItem.general as number,
            adsSens: profileItem.ads as number,
            scopeSens: Array.isArray(profileItem.scopes)
                ? profileItem.scopes.reduce(
                    (accumulator: Record<string, number>, scope) => ({
                        ...accumulator,
                        [scope.scopeName]: scope.recommended as number,
                    }),
                    {}
                )
                : profileItem.scopes,
            applied: profileItem.type === enrichedResult.sensitivity.recommended,
        }));

        await db.insert(sensitivityHistory).values(historyRows);

        const finalNonBillableWeakCapture = isNonBillableWeakCapture(enrichedResult);
        const quota = finalNonBillableWeakCapture
            ? createQuotaNotice({
                status: 'non_billable',
                analysisSaveAttemptId,
                quota: quotaReservation?.reasonCode === 'billable'
                    ? removeReservedBillableUse(quotaReservation.quota)
                    : reservationResult.quota,
            })
            : createQuotaNotice({
                status: reservationResult.quota.state === 'warning' ? 'warning' : 'saved',
                analysisSaveAttemptId,
                quota: reservationResult.quota,
                ctaHref: reservationResult.quota.state === 'warning' ? saveAccess.ctaHref : null,
            });

        if (quotaReservation) {
            if (finalNonBillableWeakCapture) {
                await voidAnalysisQuota({
                    repository: quotaRepository,
                    reservation: quotaReservation,
                    reasonCode: 'non_billable_weak_capture',
                    analysisSessionId: sessionId,
                    metadata: {
                        analysisSessionId: sessionId,
                        source: 'saveAnalysisResult',
                    },
                });
            } else if (!finalNonBillableWeakCapture && quotaReservation.reasonCode === 'billable') {
                await finalizeAnalysisQuota({
                    repository: quotaRepository,
                    reservation: quotaReservation,
                    analysisSessionId: sessionId,
                    metadata: {
                        source: 'saveAnalysisResult',
                    },
                });
            }
        }

        if (finalNonBillableWeakCapture) {
            await recordQuotaEvent({
                userId: session.user.id,
                eventType: 'quota.consumed',
                quotaState: quota.quota.state,
                reasonCode: 'non_billable_weak_capture',
                quotaUsed: quota.quota.used,
                quotaLimit: quota.quota.limit,
            });
        } else {
            await recordQuotaEvent({
                userId: session.user.id,
                eventType: quota.quota.state === 'warning' ? 'quota.warning' : 'quota.consumed',
                quotaState: quota.quota.state,
                reasonCode: 'billable',
                quotaUsed: quota.quota.used,
                quotaLimit: quota.quota.limit,
            });

            if (priorSessions.length === 0) {
                await recordFirstUsableAnalysis({
                    userId: session.user.id,
                    accessState: access.accessState,
                    quotaState: quota.quota.state,
                });
            }
        }

        const resultWithQuota = withQuotaNotice({
            ...enrichedResult,
            historySessionId: sessionId,
        }, quota);

        return {
            success: true as const,
            sessionId,
            quota,
            result: projectAnalysisForAccess(resultWithQuota, {
                ...access,
                quota: quota.quota,
            }),
        };
    } catch (err) {
        if (quotaReservation?.reasonCode === 'billable') {
            await voidAnalysisQuota({
                repository: quotaRepository,
                reservation: quotaReservation,
                reasonCode: 'technical_failure',
                metadata: {
                    source: 'saveAnalysisResult',
                    message: err instanceof Error ? err.message : 'unknown_save_failure',
                },
            });
        }
        const quota = createQuotaNotice({
            status: 'technical_failure',
            analysisSaveAttemptId,
            quota: quotaReservation?.reasonCode === 'billable'
                ? removeReservedBillableUse(quotaReservation.quota)
                : reservationResult.quota,
        });

        console.error('[saveAnalysisResult] Error:', err);
        return {
            success: false as const,
            code: 'save_failed',
            error: 'Erro ao salvar historico.',
            quota,
            result: projectAnalysisForAccess(withQuotaNotice(enrichedResult, quota), access),
        };
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHistorySprayLabSessionRow(row: unknown): row is HistorySprayLabSessionRow {
    if (!isRecord(row) || !isRecord(row.snapshot)) {
        return false;
    }

    return typeof row.baseAnalysisSessionId === 'string'
        && typeof row.snapshot.id === 'string';
}

function isHistorySprayLabBenchmarkRow(row: unknown): row is HistorySprayLabBenchmarkRow {
    if (!isRecord(row) || !isRecord(row.snapshot)) {
        return false;
    }

    return typeof row.labSessionId === 'string';
}

function isHistorySprayLabValidationRow(row: unknown): row is HistorySprayLabValidationRow {
    if (!isRecord(row) || !isRecord(row.payload)) {
        return false;
    }

    return typeof row.labSessionId === 'string';
}

function isTrainingProgramKind(value: unknown): value is TrainingProgramKind {
    return value === 'ciclo_pro' || value === 'ciclo_reparo';
}

function isTrainingProgramState(value: unknown): value is TrainingProgramState {
    return value === 'preparando'
        || value === 'ativo'
        || value === 'reparando'
        || value === 'consolidando'
        || value === 'validacao_pendente'
        || value === 'progresso_validado'
        || value === 'sem_mudanca_clara'
        || value === 'regressao_validada'
        || value === 'inconclusivo'
        || value === 'linha_reiniciada'
        || value === 'concluido'
        || value === 'pausado'
        || value === 'contexto_desatualizado';
}

function isTrainingProgramReasonCode(value: unknown): value is TrainingProgramReasonCode {
    return value === 'fidelity_dropped'
        || value === 'validation_inconclusive'
        || value === 'variable_changed'
        || value === 'outcome_conflict'
        || value === 'fatigue_reduced_dose'
        || value === 'discomfort_stop'
        || value === 'stale_context'
        || value === 'compatible_proof_missing'
        || value === 'blocker_repaired'
        || value === 'missed_day_reentry'
        || value === 'line_restart'
        || value === 'missing_saved_analysis'
        || value === 'missing_context'
        || value === 'missing_protocol'
        || value === 'weak_base_evidence'
        || value === 'low_coverage'
        || value === 'low_confidence'
        || value === 'confusion_simplified'
        || value === 'repeated_failure_consolidation';
}

function isHistoryTrainingProgramCycleSnapshot(value: unknown): value is TrainingProgramCycleSnapshot {
    if (!isRecord(value)) {
        return false;
    }

    return value.version === 'ciclo-pro-v1'
        && typeof value.id === 'string'
        && isTrainingProgramKind(value.kind)
        && isTrainingProgramState(value.state)
        && typeof value.label === 'string'
        && typeof value.strictContextLabel === 'string'
        && Array.isArray(value.weeks)
        && Array.isArray(value.checkpoints)
        && Array.isArray(value.transitionEvents)
        && typeof value.currentWeekNumber === 'number';
}

function isHistoryTrainingProgramCycleRow(row: unknown): row is HistoryTrainingProgramCycleRow {
    if (!isRecord(row) || !isHistoryTrainingProgramCycleSnapshot(row.snapshot)) {
        return false;
    }

    return typeof row.baseAnalysisSessionId === 'string'
        && isTrainingProgramKind(row.kind)
        && isTrainingProgramState(row.state)
        && typeof row.currentWeekNumber === 'number'
        && Array.isArray(row.reasonCodes)
        && row.reasonCodes.every(isTrainingProgramReasonCode)
        && typeof row.visibleReason === 'string'
        && typeof row.blockerSummary === 'string'
        && row.updatedAt instanceof Date
        && (row.archivedAt === null || row.archivedAt instanceof Date)
        && (row.completedAt === null || row.completedAt instanceof Date);
}

function readString(value: Record<string, unknown> | undefined, key: string): string | undefined {
    const property = value?.[key];
    return typeof property === 'string' && property.trim().length > 0
        ? property.trim()
        : undefined;
}

function readFiniteNumber(value: Record<string, unknown> | undefined, key: string): number | undefined {
    const property = value?.[key];
    return typeof property === 'number' && Number.isFinite(property)
        ? property
        : undefined;
}

function isHistorySprayActionState(value: unknown): value is HistorySessionEvidenceSummary['actionState'] {
    return value === 'capture_again'
        || value === 'inconclusive'
        || value === 'testable'
        || value === 'ready';
}

function buildHistorySessionEvidenceSummary(
    fullResult: Record<string, unknown> | null,
): HistorySessionEvidenceSummary | undefined {
    const mastery = isRecord(fullResult?.mastery) ? fullResult.mastery : undefined;
    const evidence = isRecord(mastery?.evidence) ? mastery.evidence : undefined;
    const actionState = mastery?.actionState;

    if (!mastery || !evidence || !isHistorySprayActionState(actionState)) {
        return undefined;
    }

    const confidence = readFiniteNumber(evidence, 'confidence');
    const coverage = readFiniteNumber(evidence, 'coverage');
    const sampleSize = readFiniteNumber(evidence, 'sampleSize') ?? 0;

    if (confidence === undefined || coverage === undefined) {
        return undefined;
    }

    const blockedRecommendations = Array.isArray(mastery.blockedRecommendations)
        ? mastery.blockedRecommendations.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];

    return {
        actionState,
        verdictLabel: readString(mastery, 'actionLabel') ?? actionState,
        confidence,
        coverage,
        sampleSize,
        blockerReasons: Array.from(new Set(blockedRecommendations)),
        usableForAnalysis: evidence.usableForAnalysis !== false,
    };
}

function isCoachDecisionTier(value: unknown): value is CoachProtocolOutcomeCoachSnapshot['tier'] {
    return value === 'capture_again'
        || value === 'test_protocol'
        || value === 'stabilize_block'
        || value === 'apply_protocol';
}

function isStoredPrecisionTrendLabel(value: unknown): value is PrecisionTrendLabel {
    return value === 'baseline'
        || value === 'initial_signal'
        || value === 'in_validation'
        || value === 'validated_progress'
        || value === 'validated_regression'
        || value === 'oscillation'
        || value === 'not_comparable'
        || value === 'consolidated';
}

function readPrecisionTrendForOutcome(
    fullResult: Record<string, unknown>,
): Pick<PrecisionTrendSummary, 'label' | 'evidenceLevel' | 'nextValidationHint'> | null {
    const trend = fullResult.precisionTrend;

    if (!isRecord(trend) || !isStoredPrecisionTrendLabel(trend.label)) {
        return null;
    }

    return {
        label: trend.label,
        evidenceLevel: typeof trend.evidenceLevel === 'string'
            ? trend.evidenceLevel as PrecisionTrendSummary['evidenceLevel']
            : 'blocked',
        nextValidationHint: typeof trend.nextValidationHint === 'string'
            ? trend.nextValidationHint
            : 'Grave uma validacao compativel antes de avancar.',
    };
}

function buildCoachOutcomeCoachSnapshot(
    fullResult: Record<string, unknown>,
    input: {
        readonly protocolId: string;
        readonly focusArea: CoachFocusArea;
    },
): { readonly ok: true; readonly value: CoachProtocolOutcomeCoachSnapshot } | { readonly ok: false; readonly error: string } {
    const coachPlan = isRecord(fullResult.coachPlan) ? fullResult.coachPlan : undefined;
    const primaryFocus = isRecord(coachPlan?.primaryFocus) ? coachPlan.primaryFocus : undefined;
    const nextBlock = isRecord(coachPlan?.nextBlock) ? coachPlan.nextBlock : undefined;
    const completeProtocol = isRecord(coachPlan?.completeProtocol) ? coachPlan.completeProtocol : undefined;
    const protocols = Array.isArray(coachPlan?.actionProtocols)
        ? coachPlan.actionProtocols.filter(isRecord)
        : [];
    const protocol = protocols.find((candidate) => candidate.id === input.protocolId);
    const completeProtocolMatches = completeProtocol?.id === input.protocolId;
    const tier = coachPlan?.tier;
    const primaryFocusArea = primaryFocus?.area;
    const primaryFocusTitle = readString(primaryFocus, 'title');

    if (!coachPlan || !isCoachDecisionTier(tier)) {
        return { ok: false, error: 'Sessao sem plano de coach valido.' };
    }

    if (primaryFocusArea !== input.focusArea) {
        return { ok: false, error: 'O foco informado nao corresponde ao foco principal salvo.' };
    }

    if (!protocol && !completeProtocolMatches) {
        return { ok: false, error: 'Protocolo nao encontrado no plano salvo.' };
    }

    const validationCheck = Array.isArray(nextBlock?.checks)
        ? nextBlock.checks.find(isRecord)
        : undefined;
    const completeValidation = isRecord(completeProtocol?.validation) ? completeProtocol.validation : undefined;
    const completeSuccessCriteria = Array.isArray(completeValidation?.successCriteria)
        ? completeValidation.successCriteria.find((criterion) => typeof criterion === 'string')
        : undefined;
    const precisionTrend = readPrecisionTrendForOutcome(fullResult);
    const validationTarget = readString(validationCheck, 'target')
        ?? precisionTrend?.nextValidationHint
        ?? (typeof completeSuccessCriteria === 'string' ? completeSuccessCriteria : undefined)
        ?? readString(protocol, 'applyWhen')
        ?? 'Gravar validacao compativel mantendo o contexto controlado.';

    return {
        ok: true,
        value: {
            tier,
            primaryFocusArea: input.focusArea,
            primaryFocusTitle: primaryFocusTitle ?? input.focusArea,
            protocolId: input.protocolId,
            validationTarget,
            ...(precisionTrend ? { precisionTrendLabel: precisionTrend.label } : {}),
        },
    };
}

function toCoachProtocolOutcome(row: CoachProtocolOutcomeRow): CoachProtocolOutcome {
    const conflictPayload = row.conflictPayload ?? undefined;
    const coachSnapshot = row.payload.coachSnapshot;

    return {
        id: row.id,
        sessionId: row.analysisSessionId,
        coachPlanId: row.coachPlanId,
        protocolId: row.protocolId,
        focusArea: row.focusArea,
        status: row.status,
        reasonCodes: row.reasonCodes,
        ...(row.note ? { note: row.note } : {}),
        recordedAt: row.createdAt.toISOString(),
        ...(row.revisionOfId ? { revisionOfOutcomeId: row.revisionOfId } : {}),
        evidenceStrength: row.evidenceStrength,
        ...(conflictPayload ? { conflict: conflictPayload } : {}),
        ...(coachSnapshot ? { coachSnapshot } : {}),
    };
}

function isCompleteTrainingProtocol(value: unknown): value is CompleteTrainingProtocol {
    if (!isRecord(value)) {
        return false;
    }

    return value.version === 'complete-protocol-v1'
        && typeof value.id === 'string'
        && isCoachDecisionTier(value.tier)
        && typeof value.title === 'string'
        && isRecord(value.context)
        && isRecord(value.dose)
        && Array.isArray(value.executionSteps)
        && Array.isArray(value.preparation)
        && isRecord(value.validation)
        && isRecord(value.transfer)
        && isRecord(value.downgrade)
        && isRecord(value.audit);
}

const TRAINING_PROTOCOL_TIER_ORDER: Record<CoachDecisionTier, number> = {
    capture_again: 0,
    test_protocol: 1,
    stabilize_block: 2,
    apply_protocol: 3,
};

function resolveProtocolTierDirection(
    previous: CoachDecisionTier,
    revised: CoachDecisionTier,
): CompleteTrainingProtocolRevisionRecord['tierDirection'] {
    const previousRank = TRAINING_PROTOCOL_TIER_ORDER[previous];
    const revisedRank = TRAINING_PROTOCOL_TIER_ORDER[revised];

    if (revisedRank > previousRank) {
        return 'stronger';
    }

    if (revisedRank < previousRank) {
        return 'more_conservative';
    }

    return 'same';
}

function normalizeActionText(
    value: unknown,
    field: string,
    maxLength = 160,
): { readonly ok: true; readonly value: string } | { readonly ok: false; readonly error: string } {
    if (typeof value !== 'string') {
        return { ok: false, error: `${field} precisa ser texto.` };
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
        return { ok: false, error: `${field} e obrigatorio.` };
    }

    if (trimmed.length > maxLength) {
        return { ok: false, error: `${field} deve ter no maximo ${maxLength} caracteres.` };
    }

    return { ok: true, value: trimmed };
}

function normalizeOptionalActionText(value: unknown, field: string, maxLength = 300): string | { readonly error: string } | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    const normalized = normalizeActionText(value, field, maxLength);
    return normalized.ok ? normalized.value : { error: normalized.error };
}

export async function recordCompleteTrainingProtocolRevision(
    input: RecordCompleteTrainingProtocolRevisionInput,
) {
    const session = await auth();
    if (!session?.user?.id) {
        return {
            success: false as const,
            error: 'Nao autenticado.',
        };
    }

    const reason = normalizeActionText(input.revisionReason, 'revisionReason', 240);
    if (!reason.ok) {
        return { success: false as const, error: reason.error };
    }

    if (!isCompleteTrainingProtocol(input.revisedProtocol)) {
        return {
            success: false as const,
            error: 'Protocolo revisado invalido.',
        };
    }

    try {
        const [storedSession] = await db
            .select({
                id: analysisSessions.id,
                fullResult: analysisSessions.fullResult,
            })
            .from(analysisSessions)
            .where(
                and(
                    eq(analysisSessions.id, input.sessionId),
                    eq(analysisSessions.userId, session.user.id),
                ),
            )
            .limit(1);

        if (!storedSession) {
            return {
                success: false as const,
                error: 'Sessao nao encontrada.',
            };
        }

        const fullResult = isRecord(storedSession.fullResult) ? storedSession.fullResult : {};
        const coachPlan = isRecord(fullResult.coachPlan) ? fullResult.coachPlan : undefined;
        const previousProtocol = isCompleteTrainingProtocol(coachPlan?.completeProtocol)
            ? coachPlan.completeProtocol
            : undefined;

        if (!previousProtocol) {
            return {
                success: false as const,
                error: 'Sessao sem protocolo completo salvo.',
            };
        }

        if (input.revisedProtocol.version !== 'complete-protocol-v1') {
            return {
                success: false as const,
                error: 'Versao do protocolo revisado nao suportada.',
            };
        }

        if (input.revisedProtocol.id !== previousProtocol.id) {
            return {
                success: false as const,
                error: 'Revisao precisa preservar o mesmo protocolo base.',
            };
        }

        const revisionId = randomUUID();
        const createdAt = new Date();
        const tierDirection = resolveProtocolTierDirection(previousProtocol.tier, input.revisedProtocol.tier);

        await db.insert(completeTrainingProtocolRevisions).values({
            id: revisionId,
            userId: session.user.id,
            analysisSessionId: input.sessionId,
            coachPlanId: input.coachPlanId,
            protocolId: previousProtocol.id,
            revisionReason: reason.value,
            tierDirection,
            changedFields: input.changedFields,
            previousProtocol,
            revisedProtocol: input.revisedProtocol,
            evidencePayload: input.evidencePayload,
            createdAt,
        });

        revalidatePath('/history');
        revalidatePath(`/history/${input.sessionId}`);
        revalidatePath('/dashboard');

        return {
            success: true as const,
            revision: {
                id: revisionId,
                sessionId: input.sessionId,
                coachPlanId: input.coachPlanId,
                protocolId: previousProtocol.id,
                revisionReason: reason.value,
                tierDirection,
                changedFields: input.changedFields,
                previousProtocol,
                revisedProtocol: input.revisedProtocol,
                evidencePayload: input.evidencePayload,
                createdAt: createdAt.toISOString(),
            } satisfies CompleteTrainingProtocolRevisionRecord,
        };
    } catch (err) {
        console.error('[recordCompleteTrainingProtocolRevision] Error:', err);
        return {
            success: false as const,
            error: 'Nao foi possivel registrar a revisao.',
        };
    }
}

export async function recordTrainingProtocolTransfer(
    input: RecordTrainingProtocolTransferInput,
) {
    const session = await auth();
    if (!session?.user?.id) {
        return {
            success: false as const,
            error: 'Nao autenticado.',
        };
    }

    const situation = normalizeActionText(input.situation, 'situation');
    const pressureLevel = normalizeActionText(input.pressureLevel, 'pressureLevel');
    const feltControl = normalizeActionText(input.feltControl, 'feltControl');
    const result = normalizeActionText(input.result, 'result');
    const note = normalizeOptionalActionText(input.note, 'note');

    if (!situation.ok) {
        return { success: false as const, error: situation.error };
    }

    if (!pressureLevel.ok) {
        return { success: false as const, error: pressureLevel.error };
    }

    if (!feltControl.ok) {
        return { success: false as const, error: feltControl.error };
    }

    if (!result.ok) {
        return { success: false as const, error: result.error };
    }

    if (typeof note === 'object' && note !== null) {
        return { success: false as const, error: note.error };
    }

    if (
        input.approximateDistanceMeters !== undefined
        && (!Number.isInteger(input.approximateDistanceMeters) || input.approximateDistanceMeters < 0)
    ) {
        return {
            success: false as const,
            error: 'approximateDistanceMeters precisa ser inteiro positivo.',
        };
    }

    try {
        const [storedSession] = await db
            .select({ id: analysisSessions.id })
            .from(analysisSessions)
            .where(
                and(
                    eq(analysisSessions.id, input.sessionId),
                    eq(analysisSessions.userId, session.user.id),
                ),
            )
            .limit(1);

        if (!storedSession) {
            return {
                success: false as const,
                error: 'Sessao nao encontrada.',
            };
        }

        const transferId = randomUUID();
        const createdAt = new Date();

        await db.insert(trainingProtocolTransferRecords).values({
            id: transferId,
            userId: session.user.id,
            analysisSessionId: input.sessionId,
            protocolId: input.protocolId,
            situation: situation.value,
            ...(input.weaponId ? { weaponId: input.weaponId } : {}),
            ...(input.opticId ? { opticId: input.opticId } : {}),
            ...(input.approximateDistanceMeters !== undefined ? {
                approximateDistanceMeters: input.approximateDistanceMeters,
            } : {}),
            pressureLevel: pressureLevel.value,
            feltControl: feltControl.value,
            result: result.value,
            ...(typeof note === 'string' ? { note } : {}),
            countsAsTechnicalValidation: false,
            createdAt,
        });

        revalidatePath('/history');
        revalidatePath(`/history/${input.sessionId}`);
        revalidatePath('/dashboard');

        return {
            success: true as const,
            transfer: {
                id: transferId,
                sessionId: input.sessionId,
                protocolId: input.protocolId,
                situation: situation.value,
                ...(input.weaponId ? { weaponId: input.weaponId } : {}),
                ...(input.opticId ? { opticId: input.opticId } : {}),
                ...(input.approximateDistanceMeters !== undefined ? {
                    approximateDistanceMeters: input.approximateDistanceMeters,
                } : {}),
                pressureLevel: pressureLevel.value,
                feltControl: feltControl.value,
                result: result.value,
                ...(typeof note === 'string' ? { note } : {}),
                countsAsTechnicalValidation: false,
                createdAt: createdAt.toISOString(),
            } satisfies TrainingProtocolTransferRecord,
        };
    } catch (err) {
        console.error('[recordTrainingProtocolTransfer] Error:', err);
        return {
            success: false as const,
            error: 'Nao foi possivel registrar a transferencia.',
        };
    }
}

export async function recordCoachProtocolOutcome(
    input: RecordCoachProtocolOutcomeInput,
) {
    const session = await auth();
    if (!session?.user?.id) {
        return {
            success: false as const,
            error: 'Nao autenticado.',
        };
    }

    const normalized = normalizeCoachProtocolOutcomeInput({
        sessionId: input.sessionId,
        coachPlanId: input.coachPlanId,
        protocolId: input.protocolId,
        focusArea: input.focusArea,
        status: input.status,
        reasonCodes: input.reasonCodes,
        note: input.note,
        revisionOfOutcomeId: input.revisionOfOutcomeId,
    });

    if (!normalized.ok) {
        return {
            success: false as const,
            error: normalized.errors[0] ?? 'Resultado do protocolo invalido.',
        };
    }

    try {
        const [storedSession] = await db
            .select({
                id: analysisSessions.id,
                fullResult: analysisSessions.fullResult,
            })
            .from(analysisSessions)
            .where(
                and(
                    eq(analysisSessions.id, normalized.value.sessionId),
                    eq(analysisSessions.userId, session.user.id),
                ),
            )
            .limit(1);

        if (!storedSession) {
            return {
                success: false as const,
                error: 'Sessao nao encontrada.',
            };
        }

        if (normalized.value.revisionOfOutcomeId) {
            const [previousOutcome] = await db
                .select({ id: coachProtocolOutcomes.id })
                .from(coachProtocolOutcomes)
                .where(
                    and(
                        eq(coachProtocolOutcomes.id, normalized.value.revisionOfOutcomeId),
                        eq(coachProtocolOutcomes.userId, session.user.id),
                        eq(coachProtocolOutcomes.analysisSessionId, normalized.value.sessionId),
                    ),
                )
                .limit(1);

            if (!previousOutcome) {
                return {
                    success: false as const,
                    error: 'Resultado original nao encontrado para revisao.',
                };
            }
        }

        const fullResult = isRecord(storedSession.fullResult)
            ? storedSession.fullResult
            : {};
        const coachSnapshot = buildCoachOutcomeCoachSnapshot(fullResult, normalized.value);

        if (!coachSnapshot.ok) {
            return {
                success: false as const,
                error: coachSnapshot.error,
            };
        }

        const outcomeId = randomUUID();
        const recordedAt = new Date();
        const precisionTrend = readPrecisionTrendForOutcome(fullResult);
        const conflict = detectCoachOutcomePrecisionConflict({
            outcomeId,
            status: normalized.value.status,
            precisionTrend,
        });
        const evidence = resolveCoachOutcomeEvidence({
            status: normalized.value.status,
            reasonCodes: normalized.value.reasonCodes,
            precisionTrend,
        });
        const evidenceStrength = conflict ? 'conflict' : evidence.evidenceStrength;
        const payload = {
            coachSnapshot: coachSnapshot.value,
            ...(precisionTrend ? { precisionTrendLabel: precisionTrend.label } : {}),
            validationTarget: coachSnapshot.value.validationTarget,
            recordedBy: 'user' as const,
            metadata: {
                countsAsTechnicalEvidence: evidence.countsAsTechnicalEvidence,
                pendingClosure: evidence.pendingClosure,
                needsCompatibleValidation: conflict ? true : evidence.needsCompatibleValidation,
                invalidBecauseOfExecutionOrCapture: evidence.invalidBecauseOfExecutionOrCapture,
            },
        };

        await db.insert(coachProtocolOutcomes).values({
            id: outcomeId,
            userId: session.user.id,
            analysisSessionId: normalized.value.sessionId,
            coachPlanId: normalized.value.coachPlanId,
            protocolId: normalized.value.protocolId,
            focusArea: normalized.value.focusArea,
            status: normalized.value.status,
            reasonCodes: normalized.value.reasonCodes,
            ...(normalized.value.note ? { note: normalized.value.note } : {}),
            ...(normalized.value.revisionOfOutcomeId ? { revisionOfId: normalized.value.revisionOfOutcomeId } : {}),
            evidenceStrength,
            ...(conflict ? { conflictPayload: conflict } : {}),
            payload,
            createdAt: recordedAt,
            updatedAt: recordedAt,
        });

        revalidatePath('/history');
        revalidatePath(`/history/${normalized.value.sessionId}`);
        revalidatePath('/dashboard');

        const outcome: CoachProtocolOutcome = {
            id: outcomeId,
            sessionId: normalized.value.sessionId,
            coachPlanId: normalized.value.coachPlanId,
            protocolId: normalized.value.protocolId,
            focusArea: normalized.value.focusArea,
            status: normalized.value.status,
            reasonCodes: normalized.value.reasonCodes,
            ...(normalized.value.note ? { note: normalized.value.note } : {}),
            recordedAt: recordedAt.toISOString(),
            ...(normalized.value.revisionOfOutcomeId ? { revisionOfOutcomeId: normalized.value.revisionOfOutcomeId } : {}),
            evidenceStrength,
            ...(conflict ? { conflict } : {}),
            coachSnapshot: coachSnapshot.value,
        };

        return {
            success: true as const,
            outcome,
        };
    } catch (err) {
        console.error('[recordCoachProtocolOutcome] Error:', err);
        return {
            success: false as const,
            error: 'Nao foi possivel registrar o resultado.',
        };
    }
}

export async function getCoachProtocolOutcomesForSession(
    sessionId: string,
): Promise<readonly CoachProtocolOutcome[]> {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    try {
        const [storedSession] = await db
            .select({ id: analysisSessions.id })
            .from(analysisSessions)
            .where(
                and(
                    eq(analysisSessions.id, sessionId),
                    eq(analysisSessions.userId, session.user.id),
                ),
            )
            .limit(1);

        if (!storedSession) {
            return [];
        }

        const rows = await db
            .select()
            .from(coachProtocolOutcomes)
            .where(
                and(
                    eq(coachProtocolOutcomes.analysisSessionId, sessionId),
                    eq(coachProtocolOutcomes.userId, session.user.id),
                ),
            )
            .orderBy(coachProtocolOutcomes.createdAt);

        return rows.map(toCoachProtocolOutcome);
    } catch (err) {
        console.error('[getCoachProtocolOutcomesForSession] Error:', err);
        return [];
    }
}

export async function recordSensitivityAcceptance(
    sessionId: string,
    outcome: SensitivityAcceptanceOutcome,
) {
    const session = await auth();
    if (!session?.user?.id) {
        return {
            success: false as const,
            error: 'Nao autenticado.',
        };
    }

    try {
        const [storedSession] = await db
            .select({
                id: analysisSessions.id,
                fullResult: analysisSessions.fullResult,
            })
            .from(analysisSessions)
            .where(
                and(
                    eq(analysisSessions.id, sessionId),
                    eq(analysisSessions.userId, session.user.id),
                ),
            )
            .limit(1);

        if (!storedSession) {
            return {
                success: false as const,
                error: 'Sessao nao encontrada.',
            };
        }

        const fullResult: Record<string, unknown> = storedSession.fullResult && typeof storedSession.fullResult === 'object'
            ? storedSession.fullResult
            : {};
        const sensitivity = fullResult.sensitivity;

        if (!sensitivity || typeof sensitivity !== 'object') {
            return {
                success: false as const,
                error: 'Sessao sem recomendacao de sens.',
            };
        }

        const storedSensitivity = sensitivity as Record<string, unknown>;
        const testedProfile = storedSensitivity.recommended;

        if (testedProfile !== 'low' && testedProfile !== 'balanced' && testedProfile !== 'high') {
            return {
                success: false as const,
                error: 'Perfil de sensibilidade invalido no historico.',
            };
        }

        const acceptanceFeedback: SensitivityAcceptanceFeedback = {
            outcome,
            testedProfile,
            recordedAt: new Date().toISOString(),
        };

        await db.update(analysisSessions)
            .set({
                fullResult: {
                    ...fullResult,
                    sensitivity: {
                        ...storedSensitivity,
                        acceptanceFeedback,
                    },
                },
            })
            .where(
                and(
                    eq(analysisSessions.id, sessionId),
                    eq(analysisSessions.userId, session.user.id),
                ),
            );

        await db.update(sensitivityHistory)
            .set({ applied: false })
            .where(eq(sensitivityHistory.sessionId, sessionId));

        await db.update(sensitivityHistory)
            .set({ applied: true })
            .where(
                and(
                    eq(sensitivityHistory.sessionId, sessionId),
                    eq(sensitivityHistory.profileType, testedProfile),
                ),
            );

        revalidatePath('/history');
        revalidatePath(`/history/${sessionId}`);

        return {
            success: true as const,
            acceptanceFeedback,
        };
    } catch (err) {
        console.error('[recordSensitivityAcceptance] Error:', err);
        return {
            success: false as const,
            error: 'Erro ao salvar o resultado do teste da sens.',
        };
    }
}

function formatCoachOutcomeStatusLabel(status: CoachProtocolOutcomeStatus): string {
    switch (status) {
        case 'started':
            return 'Bloco iniciado';
        case 'completed':
            return 'Completou sem medir';
        case 'improved':
            return 'Melhorou - relato';
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

function buildHistoryProtocolContinuity(fullResult: Record<string, unknown> | null) {
    const coachPlan = isRecord(fullResult?.coachPlan) ? fullResult.coachPlan : undefined;
    const protocol = isCompleteTrainingProtocol(coachPlan?.completeProtocol)
        ? coachPlan.completeProtocol
        : null;

    if (!protocol) {
        return undefined;
    }

    return {
        title: protocol.title,
        durationLabel: `${protocol.dose.durationMinutes} min`,
        tier: protocol.tier,
        protocolLabel: 'Protocolo salvo',
        validationLabel: 'Validacao compativel',
        transferLabel: 'Transferencia em partida/TDM',
    };
}

function formatHistorySprayLabStatus(status: SprayLabCoachHandoff['status']): string {
    switch (status) {
        case 'draft':
            return 'Lab em preparo';
        case 'active':
            return 'Lab em execucao';
        case 'paused':
            return 'Lab pausado';
        case 'completed':
            return 'Lab concluido';
        case 'abandoned':
            return 'Lab abandonado';
        case 'blocked':
            return 'Lab em reparo';
    }
}

function formatHistorySprayLabIndex(handoff: SprayLabCoachHandoff): string {
    if (handoff.validatedScore !== null) {
        return `validado ${handoff.validatedScore}/100`;
    }

    if (handoff.provisionalScore !== null) {
        return `provisorio ${handoff.provisionalScore}/100`;
    }

    return 'indice pendente';
}

function formatHistorySprayLabFidelityTier(tier: NonNullable<SprayLabCoachHandoff['fidelityTier']>): string {
    switch (tier) {
        case 'strong':
            return 'forte';
        case 'usable':
            return 'util';
        case 'practice_only':
            return 'pratica';
        case 'invalid_for_benchmark':
            return 'fora do benchmark';
    }
}

function formatHistorySprayLabEvidenceLevel(level: SprayLabCoachHandoff['evidenceLevel']): string {
    switch (level) {
        case 'validated_benchmark':
            return 'benchmark validado';
        case 'provisional_benchmark':
            return 'benchmark provisorio';
        case 'weak_execution':
            return 'execucao fraca';
        case 'practice':
            return 'pratica';
    }
}

function toHistorySprayLabContinuity(
    handoff: SprayLabCoachHandoff | null,
): HistorySprayLabContinuitySummary | undefined {
    if (!handoff) {
        return undefined;
    }

    return {
        sessionId: handoff.labSessionId,
        contextLabel: handoff.contextLabel,
        statusLabel: formatHistorySprayLabStatus(handoff.status),
        fidelityLabel: handoff.fidelityTier
            ? `${formatHistorySprayLabFidelityTier(handoff.fidelityTier)} / ${formatHistorySprayLabEvidenceLevel(handoff.evidenceLevel)}`
            : formatHistorySprayLabEvidenceLevel(handoff.evidenceLevel),
        indexLabel: formatHistorySprayLabIndex(handoff),
        validationLabel: handoff.compatibleClipProof.label,
        transferLabel: handoff.practicalTransfer.label,
        nextActionLabel: handoff.nextAction.label,
        nextActionHref: handoff.nextAction.href,
        blockerReasons: handoff.blockerReasons,
    };
}

function formatTrainingProgramKindLabel(kind: TrainingProgramKind): string {
    switch (kind) {
        case 'ciclo_pro':
            return 'Ciclo Pro';
        case 'ciclo_reparo':
            return 'Ciclo Reparo';
    }
}

function formatTrainingProgramStateLabel(state: TrainingProgramState): string {
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

function formatTrainingProgramMissionStatusLabel(status: TrainingProgramMissionStatus): string {
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

function formatTrainingProgramCheckpointLayerLabel(layer: TrainingProgramCheckpointLayer): string {
    switch (layer) {
        case 'weekly_operational':
            return 'Checkpoint semanal operacional';
        case 'technical_validated':
            return 'Checkpoint tecnico validado';
        case 'monthly_program':
            return 'Checkpoint mensal do ciclo';
    }
}

function latestTrainingProgramMission(cycle: TrainingProgramCycleSnapshot) {
    const missions = cycle.weeks.flatMap((week) => week.missions);

    return missions.find((mission) => mission.id === cycle.currentMissionId)
        ?? [...missions].reverse().find((mission) => mission.status === 'completed')
        ?? missions.find((mission) => mission.status !== 'locked')
        ?? missions[0]
        ?? null;
}

function latestTrainingProgramCheckpoint(cycle: TrainingProgramCycleSnapshot) {
    return [...cycle.checkpoints]
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0]
        ?? null;
}

function formatTrainingProgramReasons(
    reasonCodes: readonly TrainingProgramReasonCode[],
    fallback: string,
): string {
    if (reasonCodes.length === 0) {
        return fallback;
    }

    return reasonCodes.map(trainingProgramReasonCopy).join(' ');
}

function toHistoryTrainingProgramContinuity(
    row: HistoryTrainingProgramCycleRow,
    access: ProductAccessResolution,
): HistoryTrainingProgramContinuitySummary {
    const cycle = row.snapshot;
    const projection = projectTrainingProgramForAccess({
        access,
        cycle,
    });
    const mission = projection.basicMission ?? latestTrainingProgramMission(cycle);
    const latestCheckpoint = latestTrainingProgramCheckpoint(cycle);
    const reasonCodes = row.reasonCodes.length > 0 ? row.reasonCodes : cycle.reasonCodes;
    const blockerReasons = Array.from(new Set([
        ...cycle.evidenceSummary.blockers.map(trainingProgramReasonCopy),
        ...reasonCodes.map(trainingProgramReasonCopy),
    ]));

    return {
        cycleId: cycle.id,
        kindLabel: formatTrainingProgramKindLabel(row.kind),
        cycleLabel: cycle.label,
        stateLabel: formatTrainingProgramStateLabel(row.state),
        strictContextLabel: cycle.strictContextLabel,
        weekLabel: `Semana ${cycle.currentWeekNumber}/4`,
        latestMissionLabel: mission?.title ?? 'Missao pendente',
        latestMissionStatusLabel: mission ? formatTrainingProgramMissionStatusLabel(mission.status) : 'pendente',
        latestCheckpointLabel: latestCheckpoint?.summary ?? 'Checkpoint pendente',
        latestCheckpointLayerLabel: latestCheckpoint
            ? formatTrainingProgramCheckpointLayerLabel(latestCheckpoint.layer)
            : 'Checkpoint pendente',
        reasonLabel: formatTrainingProgramReasons(
            reasonCodes,
            row.visibleReason || cycle.evidenceSummary.summary,
        ),
        blockerReasons,
        nextActionLabel: projection.nextStep.label,
        nextActionHref: projection.nextStep.href,
        auditHref: `/history/${row.baseAnalysisSessionId}#history-training-program-audit`,
        projectionDepth: projection.depth,
        canSeeProgramAudit: projection.canSeeProgramAudit,
        archivedLineCount: cycle.archivedLines.length,
        archivedAt: row.archivedAt,
        completedAt: row.completedAt,
    };
}

function isSocialProReportVisibility(value: unknown): value is SocialProReportVisibility {
    return value === 'public' || value === 'link_private';
}

function isSocialProReportStatus(value: unknown): value is SocialProReportStatus {
    return value === 'draft'
        || value === 'published'
        || value === 'hidden'
        || value === 'disabled'
        || value === 'archived';
}

function isSocialProPrivateLinkStatus(value: unknown): value is SocialProPrivateLinkStatus {
    return value === 'active' || value === 'revoked' || value === 'expired';
}

function isHistorySocialProReportRow(value: unknown): value is HistorySocialProReportRow {
    if (!isRecord(value)) {
        return false;
    }

    return typeof value.id === 'string'
        && (typeof value.sourceAnalysisSessionId === 'string' || value.sourceAnalysisSessionId === null)
        && (typeof value.sourceHistorySessionId === 'string' || value.sourceHistorySessionId === null)
        && typeof value.title === 'string'
        && isSocialProReportVisibility(value.visibility)
        && isSocialProReportStatus(value.status)
        && value.updatedAt instanceof Date;
}

function isHistorySocialProPrivateLinkRow(value: unknown): value is HistorySocialProPrivateLinkRow {
    if (!isRecord(value)) {
        return false;
    }

    return typeof value.reportId === 'string'
        && typeof value.id === 'string'
        && isSocialProPrivateLinkStatus(value.status)
        && (value.expiresAt instanceof Date || value.expiresAt === null)
        && value.updatedAt instanceof Date;
}

function isHistorySocialProLibraryRow(value: unknown): value is HistorySocialProLibraryRow {
    if (!isRecord(value)) {
        return false;
    }

    return (typeof value.reportId === 'string' || value.reportId === null)
        && typeof value.collectionId === 'string'
        && (typeof value.collectionLabel === 'string' || value.collectionLabel === null)
        && (typeof value.collectionMode === 'string' || value.collectionMode === null)
        && typeof value.contextKey === 'string'
        && value.createdAt instanceof Date;
}

function socialProVisibilityLabel(visibility: SocialProReportVisibility): string {
    switch (visibility) {
        case 'public':
            return 'Publico';
        case 'link_private':
            return 'Link privado';
    }
}

function socialProReportStatusLabel(status: SocialProReportStatus): string {
    switch (status) {
        case 'draft':
            return 'Rascunho';
        case 'published':
            return 'Publicado';
        case 'hidden':
            return 'Oculto por moderacao';
        case 'disabled':
            return 'Desativado';
        case 'archived':
            return 'Arquivado';
    }
}

function socialProPrivateLinkStatusLabel(status: SocialProPrivateLinkStatus): string {
    switch (status) {
        case 'active':
            return 'Ativo';
        case 'revoked':
            return 'Revogado';
        case 'expired':
            return 'Expirado';
    }
}

function toHistorySocialProContinuity(input: {
    readonly sessionId: string;
    readonly access: ProductAccessResolution;
    readonly projectionLocks: readonly PremiumFeatureLock[];
    readonly report?: HistorySocialProReportRow;
    readonly privateLink?: HistorySocialProPrivateLinkRow;
    readonly libraryRows: readonly HistorySocialProLibraryRow[];
}): HistorySocialProContinuitySummary {
    const canGenerateReport = hasProductEntitlement(input.access, 'community.premium_report_share');
    const canSaveToLibrary = hasProductEntitlement(input.access, 'community.pro_library');
    const canManagePrivateLinks = hasProductEntitlement(input.access, 'community.private_report_links');
    const reportLock = input.projectionLocks.find((lock) => lock.featureKey === 'community.premium_report_share') ?? null;
    const libraryLock = input.projectionLocks.find((lock) => lock.featureKey === 'community.pro_library') ?? null;
    const collectionLabels = Array.from(new Set(
        input.libraryRows
            .map((row) => row.collectionLabel ?? 'Colecao privada')
            .filter((label) => label.trim().length > 0),
    ));
    const report = input.report
        ? {
            id: input.report.id,
            title: input.report.title,
            visibility: input.report.visibility,
            visibilityLabel: socialProVisibilityLabel(input.report.visibility),
            status: input.report.status,
            statusLabel: socialProReportStatusLabel(input.report.status),
            discoverableInFeed: input.report.visibility === 'public' && input.report.status === 'published',
            href: `/history/${input.sessionId}#history-social-pro`,
            updatedAt: input.report.updatedAt,
        }
        : null;
    const privateLink = input.privateLink
        ? {
            id: input.privateLink.id,
            status: input.privateLink.status,
            statusLabel: socialProPrivateLinkStatusLabel(input.privateLink.status),
            expiresAt: input.privateLink.expiresAt,
        }
        : null;
    const library = {
        saved: input.libraryRows.length > 0,
        normalCommunitySaveAllowed: true as const,
        collectionCount: collectionLabels.length,
        collectionLabels,
        visibilityLabel: 'Privada' as const,
        contextKey: input.libraryRows[0]?.contextKey ?? null,
    };
    const nextAction = report
        ? {
            kind: 'manage_report' as const,
            label: 'Atualizar relatorio Pro',
            href: `/history/${input.sessionId}#history-social-pro`,
        }
        : canGenerateReport
            ? {
                kind: 'generate_report' as const,
                label: 'Gerar relatorio Pro',
                href: `/history/${input.sessionId}#history-social-pro`,
            }
            : {
                kind: 'upgrade' as const,
                label: 'Organizar no Pro social',
                href: '/pricing',
            };
    const resolvedNextAction = report && canSaveToLibrary && !library.saved
        ? {
            kind: 'save_to_library' as const,
            label: 'Salvar na Biblioteca Pro',
            href: `/history/${input.sessionId}#history-social-pro`,
        }
        : nextAction;

    return {
        canGenerateReport,
        canSaveToLibrary,
        canManagePrivateLinks,
        report,
        privateLink,
        library,
        reportLock,
        libraryLock,
        nextAction: resolvedNextAction,
        continuityCopy: report
            ? 'Relatorio Pro conectado ao historico, biblioteca e proximas acoes seguras.'
            : 'Free mantem historico legivel. O Pro organiza este contexto em relatorio, biblioteca e Ciclo Pro.',
    };
}

function isHistoryCoachFocusArea(value: unknown): value is CoachFocusArea {
    return value === 'capture_quality'
        || value === 'vertical_control'
        || value === 'horizontal_control'
        || value === 'timing'
        || value === 'consistency'
        || value === 'sensitivity'
        || value === 'loadout'
        || value === 'validation';
}

function isHistoryCoachProtocolOutcomeRow(value: unknown): value is CoachProtocolOutcomeRow {
    return isRecord(value)
        && typeof value.id === 'string'
        && typeof value.analysisSessionId === 'string'
        && typeof value.coachPlanId === 'string'
        && typeof value.protocolId === 'string'
        && isHistoryCoachFocusArea(value.focusArea)
        && (value.status === 'started'
            || value.status === 'completed'
            || value.status === 'improved'
            || value.status === 'unchanged'
            || value.status === 'worse'
            || value.status === 'invalid_capture'
            || value.status === 'fatigue_or_pain'
            || value.status === 'confused'
            || value.status === 'variable_changed')
        && Array.isArray(value.reasonCodes)
        && typeof value.evidenceStrength === 'string'
        && value.createdAt instanceof Date;
}

export async function getHistorySessions() {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    try {
        const access = await resolveProductAccessForRead(session.user.id);
        const result = await db
            .select({
                id: analysisSessions.id,
                weaponId: analysisSessions.weaponId,
                scopeId: analysisSessions.scopeId,
                patchVersion: analysisSessions.patchVersion,
                stabilityScore: analysisSessions.stabilityScore,
                verticalControl: analysisSessions.verticalControl,
                horizontalNoise: analysisSessions.horizontalNoise,
                createdAt: analysisSessions.createdAt,
                weaponName: weaponProfiles.name,
                weaponCategory: weaponProfiles.category,
                fullResult: analysisSessions.fullResult,
            })
            .from(analysisSessions)
            .leftJoin(
                weaponProfiles,
                sql`CASE WHEN ${analysisSessions.weaponId} ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ${analysisSessions.weaponId}::uuid ELSE NULL END = ${weaponProfiles.id}`
            )
            .where(eq(analysisSessions.userId, session.user.id))
            .orderBy(analysisSessions.createdAt);
        const outcomeRowsResult = await db
            .select()
            .from(coachProtocolOutcomes)
            .where(eq(coachProtocolOutcomes.userId, session.user.id))
            .orderBy(coachProtocolOutcomes.createdAt) as CoachProtocolOutcomeRow[] | undefined;
        const outcomeRows = Array.isArray(outcomeRowsResult)
            ? outcomeRowsResult.filter(isHistoryCoachProtocolOutcomeRow)
            : [];
        const rawSprayLabRows = await db
            .select({
                baseAnalysisSessionId: sprayLabSessions.baseAnalysisSessionId,
                snapshot: sprayLabSessions.snapshot,
                updatedAt: sprayLabSessions.updatedAt,
            })
            .from(sprayLabSessions)
            .where(eq(sprayLabSessions.userId, session.user.id))
            .orderBy(sprayLabSessions.updatedAt);
        const sprayLabRows = Array.isArray(rawSprayLabRows)
            ? rawSprayLabRows.filter(isHistorySprayLabSessionRow)
            : [];
        const latestSprayLabByBaseSession = new Map<string, typeof sprayLabRows[number]>();

        for (const row of sprayLabRows) {
            latestSprayLabByBaseSession.set(row.baseAnalysisSessionId, row);
        }

        const labSessionIds = Array.from(new Set(sprayLabRows.map((row) => row.snapshot.id)));
        const rawSprayLabBenchmarkRows = labSessionIds.length === 0
            ? []
            : await db
                .select({
                    labSessionId: sprayLabBenchmarkSnapshots.labSessionId,
                    snapshot: sprayLabBenchmarkSnapshots.snapshot,
                    createdAt: sprayLabBenchmarkSnapshots.createdAt,
                })
                .from(sprayLabBenchmarkSnapshots)
                .where(
                    and(
                        eq(sprayLabBenchmarkSnapshots.userId, session.user.id),
                        inArray(sprayLabBenchmarkSnapshots.labSessionId, labSessionIds),
                    ),
                )
                .orderBy(sprayLabBenchmarkSnapshots.createdAt);
        const sprayLabBenchmarkRows = Array.isArray(rawSprayLabBenchmarkRows)
            ? rawSprayLabBenchmarkRows.filter(isHistorySprayLabBenchmarkRow)
            : [];
        const latestBenchmarkByLabSession = new Map<string, typeof sprayLabBenchmarkRows[number]>();

        for (const row of sprayLabBenchmarkRows) {
            latestBenchmarkByLabSession.set(row.labSessionId, row);
        }

        const rawSprayLabValidationRows = labSessionIds.length === 0
            ? []
            : await db
                .select({
                    labSessionId: sprayLabValidationLinks.labSessionId,
                    payload: sprayLabValidationLinks.payload,
                    updatedAt: sprayLabValidationLinks.updatedAt,
                })
                .from(sprayLabValidationLinks)
                .where(
                    and(
                        eq(sprayLabValidationLinks.userId, session.user.id),
                        inArray(sprayLabValidationLinks.labSessionId, labSessionIds),
                    ),
                )
                .orderBy(sprayLabValidationLinks.updatedAt);
        const sprayLabValidationRows = Array.isArray(rawSprayLabValidationRows)
            ? rawSprayLabValidationRows.filter(isHistorySprayLabValidationRow)
            : [];
        const latestValidationByLabSession = new Map<string, typeof sprayLabValidationRows[number]>();

        for (const row of sprayLabValidationRows) {
            latestValidationByLabSession.set(row.labSessionId, row);
        }

        const rawTrainingProgramRows = await db
            .select({
                baseAnalysisSessionId: trainingProgramCycles.baseAnalysisSessionId,
                kind: trainingProgramCycles.kind,
                state: trainingProgramCycles.state,
                currentWeekNumber: trainingProgramCycles.currentWeekNumber,
                reasonCodes: trainingProgramCycles.reasonCodes,
                visibleReason: trainingProgramCycles.visibleReason,
                blockerSummary: trainingProgramCycles.blockerSummary,
                snapshot: trainingProgramCycles.snapshot,
                updatedAt: trainingProgramCycles.updatedAt,
                archivedAt: trainingProgramCycles.archivedAt,
                completedAt: trainingProgramCycles.completedAt,
            })
            .from(trainingProgramCycles)
            .where(eq(trainingProgramCycles.userId, session.user.id))
            .orderBy(desc(trainingProgramCycles.updatedAt));
        const trainingProgramRows = Array.isArray(rawTrainingProgramRows)
            ? rawTrainingProgramRows.filter(isHistoryTrainingProgramCycleRow)
            : [];
        const latestTrainingProgramByBaseSession = new Map<string, HistoryTrainingProgramCycleRow>();

        for (const row of trainingProgramRows) {
            const current = latestTrainingProgramByBaseSession.get(row.baseAnalysisSessionId);

            if (!current || row.updatedAt.getTime() > current.updatedAt.getTime()) {
                latestTrainingProgramByBaseSession.set(row.baseAnalysisSessionId, row);
            }
        }

        const historySessionIds = result.map((row) => row.id);
        const historySessionIdSet = new Set(historySessionIds);
        const rawSocialProReportRows = historySessionIds.length === 0
            ? []
            : await db
                .select({
                    id: socialProReports.id,
                    sourceAnalysisSessionId: socialProReports.sourceAnalysisSessionId,
                    sourceHistorySessionId: socialProReports.sourceHistorySessionId,
                    title: socialProReports.title,
                    visibility: socialProReports.visibility,
                    status: socialProReports.status,
                    updatedAt: socialProReports.updatedAt,
                })
                .from(socialProReports)
                .where(and(
                    eq(socialProReports.ownerUserId, session.user.id),
                    or(
                        inArray(socialProReports.sourceAnalysisSessionId, historySessionIds),
                        inArray(socialProReports.sourceHistorySessionId, historySessionIds),
                    ),
                ))
                .orderBy(desc(socialProReports.updatedAt));
        const socialProReportRows = Array.isArray(rawSocialProReportRows)
            ? rawSocialProReportRows.filter(isHistorySocialProReportRow)
            : [];
        const latestSocialProReportBySession = new Map<string, HistorySocialProReportRow>();

        for (const row of socialProReportRows) {
            for (const sourceId of [row.sourceAnalysisSessionId, row.sourceHistorySessionId]) {
                if (sourceId && historySessionIdSet.has(sourceId) && !latestSocialProReportBySession.has(sourceId)) {
                    latestSocialProReportBySession.set(sourceId, row);
                }
            }
        }

        const socialProReportIds = Array.from(new Set(socialProReportRows.map((row) => row.id)));
        const rawSocialProPrivateLinkRows = socialProReportIds.length === 0
            ? []
            : await db
                .select({
                    reportId: socialProReportLinks.reportId,
                    id: socialProReportLinks.id,
                    status: socialProReportLinks.status,
                    expiresAt: socialProReportLinks.expiresAt,
                    updatedAt: socialProReportLinks.updatedAt,
                })
                .from(socialProReportLinks)
                .where(and(
                    eq(socialProReportLinks.ownerUserId, session.user.id),
                    inArray(socialProReportLinks.reportId, socialProReportIds),
                ))
                .orderBy(desc(socialProReportLinks.updatedAt));
        const socialProPrivateLinkRows = Array.isArray(rawSocialProPrivateLinkRows)
            ? rawSocialProPrivateLinkRows.filter(isHistorySocialProPrivateLinkRow)
            : [];
        const latestSocialProPrivateLinkByReport = new Map<string, HistorySocialProPrivateLinkRow>();

        for (const row of socialProPrivateLinkRows) {
            if (!latestSocialProPrivateLinkByReport.has(row.reportId)) {
                latestSocialProPrivateLinkByReport.set(row.reportId, row);
            }
        }

        const rawSocialProLibraryRows = socialProReportIds.length === 0
            ? []
            : await db
                .select({
                    reportId: socialProCollectionItems.socialProReportId,
                    collectionId: socialProCollectionItems.collectionId,
                    collectionLabel: socialProCollections.label,
                    collectionMode: socialProCollections.mode,
                    contextKey: socialProCollectionItems.contextKey,
                    createdAt: socialProCollectionItems.createdAt,
                })
                .from(socialProCollectionItems)
                .leftJoin(
                    socialProCollections,
                    eq(socialProCollectionItems.collectionId, socialProCollections.id),
                )
                .where(and(
                    eq(socialProCollectionItems.ownerUserId, session.user.id),
                    eq(socialProCollectionItems.kind, 'report'),
                    inArray(socialProCollectionItems.socialProReportId, socialProReportIds),
                ))
                .orderBy(desc(socialProCollectionItems.createdAt));
        const socialProLibraryRows = Array.isArray(rawSocialProLibraryRows)
            ? rawSocialProLibraryRows.filter(isHistorySocialProLibraryRow)
            : [];
        const socialProLibraryRowsByReport = new Map<string, HistorySocialProLibraryRow[]>();

        for (const row of socialProLibraryRows) {
            if (!row.reportId) {
                continue;
            }

            socialProLibraryRowsByReport.set(row.reportId, [
                ...(socialProLibraryRowsByReport.get(row.reportId) ?? []),
                row,
            ]);
        }

        const latestOutcomeBySession = new Map<string, CoachProtocolOutcome>();
        const revisionCountBySession = new Map<string, number>();

        for (const row of outcomeRows) {
            const outcome = toCoachProtocolOutcome(row);
            latestOutcomeBySession.set(outcome.sessionId, outcome);
            revisionCountBySession.set(
                outcome.sessionId,
                (revisionCountBySession.get(outcome.sessionId) ?? 0) + (outcome.revisionOfOutcomeId ? 1 : 0),
            );
        }

        const projection = createPremiumProjectionSummary(access);

        return result.map(({ fullResult, ...historySession }) => {
            const fullResultRecord = isRecord(fullResult) ? fullResult : null;
            const sensitivity = fullResultRecord?.sensitivity;
            const coachPlan = fullResultRecord?.coachPlan;
            const storedSensitivity = sensitivity && typeof sensitivity === 'object'
                ? sensitivity as Record<string, unknown>
                : undefined;
            const recommendedProfile = storedSensitivity?.recommended;
            const acceptanceFeedback = normalizeStoredAcceptanceFeedback(storedSensitivity?.acceptanceFeedback);
            const latestOutcome = latestOutcomeBySession.get(historySession.id);
            const latestSprayLab = latestSprayLabByBaseSession.get(historySession.id);
            const sprayLabHandoff = buildSprayLabCoachHandoff({
                session: latestSprayLab?.snapshot ?? null,
                benchmark: latestSprayLab
                    ? latestBenchmarkByLabSession.get(latestSprayLab.snapshot.id)?.snapshot ?? null
                    : null,
                validationLink: latestSprayLab
                    ? latestValidationByLabSession.get(latestSprayLab.snapshot.id)?.payload ?? null
                    : null,
            });
            const sprayLabContinuity = toHistorySprayLabContinuity(sprayLabHandoff);
            const trainingProgramRow = latestTrainingProgramByBaseSession.get(historySession.id);
            const trainingProgramContinuity = trainingProgramRow
                ? toHistoryTrainingProgramContinuity(trainingProgramRow, access)
                : undefined;
            const socialProReport = latestSocialProReportBySession.get(historySession.id);
            const socialProPrivateLink = socialProReport
                ? latestSocialProPrivateLinkByReport.get(socialProReport.id)
                : undefined;
            const socialPro = toHistorySocialProContinuity({
                sessionId: historySession.id,
                access,
                projectionLocks: projection.locks,
                ...(socialProReport ? { report: socialProReport } : {}),
                ...(socialProPrivateLink ? { privateLink: socialProPrivateLink } : {}),
                libraryRows: socialProReport
                    ? socialProLibraryRowsByReport.get(socialProReport.id) ?? []
                    : [],
            });
            const hasCoachPlan = typeof coachPlan === 'object' && coachPlan !== null;
            const evidenceSummary = buildHistorySessionEvidenceSummary(fullResultRecord);
            const protocolContinuity = buildHistoryProtocolContinuity(fullResultRecord);
            const coachOutcomeStatus = latestOutcome ? {
                status: latestOutcome.conflict ? 'conflict' as const : latestOutcome.status,
                label: latestOutcome.conflict
                    ? 'Resultado em conflito'
                    : formatCoachOutcomeStatusLabel(latestOutcome.status),
                evidenceStrength: latestOutcome.evidenceStrength,
                recordedAt: latestOutcome.recordedAt,
                revisionCount: revisionCountBySession.get(historySession.id) ?? 0,
            } : hasCoachPlan ? {
                status: 'pending' as const,
                label: 'Protocolo pendente',
                evidenceStrength: 'none' as const,
                recordedAt: null,
                revisionCount: 0,
            } : undefined;

            return {
                ...historySession,
                premiumProjection: projection,
                lockedReason: projection.canSeeFullHistory ? null : 'pro_feature',
                ...(evidenceSummary ? { evidenceSummary } : {}),
                ...(recommendedProfile === 'low' || recommendedProfile === 'balanced' || recommendedProfile === 'high'
                    ? { recommendedProfile }
                    : {}),
                ...(acceptanceFeedback ? { acceptanceFeedback } : {}),
                ...(protocolContinuity ? { protocolContinuity } : {}),
                ...(sprayLabContinuity ? { sprayLabContinuity } : {}),
                ...(trainingProgramContinuity ? { trainingProgramContinuity } : {}),
                socialPro,
                coachOutcomeStatus,
            };
        });
    } catch (err) {
        console.error('[getHistorySessions] Error:', err);
        return [];
    }
}

export async function getPrecisionHistoryLines(): Promise<readonly PrecisionHistoryLineSummary[]> {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    try {
        const lineRows = await db
            .select({
                id: precisionEvolutionLines.id,
                compatibilityKey: precisionEvolutionLines.compatibilityKey,
                status: precisionEvolutionLines.status,
                variableInTest: precisionEvolutionLines.variableInTest,
                baselineSessionId: precisionEvolutionLines.baselineSessionId,
                currentSessionId: precisionEvolutionLines.currentSessionId,
                validClipCount: precisionEvolutionLines.validClipCount,
                blockedClipCount: precisionEvolutionLines.blockedClipCount,
                payload: precisionEvolutionLines.payload,
                createdAt: precisionEvolutionLines.createdAt,
                updatedAt: precisionEvolutionLines.updatedAt,
            })
            .from(precisionEvolutionLines)
            .where(eq(precisionEvolutionLines.userId, session.user.id))
            .orderBy(desc(precisionEvolutionLines.updatedAt));

        const lineIds = lineRows.map((line) => line.id);
        const checkpointRows = lineIds.length === 0
            ? []
            : await db
                .select({
                    id: precisionCheckpoints.id,
                    lineId: precisionCheckpoints.lineId,
                    analysisSessionId: precisionCheckpoints.analysisSessionId,
                    state: precisionCheckpoints.state,
                    variableInTest: precisionCheckpoints.variableInTest,
                    payload: precisionCheckpoints.payload,
                    createdAt: precisionCheckpoints.createdAt,
                })
                .from(precisionCheckpoints)
                .where(inArray(precisionCheckpoints.lineId, lineIds))
                .orderBy(precisionCheckpoints.createdAt);

        const checkpointsByLine = new Map<string, PrecisionHistoryCheckpointSummary[]>();

        for (const checkpoint of checkpointRows) {
            const trend = extractPrecisionTrendFromPayload(checkpoint.payload);
            const summary: PrecisionHistoryCheckpointSummary = {
                id: checkpoint.id,
                lineId: checkpoint.lineId,
                analysisSessionId: checkpoint.analysisSessionId,
                state: checkpoint.state,
                stateLabel: checkpointStateLabel(checkpoint.state),
                variableInTest: checkpoint.variableInTest,
                nextValidation: precisionNextValidation(checkpoint.payload, trend),
                blockerReasons: extractPrecisionBlockerReasons(trend),
                createdAt: checkpoint.createdAt,
            };

            checkpointsByLine.set(checkpoint.lineId, [
                ...(checkpointsByLine.get(checkpoint.lineId) ?? []),
                summary,
            ]);
        }

        return lineRows.map((line): PrecisionHistoryLineSummary => {
            const trend = extractPrecisionTrendFromPayload(line.payload);
            const blockerReasons = extractPrecisionBlockerReasons(trend);

            return {
                id: line.id,
                compatibilityKey: line.compatibilityKey,
                contextLabel: formatPrecisionContextLabel(line.compatibilityKey),
                status: line.status,
                statusLabel: trend ? formatPrecisionTrendLabel(trend.label) : checkpointStateLabel(line.status),
                variableInTest: line.variableInTest,
                nextValidation: precisionNextValidation(line.payload, trend),
                validClipCount: line.validClipCount,
                blockedClipCount: line.blockedClipCount,
                latestTrendLabel: trend?.label ?? null,
                latestTrendText: trend ? formatPrecisionTrendLabel(trend.label) : checkpointStateLabel(line.status),
                blockerReasons,
                baselineSessionId: line.baselineSessionId,
                currentSessionId: line.currentSessionId,
                createdAt: line.createdAt,
                updatedAt: line.updatedAt,
                checkpoints: checkpointsByLine.get(line.id) ?? [],
            };
        });
    } catch (err) {
        console.error('[getPrecisionHistoryLines] Error:', err);
        return [];
    }
}

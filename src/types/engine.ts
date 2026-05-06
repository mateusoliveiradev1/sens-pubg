/**
 * Engine Types — Discriminated unions para resultados dos engines.
 * Cada resultado de diagnóstico, métrica e recomendação é tipado com tag.
 */

import type { Score, Milliseconds, DPI, Sensitivity, Centimeters, Pixels } from './branded';
import type { AnalysisSaveQuotaNotice, PremiumProjectionSummary } from './monetization';
export type { Score, Milliseconds, DPI, Sensitivity, Centimeters, Pixels };

// ═══════════════════════════════════════════
// Posture & Attachments
// ═══════════════════════════════════════════

export type PlayerStance = 'standing' | 'crouching' | 'prone';

export type MuzzleAttachment = 'none' | 'compensator' | 'flash_hider' | 'suppressor' | 'muzzle_brake' | 'choke' | 'duckbill';
export type GripAttachment = 'none' | 'vertical' | 'angled' | 'half' | 'thumb' | 'lightweight' | 'laser' | 'ergonomic' | 'tilted';
export type StockAttachment = 'none' | 'tactical' | 'heavy' | 'folding' | 'cheek_pad';

export interface WeaponLoadout {
    readonly stance: PlayerStance;
    readonly muzzle: MuzzleAttachment;
    readonly grip: GripAttachment;
    readonly stock: StockAttachment;
}

// ═══════════════════════════════════════════
// Tracking & Trajectory
// ═══════════════════════════════════════════

export interface TrackingPoint {
    readonly frame: number;
    readonly timestamp: Milliseconds;
    readonly x: Pixels;
    readonly y: Pixels;
    readonly confidence: number;
}

export type TrackingFrameStatus = 'tracked' | 'occluded' | 'lost' | 'uncertain';
export type ReticleColorState = 'red' | 'green' | 'neutral' | 'unknown';

export interface ReticleExogenousDisturbance {
    readonly muzzleFlash: number;
    readonly blur: number;
    readonly shake: number;
    readonly occlusion: number;
}

export interface TrackingStatusCounts {
    readonly tracked: number;
    readonly occluded: number;
    readonly lost: number;
    readonly uncertain: number;
}

export interface ReticleObservationShape<TCoordinate = number> {
    readonly status: TrackingFrameStatus;
    readonly confidence: number;
    readonly visiblePixels: number;
    readonly reacquisitionFrames?: number;
    readonly colorState: ReticleColorState;
    readonly opticState?: string;
    readonly opticStateConfidence?: number;
    readonly exogenousDisturbance: ReticleExogenousDisturbance;
    readonly x?: TCoordinate;
    readonly y?: TCoordinate;
}

export interface ReticleObservation<TTimestamp = number, TCoordinate = number>
    extends ReticleObservationShape<TCoordinate> {
    readonly frame: number;
    readonly timestamp: TTimestamp;
}

export type TrackingFrameObservation = ReticleObservation<Milliseconds, Pixels>;

export interface TrackingQualitySummary {
    readonly trackingQuality: number;
    readonly framesTracked: number;
    readonly framesLost: number;
    readonly visibleFrames: number;
    readonly framesProcessed: number;
    readonly statusCounts: TrackingStatusCounts;
}

export interface TrackingConfidenceCalibration {
    readonly sampleCount: number;
    readonly meanConfidence: number;
    readonly observedVisibleRate: number;
    readonly brierScore: number;
    readonly expectedCalibrationError: number;
}

export interface TrackingEvidence extends TrackingQualitySummary {
    readonly coverage: number;
    readonly meanErrorPx: number;
    readonly maxErrorPx: number;
    readonly meanReacquisitionFrames: number;
    readonly falseReacquisitionRate: number;
    readonly confidenceCalibration: TrackingConfidenceCalibration;
}

export type VideoQualityBlockingReason =
    | 'low_sharpness'
    | 'high_compression_burden'
    | 'low_reticle_contrast'
    | 'unstable_roi'
    | 'unstable_fps';

export type VideoQualityTier =
    | 'cinematic'
    | 'production_ready'
    | 'analysis_ready'
    | 'limited'
    | 'poor';

export interface VideoQualityPreprocessingReport {
    readonly normalizationApplied: boolean;
    readonly sampledFrames: number;
    readonly selectedFrames: number;
    readonly sprayWindow?: SprayWindowDetection;
}

export interface VideoQualityDiagnosticReport {
    readonly tier: VideoQualityTier;
    readonly summary: string;
    readonly recommendations: readonly string[];
    readonly preprocessing: VideoQualityPreprocessingReport;
    readonly timeline?: VideoQualityFrameTimeline;
}

export type VideoQualityFrameStatus = 'good' | 'degraded' | 'lost';

export type VideoQualityFrameIssue =
    | 'low_sharpness'
    | 'compression'
    | 'low_reticle_contrast'
    | 'reticle_lost';

export type VideoQualitySegmentSeverity = 'warning' | 'critical';

export interface VideoQualityFrameDiagnostic {
    readonly frameIndex: number;
    readonly timestampMs: Milliseconds;
    readonly sharpness: Score;
    readonly compressionBurden: Score;
    readonly reticleContrast: Score;
    readonly status: VideoQualityFrameStatus;
    readonly issues: readonly VideoQualityFrameIssue[];
}

export interface VideoQualityDegradedSegment {
    readonly startMs: Milliseconds;
    readonly endMs: Milliseconds;
    readonly severity: VideoQualitySegmentSeverity;
    readonly primaryIssue: VideoQualityFrameIssue;
    readonly frameCount: number;
}

export interface VideoQualityTimelineSummary {
    readonly totalFrames: number;
    readonly goodFrames: number;
    readonly degradedFrames: number;
    readonly lostFrames: number;
}

export interface VideoQualityFrameTimeline {
    readonly frames: readonly VideoQualityFrameDiagnostic[];
    readonly degradedSegments: readonly VideoQualityDegradedSegment[];
    readonly summary: VideoQualityTimelineSummary;
}

export interface VideoQualityReport {
    readonly overallScore: Score;
    readonly sharpness: Score;
    readonly compressionBurden: Score;
    readonly reticleContrast: Score;
    readonly roiStability: Score;
    readonly fpsStability: Score;
    readonly usableForAnalysis: boolean;
    readonly blockingReasons: readonly VideoQualityBlockingReason[];
    readonly diagnostic?: VideoQualityDiagnosticReport;
}

export interface SprayWindowDetection {
    readonly startMs: Milliseconds;
    readonly endMs: Milliseconds;
    readonly confidence: number;
    readonly shotLikeEvents: number;
    readonly rejectedLeadingMs: Milliseconds;
    readonly rejectedTrailingMs: Milliseconds;
}

export interface DisplacementVector {
    readonly dx: number;
    readonly dy: number;
    readonly timestamp: Milliseconds;
    readonly shotIndex: number;
}

export interface ShotAngularVector {
    readonly yaw: number;
    readonly pitch: number;
}

export interface ShotRecoilResidual {
    readonly shotIndex: number;
    readonly timestamp: Milliseconds;
    readonly observed: ShotAngularVector;
    readonly expected: ShotAngularVector;
    readonly residual: ShotAngularVector;
    readonly residualMagnitudeDegrees: number;
}

export type SprayMetricQualityKey =
    | 'stabilityScore'
    | 'verticalControlIndex'
    | 'horizontalNoiseIndex'
    | 'shotAlignmentErrorMs'
    | 'angularErrorDegrees'
    | 'linearErrorCm'
    | 'linearErrorSeverity'
    | 'initialRecoilResponseMs'
    | 'driftDirectionBias'
    | 'consistencyScore'
    | 'burstVCI'
    | 'sustainedVCI'
    | 'fatigueVCI'
    | 'burstHNI'
    | 'sustainedHNI'
    | 'fatigueHNI'
    | 'shotResiduals'
    | 'sprayScore';

export interface MetricEvidenceQuality {
    readonly coverage: number;
    readonly confidence: number;
    readonly sampleSize: number;
    readonly framesTracked: number;
    readonly framesLost: number;
    readonly framesProcessed: number;
    readonly visibilityCoverage?: number;
    readonly disturbancePenalty?: number;
    readonly reacquisitionPenalty?: number;
    readonly confidenceSource?: 'summary' | 'tracking_frames';
}

export type SprayMetricQuality = Record<SprayMetricQualityKey, MetricEvidenceQuality>;
export type SprayPhaseQuality = Record<'burst' | 'sustained' | 'fatigue', MetricEvidenceQuality>;

export interface SprayTrajectory extends TrackingQualitySummary {
    readonly points: readonly TrackingPoint[];
    readonly trackingFrames: readonly TrackingFrameObservation[];
    readonly displacements: readonly DisplacementVector[];
    readonly totalFrames: number;
    readonly durationMs: Milliseconds;
    readonly shotAlignmentErrorMs: number;
    readonly weaponId: string;
}

// ═══════════════════════════════════════════
// Spray Metrics
// ═══════════════════════════════════════════

export interface SprayMetrics {
    readonly stabilityScore: Score;
    readonly verticalControlIndex: number;
    readonly horizontalNoiseIndex: number;
    readonly shotAlignmentErrorMs: number;
    readonly angularErrorDegrees: number;
    readonly linearErrorCm: number;
    readonly linearErrorSeverity: number;
    readonly targetDistanceMeters: number;
    readonly initialRecoilResponseMs: Milliseconds;
    readonly driftDirectionBias: DriftBias;
    readonly consistencyScore: Score;
    // Phase-based metrics
    readonly burstVCI: number;      // Shots 1-10
    readonly sustainedVCI: number;  // Shots 11-20
    readonly fatigueVCI: number;    // Shots 21+
    readonly burstHNI: number;
    readonly sustainedHNI: number;
    readonly fatigueHNI: number;
    readonly shotResiduals?: readonly ShotRecoilResidual[];
    readonly metricQuality?: SprayMetricQuality;
    readonly phaseQuality?: SprayPhaseQuality;
    readonly sprayScore: number;
}

export interface DriftBias {
    readonly direction: 'left' | 'right' | 'neutral';
    readonly magnitude: number;
}

// ═══════════════════════════════════════════
// Diagnostics (Discriminated Unions)
// ═══════════════════════════════════════════

export type DiagnosisType =
    | 'overpull'
    | 'underpull'
    | 'late_compensation'
    | 'excessive_jitter'
    | 'horizontal_drift'
    | 'inconsistency'
    | 'inconclusive';

export type Severity = 1 | 2 | 3 | 4 | 5;

export type DominantSprayPhase = 'burst' | 'sustained' | 'fatigue' | 'overall';

export interface DiagnosisEvidence {
    readonly confidence: number;
    readonly coverage: number;
    readonly angularErrorDegrees: number;
    readonly linearErrorCm: number;
    readonly linearErrorSeverity: number;
}

export interface DiagnosisBase {
    readonly severity: Severity;
    readonly description: string;
    readonly cause: string;
    readonly remediation: string;
    readonly dominantPhase?: DominantSprayPhase;
    readonly confidence?: number;
    readonly evidence?: DiagnosisEvidence;
}

export interface OverpullDiagnosis extends DiagnosisBase {
    readonly type: 'overpull';
    readonly verticalControlIndex: number;
    readonly excessPercent: number;
}

export interface UnderpullDiagnosis extends DiagnosisBase {
    readonly type: 'underpull';
    readonly verticalControlIndex: number;
    readonly deficitPercent: number;
}

export interface LateCompensationDiagnosis extends DiagnosisBase {
    readonly type: 'late_compensation';
    readonly responseTimeMs: Milliseconds;
    readonly idealResponseMs: Milliseconds;
}

export interface ExcessiveJitterDiagnosis extends DiagnosisBase {
    readonly type: 'excessive_jitter';
    readonly horizontalNoise: number;
    readonly threshold: number;
}

export interface HorizontalDriftDiagnosis extends DiagnosisBase {
    readonly type: 'horizontal_drift';
    readonly bias: DriftBias;
}

export interface InconsistencyDiagnosis extends DiagnosisBase {
    readonly type: 'inconsistency';
    readonly consistencyScore: Score;
}

export interface InconclusiveDiagnosis extends DiagnosisBase {
    readonly type: 'inconclusive';
    readonly evidenceQuality: MetricEvidenceQuality;
}

export type Diagnosis =
    | OverpullDiagnosis
    | UnderpullDiagnosis
    | LateCompensationDiagnosis
    | ExcessiveJitterDiagnosis
    | HorizontalDriftDiagnosis
    | InconsistencyDiagnosis
    | InconclusiveDiagnosis;

// ═══════════════════════════════════════════
// Sensitivity Profiles
// ═══════════════════════════════════════════

export type ProfileType = 'low' | 'balanced' | 'high';
export type RecommendationEvidenceTier = 'weak' | 'moderate' | 'strong';
export type SensitivityRecommendationTier = 'capture_again' | 'test_profiles' | 'apply_ready';
export type SensitivityHistoryAgreement = 'aligned' | 'mixed' | 'conflicting';
export type SensitivityAcceptanceOutcome = 'improved' | 'same' | 'worse';

export interface ScopeSensitivity {
    readonly scopeName: string;
    readonly current: Sensitivity;
    readonly recommended: Sensitivity;
    readonly changePercent: number;
}

export interface SensitivityProfile {
    readonly type: ProfileType;
    readonly label: string;
    readonly description: string;
    readonly general: Sensitivity;
    readonly ads: Sensitivity;
    readonly scopes: readonly ScopeSensitivity[];
    readonly cmPer360: Centimeters;
}

export interface SensitivityHistoryConvergence {
    readonly matchingSessions: number;
    readonly consideredSessions: number;
    readonly consensusProfile: ProfileType;
    readonly supportRatio: number;
    readonly agreement: SensitivityHistoryAgreement;
    readonly summary: string;
}

export interface SensitivityAcceptanceFeedback {
    readonly outcome: SensitivityAcceptanceOutcome;
    readonly testedProfile: ProfileType;
    readonly recordedAt: string;
}

export interface SensitivityRecommendation {
    readonly profiles: readonly [
        SensitivityProfile, // LOW
        SensitivityProfile, // BALANCED
        SensitivityProfile, // HIGH
    ];
    readonly recommended: ProfileType;
    readonly tier: SensitivityRecommendationTier;
    readonly evidenceTier: RecommendationEvidenceTier;
    readonly confidenceScore: number;
    readonly reasoning: string;
    readonly historyConvergence?: SensitivityHistoryConvergence;
    readonly acceptanceFeedback?: SensitivityAcceptanceFeedback;
    readonly suggestedVSM?: number; // Recomendaçao do Vertical Sensitivity Multiplier (1.0-2.0)
}

// ═══════════════════════════════════════════
// Coach Feedback
// ═══════════════════════════════════════════

export type CoachDecisionTier =
    | 'capture_again'
    | 'test_protocol'
    | 'stabilize_block'
    | 'apply_protocol';

export type CoachFocusArea =
    | 'capture_quality'
    | 'vertical_control'
    | 'horizontal_control'
    | 'timing'
    | 'consistency'
    | 'sensitivity'
    | 'loadout'
    | 'validation';

export type CoachSignalSource = 'video_quality' | 'diagnosis' | 'sensitivity' | 'history' | 'context';

export interface CoachSignal {
    readonly source: CoachSignalSource;
    readonly area: CoachFocusArea;
    readonly key: string;
    readonly summary: string;
    readonly confidence: number;
    readonly coverage: number;
    readonly weight: number;
}

export interface CoachPriority {
    readonly id: string;
    readonly area: CoachFocusArea;
    readonly title: string;
    readonly whyNow: string;
    readonly priorityScore: number;
    readonly severity: number;
    readonly confidence: number;
    readonly coverage: number;
    readonly dependencies: readonly string[];
    readonly blockedBy: readonly string[];
    readonly signals: readonly CoachSignal[];
}

export interface CoachActionProtocol {
    readonly id: string;
    readonly kind: 'capture' | 'technique' | 'sens' | 'loadout' | 'drill';
    readonly instruction: string;
    readonly expectedEffect: string;
    readonly risk: 'low' | 'medium' | 'high';
    readonly applyWhen: string;
    readonly avoidWhen?: string;
}

export interface CoachValidationCheck {
    readonly label: string;
    readonly target: string;
    readonly minimumCoverage: number;
    readonly minimumConfidence: number;
    readonly successCondition: string;
    readonly failCondition: string;
}

export interface CoachBlockPlan {
    readonly title: string;
    readonly durationMinutes: number;
    readonly steps: readonly string[];
    readonly checks: readonly CoachValidationCheck[];
}

export interface CoachPlan {
    readonly tier: CoachDecisionTier;
    readonly sessionSummary: string;
    readonly primaryFocus: CoachPriority;
    readonly secondaryFocuses: readonly CoachPriority[];
    readonly actionProtocols: readonly CoachActionProtocol[];
    readonly nextBlock: CoachBlockPlan;
    readonly stopConditions: readonly string[];
    readonly adaptationWindowDays: number;
    readonly llmRewriteAllowed: boolean;
}

export type CoachProtocolOutcomeStatus =
    | 'started'
    | 'completed'
    | 'improved'
    | 'unchanged'
    | 'worse'
    | 'invalid_capture';

export type CoachProtocolOutcomeReasonCode =
    | 'capture_quality'
    | 'incompatible_context'
    | 'poor_execution'
    | 'variable_changed'
    | 'confusing_protocol'
    | 'fatigue_or_pain'
    | 'other';

export type CoachOutcomeEvidenceStrength =
    | 'none'
    | 'weak_self_report'
    | 'neutral'
    | 'invalid'
    | 'conflict'
    | 'confirmed_by_compatible_clip';

export interface CoachOutcomeConflict {
    readonly userOutcomeId: string;
    readonly precisionTrendLabel: PrecisionTrendLabel;
    readonly reason: string;
    readonly nextValidationCopy: string;
}

export interface CoachProtocolOutcomeCoachSnapshot {
    readonly tier: CoachDecisionTier;
    readonly primaryFocusArea: CoachFocusArea;
    readonly primaryFocusTitle: string;
    readonly protocolId: string;
    readonly validationTarget: string;
    readonly precisionTrendLabel?: PrecisionTrendLabel;
}

export interface CoachProtocolOutcome {
    readonly id: string;
    readonly sessionId: string;
    readonly coachPlanId: string;
    readonly protocolId: string;
    readonly focusArea: CoachFocusArea;
    readonly status: CoachProtocolOutcomeStatus;
    readonly reasonCodes: readonly CoachProtocolOutcomeReasonCode[];
    readonly note?: string;
    readonly recordedAt: string;
    readonly revisionOfOutcomeId?: string;
    readonly evidenceStrength: CoachOutcomeEvidenceStrength;
    readonly conflict?: CoachOutcomeConflict;
    readonly coachSnapshot?: CoachProtocolOutcomeCoachSnapshot;
}

export interface CoachProtocolOutcomeSnapshot {
    readonly latest: CoachProtocolOutcome | null;
    readonly revisions: readonly CoachProtocolOutcome[];
    readonly pending: boolean;
    readonly validationCta: string;
    readonly conflicts: readonly CoachOutcomeConflict[];
}

export type CoachOutcomeMemoryLayerSource =
    | 'strict_compatible'
    | 'global_fallback';

export interface CoachOutcomeMemoryLayerSummary {
    readonly source: CoachOutcomeMemoryLayerSource;
    readonly outcomeCount: number;
    readonly pendingCount: number;
    readonly neutralCount: number;
    readonly weakSelfReportCount: number;
    readonly confirmedCount: number;
    readonly invalidCount: number;
    readonly conflictCount: number;
    readonly repeatedFailureCount: number;
    readonly staleOutcomeCount: number;
    readonly technicalEvidenceCount: number;
    readonly focusAreas: readonly CoachFocusArea[];
    readonly confidence: number;
    readonly summary: string;
}

export interface CoachOutcomeMemorySummary {
    readonly activeLayer: CoachOutcomeMemoryLayerSource | 'none';
    readonly strictCompatible: CoachOutcomeMemoryLayerSummary;
    readonly globalFallback: CoachOutcomeMemoryLayerSummary;
    readonly pendingCount: number;
    readonly neutralCount: number;
    readonly confirmedCount: number;
    readonly invalidCount: number;
    readonly conflictCount: number;
    readonly repeatedFailureCount: number;
    readonly staleOutcomeCount: number;
    readonly confidence: number;
    readonly summary: string;
}

export interface CoachDecisionSnapshot {
    readonly tier: CoachDecisionTier;
    readonly primaryFocusArea: CoachFocusArea;
    readonly primaryFocusTitle: string;
    readonly secondaryFocusAreas: readonly CoachFocusArea[];
    readonly protocolId: string;
    readonly validationTarget: string;
    readonly memorySummary: string;
    readonly outcomeMemory: CoachOutcomeMemorySummary;
    readonly outcomeEvidenceState: CoachOutcomeEvidenceStrength;
    readonly conflicts: readonly CoachOutcomeConflict[];
    readonly blockerReasons: readonly string[];
    readonly precisionTrendLabel?: PrecisionTrendLabel;
    readonly createdAt: string;
}

export interface CoachFeedback {
    readonly diagnosis: Diagnosis;
    readonly mode: CoachMode;
    readonly problem: string;
    readonly evidence: CoachEvidence;
    readonly confidence: number;
    readonly likelyCause: string;
    readonly adjustment: string;
    readonly drill: string;
    readonly verifyNextClip: string;
    readonly whatIsWrong: string;
    readonly whyItHappens: string;
    readonly whatToAdjust: string;
    readonly howToTest: string;
    readonly adaptationTimeDays: number;
}

export type CoachMode = 'standard' | 'low-confidence' | 'inconclusive';

export interface CoachContext {
    readonly patchVersion?: string;
    readonly opticId?: string;
    readonly opticStateId?: string;
    readonly targetDistanceMeters?: number;
    readonly distanceMode?: AnalysisDistanceMode;
    readonly weaponName?: string;
    readonly weaponCategory?: string;
}

export interface CoachAttachmentEvidence {
    readonly id: string;
    readonly name: string;
    readonly slot: 'muzzle' | 'grip' | 'stock';
    readonly patchVersion: string;
}

export interface CoachOpticEvidence {
    readonly id: string;
    readonly name: string;
    readonly stateId?: string;
    readonly stateName?: string;
    readonly patchVersion: string;
}

export interface CoachEvidence {
    readonly diagnosisType: DiagnosisType;
    readonly severity: Severity;
    readonly dominantPhase?: DominantSprayPhase;
    readonly confidence: number;
    readonly coverage: number;
    readonly angularErrorDegrees: number;
    readonly linearErrorCm: number;
    readonly linearErrorSeverity: number;
    readonly patchVersion?: string;
    readonly targetDistanceMeters?: number;
    readonly distanceMode?: AnalysisDistanceMode;
    readonly weaponName?: string;
    readonly weaponCategory?: string;
    readonly stance?: PlayerStance;
    readonly attachmentCatalogVersion?: string;
    readonly recommendedAttachments?: readonly CoachAttachmentEvidence[];
    readonly optic?: CoachOpticEvidence;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Measurement Truth Contract
// ═══════════════════════════════════════════════════════════════════════════════

export type SprayActionState = 'capture_again' | 'inconclusive' | 'testable' | 'ready';
export type SprayActionLabel = 'Capturar de novo' | 'Incerto' | 'Testavel' | 'Pronto';
export type SprayMechanicalLevel = 'initial' | 'intermediate' | 'advanced' | 'elite';
export type SprayMechanicalLevelLabel = 'Inicial' | 'Intermediario' | 'Avancado' | 'Elite';

export interface SprayMasteryPillars {
    readonly control: number;
    readonly consistency: number;
    readonly confidence: number;
    readonly clipQuality: number;
}

export interface SprayMasteryEvidence {
    readonly coverage: number;
    readonly confidence: number;
    readonly visibleFrames: number;
    readonly lostFrames: number;
    readonly framesProcessed: number;
    readonly sampleSize: number;
    readonly qualityScore: number;
    readonly usableForAnalysis: boolean;
}

export interface SprayMastery {
    readonly actionState: SprayActionState;
    readonly actionLabel: SprayActionLabel;
    readonly mechanicalLevel: SprayMechanicalLevel;
    readonly mechanicalLevelLabel: SprayMechanicalLevelLabel;
    readonly actionableScore: number;
    readonly mechanicalScore: number;
    readonly pillars: SprayMasteryPillars;
    readonly evidence: SprayMasteryEvidence;
    readonly reasons: readonly string[];
    readonly blockedRecommendations: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Precision Loop Contract
// ═══════════════════════════════════════════════════════════════════════════════

export type PrecisionTrendLabel =
    | 'baseline'
    | 'initial_signal'
    | 'in_validation'
    | 'validated_progress'
    | 'validated_regression'
    | 'oscillation'
    | 'not_comparable'
    | 'consolidated';

export type PrecisionEvidenceLevel =
    | 'blocked'
    | 'baseline'
    | 'initial'
    | 'weak'
    | 'sufficient'
    | 'strong';

export type PrecisionCompatibilityBlockerCode =
    | 'patch_mismatch'
    | 'weapon_mismatch'
    | 'scope_mismatch'
    | 'optic_state_mismatch'
    | 'optic_state_missing'
    | 'stance_mismatch'
    | 'muzzle_mismatch'
    | 'grip_mismatch'
    | 'stock_mismatch'
    | 'distance_missing'
    | 'distance_ambiguous'
    | 'distance_out_of_tolerance'
    | 'missing_metadata'
    | 'capture_quality_unusable'
    | 'capture_quality_weak'
    | 'capture_quality_mismatch'
    | 'spray_type_missing'
    | 'spray_window_mismatch'
    | 'duration_mismatch'
    | 'cadence_mismatch'
    | 'sensitivity_change'
    | 'evidence_mismatch';

export interface PrecisionCompatibilityBlocker {
    readonly code: PrecisionCompatibilityBlockerCode;
    readonly field: string;
    readonly message: string;
    readonly currentValue?: string | number | boolean | null;
    readonly candidateValue?: string | number | boolean | null;
}

export interface PrecisionCompatibilityKey {
    readonly patchVersion: string;
    readonly weaponId: string;
    readonly scopeId: string;
    readonly opticStateId?: string;
    readonly stance: PlayerStance;
    readonly muzzle: MuzzleAttachment;
    readonly grip: GripAttachment;
    readonly stock: StockAttachment;
    readonly distanceMeters: number;
    readonly sprayProtocolKey: string;
    readonly durationMs?: number;
    readonly sprayWindowStartMs?: number;
    readonly sprayWindowEndMs?: number;
    readonly shotLikeEvents?: number;
    readonly sensitivityProfile?: ProfileType;
    readonly sensitivitySignature?: string;
}

export interface PrecisionCompatibilityResult {
    readonly compatible: boolean;
    readonly key?: PrecisionCompatibilityKey;
    readonly candidateKey?: PrecisionCompatibilityKey;
    readonly blockers: readonly PrecisionCompatibilityBlocker[];
}

export type PrecisionPillarKey = 'control' | 'consistency' | 'confidence' | 'clipQuality';
export type PrecisionPillarDeltaStatus = 'improved' | 'declined' | 'stable';

export interface PrecisionPillarDelta {
    readonly pillar: PrecisionPillarKey;
    readonly baseline: number;
    readonly current: number;
    readonly delta: number;
    readonly recentWindowAverage: number;
    readonly recentWindowDelta: number;
    readonly status: PrecisionPillarDeltaStatus;
}

export interface PrecisionScoreDelta {
    readonly baseline: number;
    readonly current: number;
    readonly delta: number;
    readonly recentWindowAverage: number;
    readonly recentWindowDelta: number;
}

export interface PrecisionClipSummary {
    readonly resultId: string;
    readonly timestamp: string;
    readonly actionableScore: number;
    readonly mechanicalScore: number;
    readonly coverage: number;
    readonly confidence: number;
    readonly clipQuality: number;
}

export interface PrecisionRecentWindowSummary {
    readonly count: number;
    readonly resultIds: readonly string[];
    readonly actionableAverage: number;
    readonly mechanicalAverage: number;
    readonly coverageAverage: number;
    readonly confidenceAverage: number;
    readonly clipQualityAverage: number;
}

export interface PrecisionRecurringDiagnosis {
    readonly type: DiagnosisType;
    readonly label: string;
    readonly count: number;
    readonly supportRatio: number;
}

export interface PrecisionBlockerSummary {
    readonly code: PrecisionCompatibilityBlockerCode;
    readonly count: number;
    readonly message: string;
    readonly resultIds: readonly string[];
}

export interface PrecisionBlockedClipSummary {
    readonly resultId: string;
    readonly blockers: readonly PrecisionCompatibilityBlocker[];
}

export interface PrecisionTrendSummary {
    readonly label: PrecisionTrendLabel;
    readonly evidenceLevel: PrecisionEvidenceLevel;
    readonly compatibleCount: number;
    readonly baseline: PrecisionClipSummary | null;
    readonly current: PrecisionClipSummary | null;
    readonly recentWindow: PrecisionRecentWindowSummary | null;
    readonly actionableDelta: PrecisionScoreDelta | null;
    readonly mechanicalDelta: PrecisionScoreDelta | null;
    readonly pillarDeltas: readonly PrecisionPillarDelta[];
    readonly recurringDiagnoses: readonly PrecisionRecurringDiagnosis[];
    readonly blockerSummaries: readonly PrecisionBlockerSummary[];
    readonly blockedClips: readonly PrecisionBlockedClipSummary[];
    readonly confidence: number;
    readonly coverage: number;
    readonly nextValidationHint: string;
}

export type PrecisionCheckpointState =
    | 'baseline_created'
    | 'initial_signal'
    | 'in_validation'
    | 'validated_progress'
    | 'validated_regression'
    | 'oscillation'
    | 'consolidated'
    | 'not_comparable';

export type PrecisionVariableInTest =
    | 'sensitivity'
    | 'vertical_control'
    | 'horizontal_noise'
    | 'consistency'
    | 'capture_quality'
    | 'loadout'
    | 'validation';

export interface PrecisionCheckpoint {
    readonly id: string;
    readonly lineId: string;
    readonly resultId: string;
    readonly createdAt: string;
    readonly state: PrecisionCheckpointState;
    readonly trend: PrecisionTrendSummary;
    readonly variableInTest: PrecisionVariableInTest;
    readonly nextValidationHint: string;
}

export interface PrecisionEvolutionLine {
    readonly id: string;
    readonly compatibilityKey: PrecisionCompatibilityKey;
    readonly state: PrecisionCheckpointState;
    readonly active: boolean;
    readonly baselineResultId: string;
    readonly currentResultId: string;
    readonly variableInTest: PrecisionVariableInTest;
    readonly priority: CoachFocusArea | null;
    readonly lastBlock: string | null;
    readonly nextValidationHint: string;
    readonly validResultIds: readonly string[];
    readonly blockedClips: readonly PrecisionBlockedClipSummary[];
    readonly checkpoints: readonly PrecisionCheckpoint[];
}

export interface AnalysisResult {
    readonly id: string;
    readonly historySessionId?: string;
    readonly quota?: AnalysisSaveQuotaNotice;
    readonly premiumProjection?: PremiumProjectionSummary;
    readonly timestamp: Date;
    readonly patchVersion: string;
    readonly analysisContext?: AnalysisContextDetails;
    readonly videoQualityReport?: VideoQualityReport;
    readonly trajectory: SprayTrajectory;
    readonly loadout: WeaponLoadout;
    readonly metrics: SprayMetrics;
    readonly diagnoses: readonly Diagnosis[];
    readonly sensitivity: SensitivityRecommendation;
    readonly coaching: readonly CoachFeedback[];
    readonly coachPlan?: CoachPlan;
    readonly coachDecisionSnapshot?: CoachDecisionSnapshot;
    readonly coachOutcomeSnapshot?: CoachProtocolOutcomeSnapshot;
    readonly mastery?: SprayMastery;
    readonly precisionTrend?: PrecisionTrendSummary;
    readonly subSessions?: readonly AnalysisResult[];
}

export interface AnalysisOpticContext {
    readonly scopeId: string;
    readonly opticId: string;
    readonly opticStateId: string;
    readonly opticName: string;
    readonly opticStateName: string;
    readonly availableStateIds: readonly string[];
    readonly isDynamicOptic: boolean;
    readonly ambiguityNote?: string;
}

export type AnalysisDistanceMode = 'exact' | 'estimated' | 'unknown';

export interface AnalysisContextDetails {
    readonly targetDistanceMeters: number;
    readonly distanceMode?: AnalysisDistanceMode;
    readonly distanceNote?: string;
    readonly optic: AnalysisOpticContext;
}

// ═══════════════════════════════════════════
// Player Hardware Profile
// ═══════════════════════════════════════════

export type GripStyle = 'palm' | 'claw' | 'fingertip' | 'hybrid';
export type PlayStyle = 'arm' | 'wrist' | 'hybrid';
export type MousepadType = 'speed' | 'control' | 'hybrid';
export type MousepadMaterial = 'cloth' | 'hard' | 'glass';
export type MonitorPanel = 'ips' | 'tn' | 'va';

export interface PlayerHardwareProfile {
    readonly mouse: {
        readonly model: string;
        readonly sensor: string;
        readonly dpi: DPI;
        readonly pollingRate: number;
        readonly weightGrams: number;
        readonly liftOffDistance: number;
    };
    readonly mousepad: {
        readonly model: string;
        readonly widthCm: Centimeters;
        readonly heightCm: Centimeters;
        readonly type: MousepadType;
        readonly material: MousepadMaterial;
    };
    readonly gripStyle: GripStyle;
    readonly playStyle: PlayStyle;
    readonly monitor: {
        readonly resolution: string;
        readonly refreshRate: number;
        readonly panelType: MonitorPanel;
    };
    readonly pubgSettings: {
        readonly generalSens: Sensitivity;
        readonly adsSens: Sensitivity;
        readonly scopeSens: Record<string, Sensitivity>;
        readonly fov: number;
        readonly verticalMultiplier: number;
        readonly mouseAcceleration: boolean;
    };
    readonly physical: {
        readonly armLength: 'short' | 'medium' | 'long';
        readonly deskSpaceCm: Centimeters;
    };
}

// ═══════════════════════════════════════════
// Analysis Session (stored in DB)
// ═══════════════════════════════════════════

export interface AnalysisSession {
    readonly id: string;
    readonly userId: string;
    readonly weaponId: string;
    readonly scopeId: string;
    readonly patchVersion: string;
    readonly stance: PlayerStance;
    readonly attachments: {
        readonly muzzle: MuzzleAttachment;
        readonly grip: GripAttachment;
        readonly stock: StockAttachment;
    };
    readonly distance: number;
    readonly metrics: SprayMetrics;
    readonly diagnoses: readonly DiagnosisType[];
    readonly sensitivityApplied: ProfileType | null;
    readonly createdAt: Date;
}

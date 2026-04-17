/**
 * Engine Types — Discriminated unions para resultados dos engines.
 * Cada resultado de diagnóstico, métrica e recomendação é tipado com tag.
 */

import type { Score, Milliseconds, DPI, Sensitivity, Centimeters, Pixels } from './branded';
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

export interface SensitivityRecommendation {
    readonly profiles: readonly [
        SensitivityProfile, // LOW
        SensitivityProfile, // BALANCED
        SensitivityProfile, // HIGH
    ];
    readonly recommended: ProfileType;
    readonly reasoning: string;
    readonly suggestedVSM?: number; // Recomendaçao do Vertical Sensitivity Multiplier (1.0-2.0)
}

// ═══════════════════════════════════════════
// Coach Feedback
// ═══════════════════════════════════════════

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

export interface AnalysisResult {
    readonly id: string;
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

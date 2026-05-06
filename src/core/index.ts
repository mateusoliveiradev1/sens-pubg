/**
 * Core Module — Barrel re-export de todo o pipeline de análise.
 */

export {
    validateAndPrepareVideo,
    releaseVideoUrl,
    selectVideoQualityFrameSample,
    selectVideoQualityFrames,
    type VideoMetadata,
    type VideoQualityFrameSample,
    type VideoValidationResult,
    type VideoValidationError,
} from './video-ingestion';

export {
    MIN_SPRAY_CLIP_DURATION_SECONDS,
    MAX_SPRAY_CLIP_DURATION_SECONDS,
    formatSprayClipDurationLabel,
    formatSprayClipDurationRange,
    isSupportedSprayClipDuration,
    type SprayClipDurationLocale,
    type SprayClipDurationFormat,
} from './video-ingestion-contract';

export {
    extractFrames,
    extractFramesFromBitmaps,
    sliceExtractedFramesToWindow,
    summarizeFrameTimestampDrift,
    type ExtractedFrame,
    type ExtractionProgress,
    type ExtractionProgressCallback,
    type FrameTimestampDriftSummary,
} from './frame-extraction';

export {
    resolveAnalysisDecision,
    permissionMatrixForDecisionLevel,
    type ResolveAnalysisDecisionInput,
} from './analysis-decision';

export {
    detectSprayWindow,
    detectSprayValidity,
    type DetectSprayWindowOptions,
} from './spray-window-detection';

export {
    alignTrackingPointsToShots,
    summarizeShotAlignmentError,
    type AlignTrackingPointsToShotsOptions,
    type ShotAlignmentErrorSummary,
    type ShotAlignmentResult,
} from './shot-alignment';

export {
    analyzeCaptureQualityFrames,
    createVideoQualityDiagnosticReport,
    createVideoQualityFrameDiagnostics,
    createVideoQualityReport,
    deriveVideoQualityBlockingReasons,
    type CreateVideoQualityDiagnosticReportInput,
    type CreateVideoQualityFrameDiagnosticsOptions,
    type CreateVideoQualityReportInput,
    measureCaptureQualityFrame,
    type AnalyzeCaptureQualityFramesOptions,
    type CaptureQualityMetrics,
    type VideoQualityDiagnosticFrameInput,
} from './capture-quality';

export {
    createStreamingCrosshairTracker,
    trackCrosshair,
    detectCrosshairCentroid,
    type TrackingResult,
    type TemplateMatchingConfig,
    type CrosshairCentroidDetection,
    type CrosshairColor,
    type StreamingCrosshairObservation,
    type StreamingCrosshairTracker,
    type StreamingCrosshairTrackerConfig,
} from './crosshair-tracking';

export {
    classifyGlobalMotionTransition,
    estimateGlobalMotion,
    type GlobalMotionEstimate,
    type GlobalMotionTransitionKind,
    type EstimateGlobalMotionOptions,
} from './global-motion-compensation';

export {
    detectOpticState,
    type OpticStateDetection,
    type OpticStateDetectionOptions,
} from './optic-state-detection';

export {
    createTrackingEvidence,
    type CreateTrackingEvidenceInput,
    type TrackingEvidenceReferenceFrame,
} from './tracking-evidence';
export {
    emptyTrackingContaminationEvidence,
    summarizeTrackingContamination,
    type TrackingContaminationFrameLike,
} from './tracking-contamination';

export {
    buildTrackingReviewOverlay,
    summarizeTrackingReviewOverlay,
    type BuildTrackingReviewOverlayInput,
    type CapturedFrameReviewLabel,
    type TrackingReviewFrameSize,
    type TrackingReviewOverlayMarker,
    type TrackingReviewOverlaySummary,
} from './captured-frame-labeler-view';

export { normalizeTrackingFrame } from './video-normalization';

export {
    createCenteredRoi,
    normalizeTrackingRoi,
    type TrackingRoi,
} from './roi-stabilization';

export {
    buildDisplacements,
    buildTrajectory,
    calculateSprayMetrics,
    segmentSprayPhases,
    SPRAY_PHASE_DEFINITIONS,
    type SprayPhaseDefinition,
    type SprayPhaseName,
    type SprayPhaseSegment,
} from './spray-metrics';

export { runDiagnostics } from './diagnostic-engine';
export { generateSensitivityRecommendation } from './sensitivity-engine';
export {
    formatDiagnosisTruthLabel,
    resolveMeasurementTruth,
    type ResolveMeasurementTruthInput,
} from './measurement-truth';
export {
    buildPrecisionCompatibilityKey,
    comparePrecisionCompatibility,
    formatPrecisionTrendLabel,
    resolvePrecisionTrend,
    summarizePrecisionBlockers,
    STRICT_DISTANCE_TOLERANCE_METERS,
    PRECISION_ACTIONABLE_DEAD_ZONE_POINTS,
    PRECISION_VALIDATION_MIN_TOTAL_CLIPS,
    PRECISION_STRONG_COVERAGE,
    PRECISION_STRONG_CONFIDENCE,
    PRECISION_STRONG_QUALITY_SCORE,
    PRECISION_MIN_SAMPLE_SIZE,
    type PrecisionCompatibilityOptions,
    type ResolvePrecisionTrendInput,
} from './precision-loop';
export {
    COACH_OUTCOME_NOTE_MAX_LENGTH,
    detectCoachOutcomePrecisionConflict,
    isCoachProtocolOutcomeReasonCode,
    isCoachProtocolOutcomeStatus,
    normalizeCoachProtocolOutcomeInput,
    resolveCoachOutcomeEvidence,
    summarizeCoachOutcomeForMemory,
    type CoachOutcomeEvidenceResolution,
    type CoachOutcomeMemorySummary,
    type DetectCoachOutcomePrecisionConflictInput,
    type NormalizeCoachProtocolOutcomeInput,
    type NormalizeCoachProtocolOutcomeResult,
    type NormalizedCoachProtocolOutcomeInput,
    type ResolveCoachOutcomeEvidenceInput,
} from './coach-outcomes';
export { generateCoaching } from './coach-engine';
export {
    adaptCoachResultWithOptionalLlm,
    adaptCoachWithOptionalLlm,
    buildCoachLlmPayload,
    type AdaptCoachResultInput,
    type AdaptCoachResultOutput,
    type CoachLlmClient,
    type CoachLlmBatchOutput,
    type CoachLlmPlanOutput,
    type CoachLlmPlanProtocolOutput,
    type CoachLlmPayloadItem,
    type CoachLlmTextOutput,
} from './coach-llm-adapter';

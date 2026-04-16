/**
 * Core Module — Barrel re-export de todo o pipeline de análise.
 */

export {
    validateAndPrepareVideo,
    releaseVideoUrl,
    type VideoMetadata,
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
    detectSprayWindow,
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
    createVideoQualityReport,
    deriveVideoQualityBlockingReasons,
    type CreateVideoQualityReportInput,
    measureCaptureQualityFrame,
    type AnalyzeCaptureQualityFramesOptions,
    type CaptureQualityMetrics,
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
    estimateGlobalMotion,
    type GlobalMotionEstimate,
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
export { generateCoaching } from './coach-engine';
export {
    adaptCoachWithOptionalLlm,
    buildCoachLlmPayload,
    type CoachLlmClient,
    type CoachLlmPayloadItem,
    type CoachLlmTextOutput,
} from './coach-llm-adapter';

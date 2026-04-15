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
    type ExtractedFrame,
    type ExtractionProgress,
    type ExtractionProgressCallback,
} from './frame-extraction';

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

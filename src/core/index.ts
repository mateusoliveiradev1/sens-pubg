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
    extractFrames,
    extractFramesFromBitmaps,
    type ExtractedFrame,
    type ExtractionProgress,
    type ExtractionProgressCallback,
} from './frame-extraction';

export {
    trackCrosshair,
    type TrackingResult,
    type TemplateMatchingConfig,
} from './crosshair-tracking';

export {
    buildDisplacements,
    buildTrajectory,
    calculateSprayMetrics,
} from './spray-metrics';

export { runDiagnostics } from './diagnostic-engine';
export { generateSensitivityRecommendation } from './sensitivity-engine';
export { generateCoaching } from './coach-engine';

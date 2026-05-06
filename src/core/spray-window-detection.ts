import { asMilliseconds } from '../types/branded';
import type {
    AnalysisBlockerReasonCode,
    SprayValidityReport,
    SprayWindowDetection,
} from '../types/engine';
import { resolveAnalysisDecision } from './analysis-decision';
import type { CrosshairColor } from './crosshair-tracking';
import { createStreamingCrosshairTracker } from './crosshair-tracking';
import type { ExtractedFrame } from './frame-extraction';

export interface DetectSprayWindowOptions {
    readonly targetColor?: CrosshairColor;
    readonly minDisplacementPx?: number;
    readonly minShotLikeEvents?: number;
    readonly preRollFrames?: number;
    readonly postRollFrames?: number;
}

function clampUnit(value: number): number {
    return Math.max(0, Math.min(1, value));
}

export function detectSprayWindow(
    frames: readonly ExtractedFrame[],
    options: DetectSprayWindowOptions = {}
): SprayWindowDetection | null {
    return detectSprayValidity(frames, options).window;
}

export function detectSprayValidity(
    frames: readonly ExtractedFrame[],
    options: DetectSprayWindowOptions = {}
): SprayValidityReport {
    const tracker = createStreamingCrosshairTracker();
    const targetColor = options.targetColor ?? 'RED';
    const minDisplacementPx = options.minDisplacementPx ?? 2;
    const minShotLikeEvents = options.minShotLikeEvents ?? 2;
    const preRollFrames = options.preRollFrames ?? 1;
    const postRollFrames = options.postRollFrames ?? 1;
    const shotLikeEvents: Array<{
        readonly frameIndex: number;
        readonly confidence: number;
    }> = [];
    const displacements: Array<{
        readonly frameIndex: number;
        readonly distancePx: number;
    }> = [];
    let previousVisiblePosition: { x: number; y: number } | null = null;
    let visibleFrames = 0;
    let confidenceSum = 0;

    for (let index = 0; index < frames.length; index++) {
        const frame = frames[index]!;
        const observation = tracker.track(frame.imageData, { targetColor });

        if (observation.x === undefined || observation.y === undefined) {
            continue;
        }

        visibleFrames++;
        confidenceSum += observation.confidence;

        if (previousVisiblePosition) {
            const displacementPx = Math.hypot(
                observation.x - previousVisiblePosition.x,
                observation.y - previousVisiblePosition.y
            );
            displacements.push({ frameIndex: index, distancePx: displacementPx });

            if (displacementPx >= minDisplacementPx) {
                shotLikeEvents.push({
                    frameIndex: index,
                    confidence: observation.confidence,
                });
            }
        }

        previousVisiblePosition = {
            x: observation.x,
            y: observation.y,
        };
    }

    const blockerReasons = resolveValidityBlockerReasons({
        frameCount: frames.length,
        visibleFrames,
        shotLikeEvents: shotLikeEvents.length,
        minShotLikeEvents,
        displacements,
    });
    const window = blockerReasons.length === 0
        ? createSprayWindow(frames, shotLikeEvents, minShotLikeEvents, preRollFrames, postRollFrames)
        : null;
    const meanVisibleConfidence = visibleFrames > 0 ? confidenceSum / visibleFrames : 0;
    const windowConfidence = window?.confidence ?? 0;
    const confidence = clampUnit(window
        ? Math.max(windowConfidence, meanVisibleConfidence * 0.85)
        : meanVisibleConfidence * 0.5);
    const decision = resolveAnalysisDecision({
        blockerReasons,
        confidence,
        coverage: visibleFrames / Math.max(frames.length, 1),
    });

    return {
        valid: window !== null && decision.level !== 'blocked_invalid_clip',
        decisionLevel: window ? decision.level : decision.level === 'usable_analysis' ? 'inconclusive_recapture' : decision.level,
        window,
        blockerReasons,
        trimmedReasons: resolveTrimmedReasons(displacements),
        recaptureGuidance: recaptureGuidanceForReasons(blockerReasons),
        frameCount: frames.length,
        shotLikeEvents: shotLikeEvents.length,
        confidence,
    };
}

function createSprayWindow(
    frames: readonly ExtractedFrame[],
    shotLikeEvents: ReadonlyArray<{
        readonly frameIndex: number;
        readonly confidence: number;
    }>,
    minShotLikeEvents: number,
    preRollFrames: number,
    postRollFrames: number
): SprayWindowDetection | null {
    if (shotLikeEvents.length < minShotLikeEvents) {
        return null;
    }

    const firstEventFrameIndex = shotLikeEvents[0]!.frameIndex;
    const lastEventFrameIndex = shotLikeEvents[shotLikeEvents.length - 1]!.frameIndex;
    const startFrameIndex = Math.max(0, firstEventFrameIndex - preRollFrames);
    const endFrameIndex = Math.min(frames.length - 1, lastEventFrameIndex + postRollFrames);
    const startFrame = frames[startFrameIndex]!;
    const endFrame = frames[endFrameIndex]!;
    const firstFrame = frames[0]!;
    const lastFrame = frames[frames.length - 1]!;
    const meanEventConfidence = shotLikeEvents.reduce((sum, event) => sum + event.confidence, 0) / shotLikeEvents.length;
    const eventCoverage = shotLikeEvents.length / Math.max(minShotLikeEvents, frames.length - 1);
    const confidence = clampUnit((meanEventConfidence * 0.7) + (eventCoverage * 0.3));

    return {
        startMs: asMilliseconds(startFrame.timestamp),
        endMs: asMilliseconds(endFrame.timestamp),
        confidence,
        shotLikeEvents: shotLikeEvents.length,
        rejectedLeadingMs: asMilliseconds(Math.max(0, startFrame.timestamp - firstFrame.timestamp)),
        rejectedTrailingMs: asMilliseconds(Math.max(0, lastFrame.timestamp - endFrame.timestamp)),
    };
}

function resolveValidityBlockerReasons(input: {
    readonly frameCount: number;
    readonly visibleFrames: number;
    readonly shotLikeEvents: number;
    readonly minShotLikeEvents: number;
    readonly displacements: ReadonlyArray<{
        readonly frameIndex: number;
        readonly distancePx: number;
    }>;
}): readonly AnalysisBlockerReasonCode[] {
    const reasons: AnalysisBlockerReasonCode[] = [];

    if (input.frameCount < 6) {
        reasons.push('too_short');
    }

    if (input.visibleFrames === 0) {
        reasons.push('crosshair_not_visible');
    }

    if (input.shotLikeEvents < input.minShotLikeEvents) {
        reasons.push('not_spray_protocol');
    }

    if (input.displacements.some((entry) => entry.distancePx > 28)) {
        reasons.push('flick');
    }

    if (input.displacements.filter((entry) => entry.distancePx > 40).length >= 2) {
        reasons.push('target_swap');
    }

    if (hasLeadingOrTrailingHardCut(input.displacements, input.frameCount)) {
        reasons.push('hard_cut');
    }

    return [...new Set(reasons)];
}

function hasLeadingOrTrailingHardCut(
    displacements: ReadonlyArray<{
        readonly frameIndex: number;
        readonly distancePx: number;
    }>,
    frameCount: number
): boolean {
    const leadingBoundary = Math.min(2, Math.max(frameCount - 1, 0));
    const trailingBoundary = Math.max(0, frameCount - 2);

    return displacements.some((entry) => (
        entry.distancePx > 55
        && (entry.frameIndex <= leadingBoundary || entry.frameIndex >= trailingBoundary)
    ));
}

function resolveTrimmedReasons(
    displacements: ReadonlyArray<{
        readonly distancePx: number;
    }>
): readonly AnalysisBlockerReasonCode[] {
    if (displacements.some((entry) => entry.distancePx > 28)) {
        return ['flick'];
    }

    return [];
}

function recaptureGuidanceForReasons(
    reasons: readonly AnalysisBlockerReasonCode[]
): readonly string[] {
    const guidance: Partial<Record<AnalysisBlockerReasonCode, string>> = {
        too_short: 'Grave pelo menos um spray completo antes de analisar.',
        hard_cut: 'Evite cortes dentro do spray; exporte um trecho continuo.',
        flick: 'Nao misture flick com spray controlado no mesmo clip.',
        target_swap: 'Use um unico alvo durante a janela de spray.',
        camera_motion: 'Evite movimento de camera externo durante a captura.',
        crosshair_not_visible: 'Use reticulo vermelho ou verde visivel no centro.',
        not_spray_protocol: 'Grave um spray sustentado com arma, mira e distancia fixas.',
    };

    const selected = reasons
        .map((reason) => guidance[reason])
        .filter((message): message is string => Boolean(message));

    return selected.length > 0
        ? [...new Set(selected)]
        : ['Grave um spray sustentado com reticulo visivel e alvo unico.'];
}

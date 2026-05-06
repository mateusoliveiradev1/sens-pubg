import type {
    ReticleExogenousDisturbance,
    TrackingContaminationEvidence,
} from '../types/engine';

export interface TrackingContaminationFrameLike {
    readonly exogenousDisturbance?: ReticleExogenousDisturbance;
}

const CONTAMINATION_THRESHOLD = 0.25;

function clampUnit(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.min(1, value));
}

function toFixedNumber(value: number, digits = 4): number {
    return Number(value.toFixed(digits));
}

export function emptyTrackingContaminationEvidence(): TrackingContaminationEvidence {
    return {
        cameraMotionPenalty: 0,
        hardCutPenalty: 0,
        flickPenalty: 0,
        targetSwapPenalty: 0,
        identityPenalty: 0,
        contaminatedFrameCount: 0,
    };
}

export function summarizeTrackingContamination(
    frames: readonly TrackingContaminationFrameLike[]
): TrackingContaminationEvidence {
    if (frames.length === 0) {
        return emptyTrackingContaminationEvidence();
    }

    let cameraMotionSum = 0;
    let hardCutSum = 0;
    let flickSum = 0;
    let targetSwapSum = 0;
    let identityPenaltySum = 0;
    let contaminatedFrameCount = 0;

    for (const frame of frames) {
        const disturbance = frame.exogenousDisturbance;
        const cameraMotion = clampUnit(disturbance?.cameraMotion ?? 0);
        const hardCut = clampUnit(disturbance?.hardCut ?? 0);
        const flick = clampUnit(disturbance?.flick ?? 0);
        const targetSwap = clampUnit(disturbance?.targetSwap ?? 0);
        const identityPenalty = clampUnit(1 - clampUnit(disturbance?.identityConfidence ?? 1));
        const frameContamination = Math.max(
            cameraMotion,
            hardCut,
            flick,
            targetSwap,
            identityPenalty
        );

        cameraMotionSum += cameraMotion;
        hardCutSum += hardCut;
        flickSum += flick;
        targetSwapSum += targetSwap;
        identityPenaltySum += identityPenalty;

        if (frameContamination > CONTAMINATION_THRESHOLD) {
            contaminatedFrameCount++;
        }
    }

    return {
        cameraMotionPenalty: toFixedNumber(cameraMotionSum / frames.length),
        hardCutPenalty: toFixedNumber(hardCutSum / frames.length),
        flickPenalty: toFixedNumber(flickSum / frames.length),
        targetSwapPenalty: toFixedNumber(targetSwapSum / frames.length),
        identityPenalty: toFixedNumber(identityPenaltySum / frames.length),
        contaminatedFrameCount,
    };
}

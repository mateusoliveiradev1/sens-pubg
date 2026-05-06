import type {
    TrackingConfidenceCalibration,
    TrackingEvidence,
    TrackingFrameObservation,
    TrackingFrameStatus,
    TrackingQualitySummary,
} from '../types/engine';
import { summarizeTrackingContamination } from './tracking-contamination';

export interface TrackingEvidenceReferenceFrame {
    readonly frame: number;
    readonly status: TrackingFrameStatus;
    readonly x?: number;
    readonly y?: number;
}

export interface CreateTrackingEvidenceInput extends TrackingQualitySummary {
    readonly trackingFrames: readonly TrackingFrameObservation[];
    readonly referenceFrames?: readonly TrackingEvidenceReferenceFrame[];
}

function clampUnit(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function isVisibleStatus(status: TrackingFrameStatus): boolean {
    return status === 'tracked' || status === 'uncertain';
}

function toFixedNumber(value: number, digits = 4): number {
    return Number(value.toFixed(digits));
}

function calculateErrorPx(
    frame: TrackingFrameObservation,
    reference: TrackingEvidenceReferenceFrame | undefined
): number | null {
    if (
        reference?.x === undefined ||
        reference.y === undefined ||
        frame.x === undefined ||
        frame.y === undefined
    ) {
        return null;
    }

    const dx = Number(frame.x) - reference.x;
    const dy = Number(frame.y) - reference.y;
    return Math.sqrt((dx * dx) + (dy * dy));
}

function calculateConfidenceCalibration(
    frames: readonly TrackingFrameObservation[],
    referencesByFrame: ReadonlyMap<number, TrackingEvidenceReferenceFrame>
): TrackingConfidenceCalibration {
    if (frames.length === 0) {
        return {
            sampleCount: 0,
            meanConfidence: 0,
            observedVisibleRate: 0,
            brierScore: 0,
            expectedCalibrationError: 0,
        };
    }

    const calibrationBins = Array.from({ length: 10 }, () => ({
        sampleCount: 0,
        confidenceSum: 0,
        observedVisibleSum: 0,
    }));
    let confidenceSum = 0;
    let observedVisibleSum = 0;
    let brierSum = 0;

    for (const frame of frames) {
        const reference = referencesByFrame.get(frame.frame);
        const observedVisible = isVisibleStatus(reference?.status ?? frame.status) ? 1 : 0;
        const confidence = clampUnit(frame.confidence);
        const calibrationBinIndex = Math.min(
            calibrationBins.length - 1,
            Math.floor(confidence * calibrationBins.length)
        );
        const calibrationBin = calibrationBins[calibrationBinIndex]!;

        confidenceSum += confidence;
        observedVisibleSum += observedVisible;
        brierSum += (confidence - observedVisible) ** 2;
        calibrationBin.sampleCount++;
        calibrationBin.confidenceSum += confidence;
        calibrationBin.observedVisibleSum += observedVisible;
    }

    const expectedCalibrationError = calibrationBins.reduce((sum, bin) => {
        if (bin.sampleCount === 0) {
            return sum;
        }

        const meanBinConfidence = bin.confidenceSum / bin.sampleCount;
        const meanBinObservedVisibleRate = bin.observedVisibleSum / bin.sampleCount;
        const weightedGap = Math.abs(meanBinConfidence - meanBinObservedVisibleRate) * (bin.sampleCount / frames.length);

        return sum + weightedGap;
    }, 0);

    return {
        sampleCount: frames.length,
        meanConfidence: toFixedNumber(confidenceSum / frames.length),
        observedVisibleRate: toFixedNumber(observedVisibleSum / frames.length),
        brierScore: toFixedNumber(brierSum / frames.length),
        expectedCalibrationError: toFixedNumber(expectedCalibrationError),
    };
}

export function createTrackingEvidence(input: CreateTrackingEvidenceInput): TrackingEvidence {
    const referenceFrames = input.referenceFrames ?? [];
    const referencesByFrame = new Map<number, TrackingEvidenceReferenceFrame>(
        referenceFrames.map((reference) => [reference.frame, reference])
    );
    const useReferenceCoverage = referenceFrames.length > 0;
    let visibleExpected = 0;
    let visibleDetected = 0;
    const errorValues: number[] = [];
    let falseReacquisitionCount = 0;
    const reacquisitionFrames: number[] = [];

    for (const frame of input.trackingFrames) {
        const reference = referencesByFrame.get(frame.frame);
        const expectedVisible = useReferenceCoverage
            ? isVisibleStatus(reference?.status ?? 'lost')
            : isVisibleStatus(frame.status);
        const detectedVisible = isVisibleStatus(frame.status) && frame.x !== undefined && frame.y !== undefined;
        const errorPx = calculateErrorPx(frame, reference);

        if (expectedVisible) {
            visibleExpected++;
            if (detectedVisible) {
                visibleDetected++;
            }
        }

        if (errorPx !== null) {
            errorValues.push(errorPx);
        }

        if (frame.reacquisitionFrames !== undefined) {
            reacquisitionFrames.push(frame.reacquisitionFrames);

            if (!expectedVisible || errorPx === null || errorPx > 1) {
                falseReacquisitionCount++;
            }
        }
    }

    const fallbackCoverage = input.framesProcessed > 0
        ? clampUnit(input.visibleFrames / input.framesProcessed)
        : 0;
    const coverage = useReferenceCoverage
        ? (visibleExpected > 0 ? visibleDetected / visibleExpected : 1)
        : fallbackCoverage;
    const meanErrorPx = errorValues.length > 0
        ? errorValues.reduce((sum, value) => sum + value, 0) / errorValues.length
        : 0;
    const meanReacquisitionFrames = reacquisitionFrames.length > 0
        ? reacquisitionFrames.reduce((sum, value) => sum + value, 0) / reacquisitionFrames.length
        : 0;
    const falseReacquisitionRate = reacquisitionFrames.length > 0
        ? falseReacquisitionCount / reacquisitionFrames.length
        : 0;
    const contaminationEvidence = summarizeTrackingContamination(input.trackingFrames);

    return {
        trackingQuality: input.trackingQuality,
        framesTracked: input.framesTracked,
        framesLost: input.framesLost,
        visibleFrames: input.visibleFrames,
        framesProcessed: input.framesProcessed,
        statusCounts: input.statusCounts,
        coverage,
        meanErrorPx,
        maxErrorPx: errorValues.length > 0 ? Math.max(...errorValues) : 0,
        meanReacquisitionFrames,
        falseReacquisitionRate,
        confidenceCalibration: calculateConfidenceCalibration(input.trackingFrames, referencesByFrame),
        ...contaminationEvidence,
    };
}

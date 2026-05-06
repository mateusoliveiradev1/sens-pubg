import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { summarizeTrackingContamination } from '../src/core/tracking-contamination';
import { createStreamingCrosshairTracker, type CrosshairColor } from '../src/core/crosshair-tracking';
import type { TrackingContaminationEvidence, TrackingFrameStatus } from '../src/types/engine';

interface FixtureThresholds {
    readonly minCoverage: number;
    readonly maxMeanErrorPx: number;
    readonly maxStatusMismatches: number;
    readonly maxBrierScore: number;
    readonly maxExpectedCalibrationError: number;
}

interface FixtureTrackerConfig {
    readonly templateSize?: number;
    readonly searchRadius?: number;
    readonly normalizeBeforeTracking?: boolean;
    readonly globalMotionCompensation?: boolean;
    readonly globalMotionSearchRadiusPx?: number;
}

interface FixtureFrameReticle {
    readonly x: number;
    readonly y: number;
    readonly shape: 'block' | 'plus' | 'blur';
    readonly size?: number;
}

interface FixtureExpectedFrame {
    readonly status: TrackingFrameStatus;
    readonly x?: number;
    readonly y?: number;
}

interface FixtureFrame {
    readonly timestamp: number;
    readonly reticle?: FixtureFrameReticle;
    readonly expected: FixtureExpectedFrame;
    readonly backgroundOffset?: {
        readonly x: number;
        readonly y: number;
    };
}

export interface TrackingGoldenFixture {
    readonly version: 1;
    readonly name: string;
    readonly color: CrosshairColor;
    readonly frameSize: {
        readonly width: number;
        readonly height: number;
    };
    readonly roiRadiusPx?: number;
    readonly tracker?: FixtureTrackerConfig;
    readonly backgroundPattern?: 'anchor-blocks';
    readonly thresholds: FixtureThresholds;
    readonly frames: readonly FixtureFrame[];
}

export interface TrackingGoldenFrameResult {
    readonly frame: number;
    readonly expectedStatus: TrackingFrameStatus;
    readonly actualStatus: TrackingFrameStatus;
    readonly confidence: number;
    readonly errorPx: number | null;
    readonly reacquisitionFrames?: number;
    readonly falseReacquisition?: boolean;
}

export interface ConfidenceCalibrationSummary {
    readonly sampleCount: number;
    readonly meanConfidence: number;
    readonly observedVisibleRate: number;
    readonly brierScore: number;
    readonly expectedCalibrationError: number;
}

interface ErrorMetricsSummary {
    readonly meanErrorPx: number;
    readonly p95ErrorPx: number;
    readonly maxErrorPx: number;
}

export interface TrackingGoldenFixtureResult {
    readonly name: string;
    readonly passed: boolean;
    readonly coverage: number;
    readonly meanErrorPx: number;
    readonly p95ErrorPx: number;
    readonly maxErrorPx: number;
    readonly meanReacquisitionFrames: number;
    readonly falseReacquisitionRate: number;
    readonly statusMismatches: number;
    readonly calibrationPassed: boolean;
    readonly confidenceCalibration: ConfidenceCalibrationSummary;
    readonly contamination: TrackingContaminationEvidence;
    readonly frames: readonly TrackingGoldenFrameResult[];
}

export interface TrackingGoldenReport {
    readonly passed: boolean;
    readonly summary: {
        readonly totalFixtures: number;
        readonly failedFixtures: number;
        readonly meanCoverage: number;
        readonly meanErrorPx: number;
        readonly p95ErrorPx: number;
        readonly maxErrorPx: number;
        readonly meanReacquisitionFrames: number;
        readonly falseReacquisitionRate: number;
        readonly confidenceCalibration: ConfidenceCalibrationSummary;
    };
    readonly fixtures: readonly TrackingGoldenFixtureResult[];
}

export interface RunTrackingGoldensOptions {
    readonly fixturesDir?: string;
}

function isVisibleStatus(status: TrackingFrameStatus): boolean {
    return status === 'tracked' || status === 'uncertain';
}

function toFixedNumber(value: number, digits = 4): number {
    return Number(value.toFixed(digits));
}

function calculateConfidenceCalibration(
    frames: readonly Pick<TrackingGoldenFrameResult, 'expectedStatus' | 'confidence'>[]
): ConfidenceCalibrationSummary {
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
        const expectedVisible = isVisibleStatus(frame.expectedStatus) ? 1 : 0;
        const calibrationBinIndex = Math.min(
            calibrationBins.length - 1,
            Math.floor(frame.confidence * calibrationBins.length)
        );
        const calibrationBin = calibrationBins[calibrationBinIndex]!;

        confidenceSum += frame.confidence;
        observedVisibleSum += expectedVisible;
        brierSum += (frame.confidence - expectedVisible) ** 2;
        calibrationBin.sampleCount++;
        calibrationBin.confidenceSum += frame.confidence;
        calibrationBin.observedVisibleSum += expectedVisible;
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

function isIdentityContaminatedForCalibration(observation: {
    readonly exogenousDisturbance: {
        readonly hardCut?: number;
        readonly flick?: number;
        readonly targetSwap?: number;
        readonly identityConfidence?: number;
    };
}): boolean {
    const disturbance = observation.exogenousDisturbance;
    return Math.max(
        disturbance.hardCut ?? 0,
        disturbance.flick ?? 0,
        disturbance.targetSwap ?? 0,
        1 - (disturbance.identityConfidence ?? 1)
    ) > 0.25;
}

function percentile(values: readonly number[], quantile: number): number {
    if (values.length === 0) {
        return 0;
    }

    const sorted = [...values].sort((left, right) => left - right);
    const rank = Math.ceil(quantile * sorted.length) - 1;
    const index = Math.min(sorted.length - 1, Math.max(0, rank));

    return sorted[index]!;
}

function summarizeErrorMetrics(errorValues: readonly number[]): ErrorMetricsSummary {
    if (errorValues.length === 0) {
        return {
            meanErrorPx: 0,
            p95ErrorPx: 0,
            maxErrorPx: 0,
        };
    }

    const meanErrorPx = errorValues.reduce((sum, value) => sum + value, 0) / errorValues.length;

    return {
        meanErrorPx,
        p95ErrorPx: percentile(errorValues, 0.95),
        maxErrorPx: Math.max(...errorValues),
    };
}

function pixelColor(color: CrosshairColor): { r: number; g: number; b: number } {
    return color === 'RED'
        ? { r: 255, g: 0, b: 0 }
        : { r: 0, g: 255, b: 0 };
}

interface RgbColor {
    readonly r: number;
    readonly g: number;
    readonly b: number;
}

function setRgbPixel(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number,
    color: RgbColor
): void {
    if (x < 0 || y < 0 || x >= width || y >= height) return;

    const index = ((y * width) + x) * 4;
    data[index] = color.r;
    data[index + 1] = color.g;
    data[index + 2] = color.b;
    data[index + 3] = 255;
}

function setPixel(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number,
    color: CrosshairColor
): void {
    setRgbPixel(data, width, height, x, y, pixelColor(color));
}

function dimPixelColor(color: CrosshairColor): RgbColor {
    return color === 'RED'
        ? { r: 175, g: 60, b: 60 }
        : { r: 60, g: 175, b: 60 };
}

function drawReticle(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    color: CrosshairColor,
    reticle: FixtureFrameReticle | undefined
): void {
    if (!reticle) return;

    if (reticle.shape === 'plus' || reticle.shape === 'blur') {
        setPixel(data, width, height, reticle.x, reticle.y, color);
        setPixel(data, width, height, reticle.x - 1, reticle.y, color);
        setPixel(data, width, height, reticle.x + 1, reticle.y, color);
        setPixel(data, width, height, reticle.x, reticle.y - 1, color);
        setPixel(data, width, height, reticle.x, reticle.y + 1, color);

        if (reticle.shape === 'blur') {
            const halo = dimPixelColor(color);
            for (let y = reticle.y - 2; y <= reticle.y + 2; y++) {
                for (let x = reticle.x - 2; x <= reticle.x + 2; x++) {
                    if (Math.abs(x - reticle.x) + Math.abs(y - reticle.y) <= 1) {
                        continue;
                    }

                    setRgbPixel(data, width, height, x, y, halo);
                }
            }
        }

        return;
    }

    const size = reticle.size ?? 5;
    const half = Math.floor(size / 2);
    for (let y = reticle.y - half; y <= reticle.y + half; y++) {
        for (let x = reticle.x - half; x <= reticle.x + half; x++) {
            setPixel(data, width, height, x, y, color);
        }
    }
}

function drawAnchorBackground(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    offsetX: number,
    offsetY: number
): void {
    const anchors = [
        { x: 6, y: 6, size: 5, color: { r: 0, g: 220, b: 220 } },
        { x: 28, y: 7, size: 5, color: { r: 80, g: 220, b: 0 } },
        { x: 8, y: 29, size: 5, color: { r: 0, g: 120, b: 255 } },
        { x: 29, y: 28, size: 5, color: { r: 220, g: 220, b: 0 } },
        { x: 20, y: 12, size: 3, color: { r: 120, g: 120, b: 255 } },
        { x: 13, y: 22, size: 3, color: { r: 0, g: 200, b: 120 } },
        { x: 24, y: 20, size: 3, color: { r: 180, g: 180, b: 255 } },
    ];

    for (const anchor of anchors) {
        const half = Math.floor(anchor.size / 2);
        for (let y = anchor.y - half; y <= anchor.y + half; y++) {
            for (let x = anchor.x - half; x <= anchor.x + half; x++) {
                setRgbPixel(data, width, height, x + offsetX, y + offsetY, anchor.color);
            }
        }
    }
}

function createSyntheticFrame(fixture: TrackingGoldenFixture, frame: FixtureFrame): ImageData {
    const { width, height } = fixture.frameSize;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let i = 3; i < data.length; i += 4) {
        data[i] = 255;
    }

    if (fixture.backgroundPattern === 'anchor-blocks') {
        drawAnchorBackground(
            data,
            width,
            height,
            frame.backgroundOffset?.x ?? 0,
            frame.backgroundOffset?.y ?? 0
        );
    }

    drawReticle(data, width, height, fixture.color, frame.reticle);

    return { data, width, height } as ImageData;
}

function calculateErrorPx(
    expected: FixtureExpectedFrame,
    observation: {
        readonly x?: number;
        readonly y?: number;
    }
): number | null {
    if (
        observation.x === undefined ||
        observation.y === undefined ||
        expected.x === undefined ||
        expected.y === undefined
    ) {
        return null;
    }

    const dx = observation.x - expected.x;
    const dy = observation.y - expected.y;
    return Math.sqrt((dx * dx) + (dy * dy));
}

function normalizeObservationForGoldenComparison(observation: {
    readonly status: TrackingFrameStatus;
    readonly confidence: number;
    readonly visiblePixels: number;
    readonly x?: number;
    readonly y?: number;
}): {
    readonly actualStatus: TrackingFrameStatus;
    readonly confidence: number;
    readonly hasVisibleDetection: boolean;
} {
    if (observation.visiblePixels > 0 && observation.x !== undefined && observation.y !== undefined) {
        return {
            actualStatus: observation.status,
            confidence: observation.confidence,
            hasVisibleDetection: true,
        };
    }

    return {
        actualStatus: observation.status === 'lost' ? 'lost' : 'occluded',
        confidence: 0,
        hasVisibleDetection: false,
    };
}

export function evaluateTrackingGoldenFixture(fixture: TrackingGoldenFixture): TrackingGoldenFixtureResult {
    const frames: TrackingGoldenFrameResult[] = [];
    const contaminationFrames: Parameters<typeof summarizeTrackingContamination>[0][number][] = [];
    const calibrationFrames: Pick<TrackingGoldenFrameResult, 'expectedStatus' | 'confidence'>[] = [];
    let visibleExpected = 0;
    let visibleDetected = 0;
    let statusMismatches = 0;
    const errorValues: number[] = [];
    const tracker = createStreamingCrosshairTracker({
        ...(fixture.tracker ?? {}),
        ...(fixture.roiRadiusPx !== undefined ? { roiRadiusPx: fixture.roiRadiusPx } : {}),
    });

    for (let i = 0; i < fixture.frames.length; i++) {
        const frame = fixture.frames[i]!;
        const imageData = createSyntheticFrame(fixture, frame);
        const observation = tracker.track(imageData, {
            targetColor: fixture.color,
        });
        const normalizedObservation = normalizeObservationForGoldenComparison(observation);
        const actualStatus = normalizedObservation.actualStatus;
        const expectedStatus = frame.expected.status;
        const confidence = normalizedObservation.confidence;
        const errorPx = calculateErrorPx(frame.expected, observation);
        const falseReacquisition = observation.reacquisitionFrames !== undefined && (
            !isVisibleStatus(expectedStatus) ||
            errorPx === null ||
            errorPx > 1
        );

        if (isVisibleStatus(expectedStatus)) {
            visibleExpected++;
            if (normalizedObservation.hasVisibleDetection) {
                visibleDetected++;
            }
        }

        if (errorPx !== null) {
            errorValues.push(errorPx);
        }

        if (actualStatus !== expectedStatus) {
            statusMismatches++;
        }

        contaminationFrames.push({
            exogenousDisturbance: observation.exogenousDisturbance,
        });
        if (!isIdentityContaminatedForCalibration(observation)) {
            calibrationFrames.push({
                expectedStatus,
                confidence,
            });
        }
        frames.push({
            frame: i,
            expectedStatus,
            actualStatus,
            confidence,
            errorPx,
            ...(observation.reacquisitionFrames !== undefined
                ? { reacquisitionFrames: observation.reacquisitionFrames }
                : {}),
            ...(falseReacquisition ? { falseReacquisition } : {}),
        });
    }

    const coverage = visibleExpected > 0 ? visibleDetected / visibleExpected : 1;
    const errorMetrics = summarizeErrorMetrics(errorValues);
    const reacquisitionFrames = frames
        .map((frame) => frame.reacquisitionFrames)
        .filter((value): value is number => value !== undefined);
    const meanReacquisitionFrames = reacquisitionFrames.length > 0
        ? reacquisitionFrames.reduce((sum, value) => sum + value, 0) / reacquisitionFrames.length
        : 0;
    const falseReacquisitionCount = frames.filter((frame) => frame.falseReacquisition === true).length;
    const falseReacquisitionRate = reacquisitionFrames.length > 0
        ? falseReacquisitionCount / reacquisitionFrames.length
        : 0;
    const confidenceCalibration = calculateConfidenceCalibration(calibrationFrames);
    const contamination = summarizeTrackingContamination(contaminationFrames);
    const calibrationPassed = (
        confidenceCalibration.brierScore <= fixture.thresholds.maxBrierScore &&
        confidenceCalibration.expectedCalibrationError <= fixture.thresholds.maxExpectedCalibrationError
    );
    const passed = (
        coverage >= fixture.thresholds.minCoverage &&
        errorMetrics.meanErrorPx <= fixture.thresholds.maxMeanErrorPx &&
        statusMismatches <= fixture.thresholds.maxStatusMismatches &&
        calibrationPassed
    );

    return {
        name: fixture.name,
        passed,
        coverage,
        meanErrorPx: errorMetrics.meanErrorPx,
        p95ErrorPx: errorMetrics.p95ErrorPx,
        maxErrorPx: errorMetrics.maxErrorPx,
        meanReacquisitionFrames,
        falseReacquisitionRate,
        statusMismatches,
        calibrationPassed,
        confidenceCalibration,
        contamination,
        frames,
    };
}

export async function loadTrackingGoldenFixture(filePath: string): Promise<TrackingGoldenFixture> {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as TrackingGoldenFixture;
}

async function loadFixtures(fixturesDir: string): Promise<TrackingGoldenFixture[]> {
    const entries = await readdir(fixturesDir);
    const files = entries.filter(entry => entry.endsWith('.json')).sort();
    const fixtures: TrackingGoldenFixture[] = [];

    for (const file of files) {
        fixtures.push(await loadTrackingGoldenFixture(path.join(fixturesDir, file)));
    }

    return fixtures;
}

export async function runTrackingGoldens(
    options: RunTrackingGoldensOptions = {}
): Promise<TrackingGoldenReport> {
    const fixturesDir = options.fixturesDir ?? path.resolve(process.cwd(), 'tests/goldens/tracking');
    const fixtures = await loadFixtures(fixturesDir);
    const results = fixtures.map(evaluateTrackingGoldenFixture);
    const failedFixtures = results.filter(result => !result.passed).length;
    const meanCoverage = results.length > 0
        ? results.reduce((sum, result) => sum + result.coverage, 0) / results.length
        : 0;
    const errorMetrics = summarizeErrorMetrics(
        results.flatMap(result => result.frames)
            .map(frame => frame.errorPx)
            .filter((errorPx): errorPx is number => errorPx !== null)
    );
    const summaryReacquisitionFrames = results
        .flatMap(result => result.frames)
        .map(frame => frame.reacquisitionFrames)
        .filter((value): value is number => value !== undefined);
    const meanReacquisitionFrames = summaryReacquisitionFrames.length > 0
        ? summaryReacquisitionFrames.reduce((sum, value) => sum + value, 0) / summaryReacquisitionFrames.length
        : 0;
    const falseReacquisitionCount = results
        .flatMap(result => result.frames)
        .filter(frame => frame.falseReacquisition === true)
        .length;
    const falseReacquisitionRate = summaryReacquisitionFrames.length > 0
        ? falseReacquisitionCount / summaryReacquisitionFrames.length
        : 0;
    const confidenceCalibration = calculateConfidenceCalibration(
        results.flatMap(result => result.frames)
    );

    return {
        passed: failedFixtures === 0,
        summary: {
            totalFixtures: results.length,
            failedFixtures,
            meanCoverage,
            meanErrorPx: errorMetrics.meanErrorPx,
            p95ErrorPx: errorMetrics.p95ErrorPx,
            maxErrorPx: errorMetrics.maxErrorPx,
            meanReacquisitionFrames,
            falseReacquisitionRate,
            confidenceCalibration,
        },
        fixtures: results,
    };
}

function isCliEntrypoint(): boolean {
    const entrypoint = process.argv[1];
    if (!entrypoint) return false;

    return import.meta.url === pathToFileURL(entrypoint).href;
}

async function main(): Promise<void> {
    const report = await runTrackingGoldens();
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.passed ? 0 : 1;
}

if (isCliEntrypoint()) {
    void main();
}

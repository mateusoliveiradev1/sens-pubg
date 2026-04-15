import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createCenteredRoi } from '../src/core/roi-stabilization';
import { detectCrosshairCentroid, type CrosshairColor } from '../src/core/crosshair-tracking';
import type { TrackingFrameStatus } from '../src/types/engine';

interface FixtureThresholds {
    readonly minCoverage: number;
    readonly maxMeanErrorPx: number;
    readonly maxStatusMismatches: number;
}

interface FixtureFrameReticle {
    readonly x: number;
    readonly y: number;
    readonly shape: 'block' | 'plus';
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
    readonly thresholds: FixtureThresholds;
    readonly frames: readonly FixtureFrame[];
}

export interface TrackingGoldenFrameResult {
    readonly frame: number;
    readonly expectedStatus: TrackingFrameStatus;
    readonly actualStatus: TrackingFrameStatus;
    readonly confidence: number;
    readonly errorPx: number | null;
}

export interface ConfidenceCalibrationSummary {
    readonly sampleCount: number;
    readonly meanConfidence: number;
    readonly observedVisibleRate: number;
    readonly brierScore: number;
    readonly expectedCalibrationError: number;
}

export interface TrackingGoldenFixtureResult {
    readonly name: string;
    readonly passed: boolean;
    readonly coverage: number;
    readonly meanErrorPx: number;
    readonly statusMismatches: number;
    readonly confidenceCalibration: ConfidenceCalibrationSummary;
    readonly frames: readonly TrackingGoldenFrameResult[];
}

export interface TrackingGoldenReport {
    readonly passed: boolean;
    readonly summary: {
        readonly totalFixtures: number;
        readonly failedFixtures: number;
        readonly meanCoverage: number;
        readonly meanErrorPx: number;
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

function classifyDetection(
    detected: ReturnType<typeof detectCrosshairCentroid>,
    hadPreviousDetection: boolean
): TrackingFrameStatus {
    if (!detected) {
        return hadPreviousDetection ? 'occluded' : 'lost';
    }

    return detected.confidence >= 0.7 ? 'tracked' : 'uncertain';
}

function pixelColor(color: CrosshairColor): { r: number; g: number; b: number } {
    return color === 'RED'
        ? { r: 255, g: 0, b: 0 }
        : { r: 0, g: 255, b: 0 };
}

function setPixel(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number,
    color: CrosshairColor
): void {
    if (x < 0 || y < 0 || x >= width || y >= height) return;

    const index = ((y * width) + x) * 4;
    const rgb = pixelColor(color);
    data[index] = rgb.r;
    data[index + 1] = rgb.g;
    data[index + 2] = rgb.b;
    data[index + 3] = 255;
}

function drawReticle(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    color: CrosshairColor,
    reticle: FixtureFrameReticle | undefined
): void {
    if (!reticle) return;

    if (reticle.shape === 'plus') {
        setPixel(data, width, height, reticle.x, reticle.y, color);
        setPixel(data, width, height, reticle.x - 1, reticle.y, color);
        setPixel(data, width, height, reticle.x + 1, reticle.y, color);
        setPixel(data, width, height, reticle.x, reticle.y - 1, color);
        setPixel(data, width, height, reticle.x, reticle.y + 1, color);
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

function createSyntheticFrame(fixture: TrackingGoldenFixture, frame: FixtureFrame): ImageData {
    const { width, height } = fixture.frameSize;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let i = 3; i < data.length; i += 4) {
        data[i] = 255;
    }

    drawReticle(data, width, height, fixture.color, frame.reticle);

    return { data, width, height } as ImageData;
}

function calculateErrorPx(
    expected: FixtureExpectedFrame,
    detected: ReturnType<typeof detectCrosshairCentroid>
): number | null {
    if (!detected || expected.x === undefined || expected.y === undefined) {
        return null;
    }

    const dx = detected.currentX - expected.x;
    const dy = detected.currentY - expected.y;
    return Math.sqrt((dx * dx) + (dy * dy));
}

export function evaluateTrackingGoldenFixture(fixture: TrackingGoldenFixture): TrackingGoldenFixtureResult {
    const frames: TrackingGoldenFrameResult[] = [];
    let visibleExpected = 0;
    let visibleDetected = 0;
    let statusMismatches = 0;
    let errorSum = 0;
    let errorSamples = 0;
    let previousX: number | null = null;
    let previousY: number | null = null;

    for (let i = 0; i < fixture.frames.length; i++) {
        const frame = fixture.frames[i]!;
        const imageData = createSyntheticFrame(fixture, frame);
        const roi = (previousX !== null && previousY !== null && fixture.roiRadiusPx !== undefined)
            ? createCenteredRoi(previousX, previousY, imageData.width, imageData.height, fixture.roiRadiusPx)
            : undefined;
        const detected = detectCrosshairCentroid(imageData, fixture.color, roi);
        const actualStatus = classifyDetection(detected, previousX !== null && previousY !== null);
        const expectedStatus = frame.expected.status;
        const confidence = detected?.confidence ?? 0;
        const errorPx = calculateErrorPx(frame.expected, detected);

        if (isVisibleStatus(expectedStatus)) {
            visibleExpected++;
            if (detected) {
                visibleDetected++;
            }
        }

        if (errorPx !== null) {
            errorSum += errorPx;
            errorSamples++;
        }

        if (actualStatus !== expectedStatus) {
            statusMismatches++;
        }

        if (detected) {
            previousX = detected.currentX;
            previousY = detected.currentY;
        }

        frames.push({
            frame: i,
            expectedStatus,
            actualStatus,
            confidence,
            errorPx,
        });
    }

    const coverage = visibleExpected > 0 ? visibleDetected / visibleExpected : 1;
    const meanErrorPx = errorSamples > 0 ? errorSum / errorSamples : 0;
    const passed = (
        coverage >= fixture.thresholds.minCoverage &&
        meanErrorPx <= fixture.thresholds.maxMeanErrorPx &&
        statusMismatches <= fixture.thresholds.maxStatusMismatches
    );

    return {
        name: fixture.name,
        passed,
        coverage,
        meanErrorPx,
        statusMismatches,
        confidenceCalibration: calculateConfidenceCalibration(frames),
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
    const meanErrorPx = results.length > 0
        ? results.reduce((sum, result) => sum + result.meanErrorPx, 0) / results.length
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
            meanErrorPx,
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

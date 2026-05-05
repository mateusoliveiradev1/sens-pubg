import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveSprayProjectionConfig } from '../src/app/analyze/analysis-session-config';
import type { TrackingResult } from '../src/core/crosshair-tracking';
import { buildTrajectory, calculateSprayMetrics, generateCoaching, generateSensitivityRecommendation, runDiagnostics as runCoreDiagnostics } from '../src/core';
import { buildCoachPlan } from '../src/core/coach-plan-builder';
import { resolveMeasurementTruth } from '../src/core/measurement-truth';
import { getWeapon } from '../src/game/pubg';
import { asMilliseconds, asPixels, asScore } from '../src/types/branded';
import { parseCapturedFrameLabelTemplate, type CapturedFrameLabelTemplate } from '../src/types/captured-frame-labels';
import { parseBenchmarkDataset, type BenchmarkClip, type BenchmarkCoachPlanExpectation, type BenchmarkDataset, type BenchmarkTruthExpectation } from '../src/types/benchmark';
import type { AnalysisResult, CoachFeedback, CoachMode, Diagnosis, MetricEvidenceQuality, SprayMetricQuality, SprayMetricQualityKey, SprayMetrics, TrackingFrameStatus, VideoQualityReport, WeaponLoadout } from '../src/types/engine';
import {
    evaluateCoachGoldenFixture,
    loadCoachGoldenFixture,
} from './run-coach-goldens';
import {
    evaluateDiagnosticGoldenFixture,
    loadDiagnosticGoldenFixture,
    type DiagnosticGoldenFixture,
} from './run-diagnostic-goldens';
import {
    evaluateTrackingGoldenFixture,
    loadTrackingGoldenFixture,
    type ConfidenceCalibrationSummary,
    type TrackingGoldenFixture,
    type TrackingGoldenFixtureResult,
} from './run-tracking-goldens';

export interface BenchmarkClipResult {
    readonly clipId: string;
    readonly sourceType: BenchmarkSourceType;
    readonly reviewStatus: BenchmarkClip['quality']['reviewStatus'];
    readonly reviewProvenanceSource?: NonNullable<BenchmarkClip['quality']['reviewProvenance']>['source'];
    readonly passed: boolean;
    readonly tracking: {
        readonly passed: boolean;
        readonly fixtureName: string;
        readonly expectedTier: 'clean' | 'degraded';
        readonly actualTier: 'clean' | 'degraded';
        readonly coverage: number;
        readonly meanErrorPx: number;
        readonly shotAlignmentErrorMs: number;
        readonly statusMismatches: number;
        readonly confidenceCalibration: ConfidenceCalibrationSummary;
        readonly error?: string;
    };
    readonly diagnostics: {
        readonly passed: boolean;
        readonly fixtureName: string;
        readonly expectedTypes: readonly string[];
        readonly actualTypes: readonly string[];
        readonly error?: string;
    };
    readonly coach: {
        readonly passed: boolean;
        readonly fixtureName: string;
        readonly expectedMode?: CoachMode;
        readonly actualMode?: CoachMode;
        readonly expectedPlan?: BenchmarkCoachPlanExpectation;
        readonly actualPlan?: BenchmarkCoachPlanExpectation;
        readonly error?: string;
    };
    readonly truth: {
        readonly passed: boolean;
        readonly fixtureName: string;
        readonly expected: BenchmarkTruthExpectation;
        readonly actual?: BenchmarkTruthExpectation;
        readonly mismatches: readonly string[];
        readonly error?: string;
    };
}

export type BenchmarkSourceType = BenchmarkClip['quality']['sourceType'];
export type BenchmarkSourceBreakdown = Partial<Record<BenchmarkSourceType, BenchmarkReportSummary>>;

export interface BenchmarkReportSummary {
    readonly totalClips: number;
    readonly failedClips: number;
    readonly tracking: {
        readonly passed: number;
        readonly total: number;
        readonly meanCoverage: number;
        readonly meanErrorPx: number;
        readonly meanShotAlignmentErrorMs: number;
        readonly confidenceCalibration: ConfidenceCalibrationSummary;
    };
    readonly diagnostics: {
        readonly passed: number;
        readonly total: number;
    };
    readonly coach: {
        readonly passed: number;
        readonly total: number;
    };
    readonly truth: {
        readonly passed: number;
        readonly total: number;
    };
    readonly score: number;
}

export interface BenchmarkRegressionBaseline {
    readonly datasetId: string;
    readonly recordedAt: string;
    readonly summary: {
        readonly failedClips: number;
        readonly score: number;
        readonly trackingMeanCoverage: number;
        readonly trackingMeanErrorPx: number;
        readonly trackingMeanShotAlignmentErrorMs: number;
        readonly diagnosticsPassRate: number;
        readonly coachPassRate: number;
        readonly truthPassRate?: number;
    };
}

export interface BenchmarkRegressionResult {
    readonly baselineDatasetId: string;
    readonly isRegression: boolean;
    readonly deltas: {
        readonly failedClips: number;
        readonly score: number;
        readonly trackingMeanCoverage: number;
        readonly trackingMeanErrorPx: number;
        readonly trackingMeanShotAlignmentErrorMs: number;
        readonly diagnosticsPassRate: number;
        readonly coachPassRate: number;
        readonly truthPassRate?: number;
    };
}

export interface BenchmarkReport {
    readonly datasetId: string;
    readonly generatedAt: string;
    readonly passed: boolean;
    readonly summary: BenchmarkReportSummary;
    readonly sourceBreakdown: BenchmarkSourceBreakdown;
    readonly clips: readonly BenchmarkClipResult[];
    readonly regression?: BenchmarkRegressionResult;
}

export interface RunBenchmarkOptions {
    readonly datasetPath?: string;
    readonly baselinePath?: string;
}

const metricQualityKeys: readonly SprayMetricQualityKey[] = [
    'stabilityScore',
    'verticalControlIndex',
    'horizontalNoiseIndex',
    'shotAlignmentErrorMs',
    'angularErrorDegrees',
    'linearErrorCm',
    'linearErrorSeverity',
    'initialRecoilResponseMs',
    'driftDirectionBias',
    'consistencyScore',
    'burstVCI',
    'sustainedVCI',
    'fatigueVCI',
    'burstHNI',
    'sustainedHNI',
    'fatigueHNI',
    'shotResiduals',
    'sprayScore',
] as const;

function toFixedNumber(value: number, digits = 4): number {
    return Number(value.toFixed(digits));
}

function passRate(passed: number, total: number): number {
    if (total === 0) return 1;
    return passed / total;
}

function aggregateConfidenceCalibration(
    calibrations: readonly ConfidenceCalibrationSummary[]
): ConfidenceCalibrationSummary {
    const sampleCount = calibrations.reduce((sum, calibration) => sum + calibration.sampleCount, 0);

    if (sampleCount === 0) {
        return {
            sampleCount: 0,
            meanConfidence: 0,
            observedVisibleRate: 0,
            brierScore: 0,
            expectedCalibrationError: 0,
        };
    }

    const weightedMean = (key: keyof Omit<ConfidenceCalibrationSummary, 'sampleCount'>): number =>
        calibrations.reduce(
            (sum, calibration) => sum + (calibration[key] * calibration.sampleCount),
            0
        ) / sampleCount;

    return {
        sampleCount,
        meanConfidence: toFixedNumber(weightedMean('meanConfidence')),
        observedVisibleRate: toFixedNumber(weightedMean('observedVisibleRate')),
        brierScore: toFixedNumber(weightedMean('brierScore')),
        expectedCalibrationError: toFixedNumber(weightedMean('expectedCalibrationError')),
    };
}

function emptyConfidenceCalibration(): ConfidenceCalibrationSummary {
    return {
        sampleCount: 0,
        meanConfidence: 0,
        observedVisibleRate: 0,
        brierScore: 0,
        expectedCalibrationError: 0,
    };
}

function makeMetricQuality(overrides: Partial<MetricEvidenceQuality> = {}): SprayMetricQuality {
    const evidence: MetricEvidenceQuality = {
        coverage: 1,
        confidence: 1,
        sampleSize: 30,
        framesTracked: 30,
        framesLost: 0,
        framesProcessed: 30,
        ...overrides,
    };

    return Object.fromEntries(
        metricQualityKeys.map((key) => [key, evidence])
    ) as SprayMetricQuality;
}

function makeDiagnosticMetrics(fixture: DiagnosticGoldenFixture): SprayMetrics {
    return {
        stabilityScore: asScore(70),
        verticalControlIndex: 1.0,
        horizontalNoiseIndex: 0.1,
        shotAlignmentErrorMs: 0,
        angularErrorDegrees: 0.1,
        linearErrorCm: 1,
        linearErrorSeverity: 1,
        targetDistanceMeters: 30,
        initialRecoilResponseMs: asMilliseconds(100),
        driftDirectionBias: { direction: 'neutral', magnitude: 0 },
        consistencyScore: asScore(70),
        burstVCI: 1.0,
        sustainedVCI: 1.0,
        fatigueVCI: 1.0,
        burstHNI: 0.1,
        sustainedHNI: 0.1,
        fatigueHNI: 0.1,
        shotResiduals: [],
        metricQuality: makeMetricQuality(fixture.metricQualityOverrides ?? {}),
        sprayScore: 80,
        ...(fixture.metricOverrides ?? {}),
    };
}

function stableJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
}

function isVisibleTrackingStatus(status: TrackingFrameStatus): boolean {
    return status === 'tracked' || status === 'uncertain';
}

function confidenceForTrackingStatus(status: TrackingFrameStatus): number {
    if (status === 'tracked') return 1;
    if (status === 'uncertain') return 0.69;
    return 0;
}

function createSyntheticTrackingFrameObservation(input: {
    readonly frame: number;
    readonly timestamp: ReturnType<typeof asMilliseconds>;
    readonly status: TrackingFrameStatus;
    readonly confidence: number;
    readonly visiblePixels: number;
    readonly x?: ReturnType<typeof asPixels>;
    readonly y?: ReturnType<typeof asPixels>;
}): TrackingResult['trackingFrames'][number] {
    const base = {
        frame: input.frame,
        timestamp: input.timestamp,
        status: input.status,
        confidence: input.confidence,
        visiblePixels: input.visiblePixels,
        colorState: 'unknown' as const,
        exogenousDisturbance: {
            muzzleFlash: 0,
            blur: input.visiblePixels > 0 ? Math.max(0, Math.min(1, 1 - input.confidence)) : 0.25,
            shake: 0,
            occlusion: input.status === 'lost' || input.status === 'occluded'
                ? 1
                : input.visiblePixels === 0
                    ? 0.65
                    : 0,
        },
    };

    if (input.x === undefined || input.y === undefined) {
        return base;
    }

    return {
        ...base,
        x: input.x,
        y: input.y,
    };
}

function createTrackingStatusCounts(): Record<TrackingFrameStatus, number> {
    return {
        tracked: 0,
        occluded: 0,
        lost: 0,
        uncertain: 0,
    };
}

function calculateTrackingQuality(
    counts: Record<TrackingFrameStatus, number>,
    framesProcessed: number
): number {
    if (framesProcessed === 0) return 0;
    return (counts.tracked + (counts.uncertain * 0.5)) / framesProcessed;
}

interface CapturedBenchmarkProxy {
    readonly trackingFixture: TrackingGoldenFixture;
    readonly actualTrackingTier: 'clean' | 'degraded';
    readonly shotAlignmentErrorMs: number;
    readonly diagnoses: readonly Diagnosis[];
    readonly coaching: readonly CoachFeedback[];
    readonly coachPlan: BenchmarkCoachPlanExpectation;
    readonly truth: BenchmarkTruthExpectation;
}

type CapturedLabelStatus = Exclude<CapturedFrameLabelTemplate['frames'][number]['label']['status'], null>;

function resolveInputPath(filePath: string): string {
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

async function loadBenchmarkDataset(datasetPath: string): Promise<BenchmarkDataset> {
    const raw = await readFile(datasetPath, 'utf8');
    return parseBenchmarkDataset(JSON.parse(raw));
}

async function loadBenchmarkBaseline(baselinePath: string): Promise<BenchmarkRegressionBaseline> {
    const raw = await readFile(baselinePath, 'utf8');
    return JSON.parse(raw) as BenchmarkRegressionBaseline;
}

function getCapturedFrameLabelsPath(clip: BenchmarkClip): string {
    const frameLabelsPath = clip.media.frameLabelsPath;
    if (!frameLabelsPath) {
        throw new Error(`Clip ${clip.clipId} nao define trackingFixturePath nem media.frameLabelsPath`);
    }

    return resolveInputPath(frameLabelsPath);
}

function toCapturedTrackingTier(clip: BenchmarkClip): 'clean' | 'degraded' {
    return clip.quality.visibilityTier === 'clean' ? 'clean' : 'degraded';
}

function normalizeCapturedTrackingStatus(status: CapturedLabelStatus, hasVisibleHistory: boolean): TrackingFrameStatus {
    return status === 'lost' && hasVisibleHistory ? 'occluded' : status;
}

function buildTrackingGoldenFixtureFromCapturedLabels(
    clip: BenchmarkClip,
    template: CapturedFrameLabelTemplate
): TrackingGoldenFixture {
    let hasVisibleHistory = false;

    return {
        version: 1,
        name: `captured-frame-labels:${clip.clipId}`,
        // Proxy fixture: renders the reviewed labels into a deterministic frame sequence.
        color: 'RED',
        frameSize: template.frameSize,
        roiRadiusPx: Math.max(24, Math.round(Math.min(template.frameSize.width, template.frameSize.height) * 0.05)),
        thresholds: {
            minCoverage: 1,
            maxMeanErrorPx: 0.01,
            maxStatusMismatches: 0,
            maxBrierScore: 0.25,
            maxExpectedCalibrationError: 0.25,
        },
        frames: template.frames.map((frame) => {
            const { status, x, y } = frame.label;
            if (status === null) {
                throw new Error(`Frame ${frame.frameIndex} de ${clip.clipId} ainda nao foi rotulado`);
            }

            const expectedStatus = status === 'lost' && hasVisibleHistory ? 'occluded' : status;
            const isVisible = expectedStatus === 'tracked' || expectedStatus === 'uncertain';

            if (isVisible && (x === null || y === null || x === undefined || y === undefined)) {
                throw new Error(`Frame ${frame.frameIndex} de ${clip.clipId} precisa de coordenadas x/y para status ${expectedStatus}`);
            }

            if (isVisible) {
                hasVisibleHistory = true;
            }

            return {
                timestamp: Math.round(frame.timestampSeconds * 1000),
                ...(isVisible
                    ? {
                        reticle: {
                            x: Math.round(x!),
                            y: Math.round(y!),
                            shape: expectedStatus === 'uncertain' ? 'plus' : 'block',
                            ...(expectedStatus === 'tracked' ? { size: 5 } : {}),
                        },
                    }
                    : {}),
                expected: {
                    status: expectedStatus,
                    ...(isVisible
                        ? {
                            x: Math.round(x!),
                            y: Math.round(y!),
                        }
                        : {}),
                },
            };
        }),
    };
}

function buildTrackingResultFromTrackingFixture(
    fixture: TrackingGoldenFixture
): TrackingResult {
    const points: TrackingResult['points'][number][] = [];
    const trackingFrames: TrackingResult['trackingFrames'][number][] = [];
    const statusCounts = createTrackingStatusCounts();

    let lastKnownPosition: { readonly x: ReturnType<typeof asPixels>; readonly y: ReturnType<typeof asPixels> } | undefined;
    let framesLost = 0;

    for (let frameIndex = 0; frameIndex < fixture.frames.length; frameIndex++) {
        const frame = fixture.frames[frameIndex]!;
        const status = frame.expected.status;
        const isVisible = isVisibleTrackingStatus(status);
        const timestamp = asMilliseconds(frame.timestamp);
        const confidence = confidenceForTrackingStatus(status);

        if (isVisible) {
            lastKnownPosition = {
                x: asPixels(frame.expected.x!),
                y: asPixels(frame.expected.y!),
            };
        } else {
            framesLost++;
        }

        statusCounts[status]++;
        trackingFrames.push(createSyntheticTrackingFrameObservation({
            frame: frameIndex,
            timestamp,
            status,
            confidence,
            visiblePixels: isVisible ? 25 : 0,
            ...(isVisible
                ? {
                    x: lastKnownPosition!.x,
                    y: lastKnownPosition!.y,
                }
                : {}),
        }));

        if (isVisible || lastKnownPosition) {
            points.push({
                frame: frameIndex,
                timestamp,
                x: isVisible ? lastKnownPosition!.x : lastKnownPosition!.x,
                y: isVisible ? lastKnownPosition!.y : lastKnownPosition!.y,
                confidence,
            });
        }
    }

    if (points.length === 0) {
        throw new Error(`Fixture ${fixture.name} nao possui pontos suficientes para calcular alinhamento temporal`);
    }

    const framesTracked = statusCounts.tracked + statusCounts.uncertain;

    return {
        points,
        trackingFrames,
        trackingQuality: calculateTrackingQuality(statusCounts, fixture.frames.length),
        framesTracked,
        framesLost,
        visibleFrames: framesTracked,
        framesProcessed: fixture.frames.length,
        statusCounts,
    };
}

function selectCapturedFramesForSprayWindow(
    clip: BenchmarkClip,
    template: CapturedFrameLabelTemplate
): readonly CapturedFrameLabelTemplate['frames'][number][] {
    if (!clip.sprayWindow) {
        return template.frames;
    }

    const frames = template.frames.filter((frame) => (
        frame.timestampSeconds >= clip.sprayWindow!.startSeconds &&
        frame.timestampSeconds <= clip.sprayWindow!.endSeconds
    ));

    if (frames.length === 0) {
        throw new Error(
            `Clip ${clip.clipId} nao possui frames rotulados dentro de sprayWindow ${clip.sprayWindow.startSeconds}-${clip.sprayWindow.endSeconds}s`
        );
    }

    return frames;
}

function buildCapturedTrackingResult(
    clip: BenchmarkClip,
    template: CapturedFrameLabelTemplate
): TrackingResult {
    const frames = selectCapturedFramesForSprayWindow(clip, template);
    const points: TrackingResult['points'][number][] = [];
    const trackingFrames: TrackingResult['trackingFrames'][number][] = [];
    const statusCounts = createTrackingStatusCounts();

    let hasVisibleHistory = false;
    let lastKnownPosition: { readonly x: ReturnType<typeof asPixels>; readonly y: ReturnType<typeof asPixels> } | undefined;
    let framesLost = 0;

    for (const frame of frames) {
        const { status: rawStatus, x, y } = frame.label;
        if (rawStatus === null) {
            throw new Error(`Frame ${frame.frameIndex} de ${clip.clipId} ainda nao foi rotulado`);
        }

        const status = normalizeCapturedTrackingStatus(rawStatus, hasVisibleHistory);
        const isVisible = isVisibleTrackingStatus(status);
        const timestamp = asMilliseconds(Math.round(frame.timestampSeconds * 1000));
        const confidence = confidenceForTrackingStatus(status);

        if (isVisible && (x === null || y === null || x === undefined || y === undefined)) {
            throw new Error(`Frame ${frame.frameIndex} de ${clip.clipId} precisa de coordenadas x/y para status ${status}`);
        }

        if (isVisible) {
            lastKnownPosition = {
                x: asPixels(x!),
                y: asPixels(y!),
            };
            hasVisibleHistory = true;
        } else {
            framesLost++;
        }

        statusCounts[status]++;
        trackingFrames.push(createSyntheticTrackingFrameObservation({
            frame: frame.frameIndex,
            timestamp,
            status,
            confidence,
            visiblePixels: isVisible ? 25 : 0,
            ...(isVisible
                ? {
                    x: lastKnownPosition!.x,
                    y: lastKnownPosition!.y,
                }
                : {}),
        }));

        if (isVisible || lastKnownPosition) {
            points.push({
                frame: frame.frameIndex,
                timestamp,
                x: isVisible ? lastKnownPosition!.x : lastKnownPosition!.x,
                y: isVisible ? lastKnownPosition!.y : lastKnownPosition!.y,
                confidence,
            });
        }
    }

    if (points.length === 0) {
        throw new Error(`Clip ${clip.clipId} nao possui pontos suficientes para replay capturado`);
    }

    const framesTracked = statusCounts.tracked + statusCounts.uncertain;

    return {
        points,
        trackingFrames,
        trackingQuality: calculateTrackingQuality(statusCounts, frames.length),
        framesTracked,
        framesLost,
        visibleFrames: framesTracked,
        framesProcessed: frames.length,
        statusCounts,
    };
}

async function loadCapturedFrameLabelTemplateForClip(clip: BenchmarkClip): Promise<CapturedFrameLabelTemplate> {
    const raw = await readFile(getCapturedFrameLabelsPath(clip), 'utf8');
    return parseCapturedFrameLabelTemplate(JSON.parse(raw));
}

function buildCapturedBenchmarkProxy(
    clip: BenchmarkClip,
    template: CapturedFrameLabelTemplate
): CapturedBenchmarkProxy {
    const weapon = getWeapon(clip.capture.weaponId);
    if (!weapon) {
        throw new Error(`weaponId "${clip.capture.weaponId}" nao existe para o clip ${clip.clipId}`);
    }

    const loadout: WeaponLoadout = {
        stance: clip.capture.stance,
        muzzle: clip.capture.attachments.muzzle,
        grip: clip.capture.attachments.grip,
        stock: clip.capture.attachments.stock,
    };
    const trackingResult = buildCapturedTrackingResult(clip, template);
    const trajectory = buildTrajectory(trackingResult, weapon);
    const projectionConfig = resolveSprayProjectionConfig({
        widthPx: template.frameSize.width,
        heightPx: template.frameSize.height,
        baseHorizontalFovDegrees: 90,
        patchVersion: clip.capture.patchVersion,
        opticId: clip.capture.optic.opticId,
        opticStateId: clip.capture.optic.stateId,
    });
    const metrics = calculateSprayMetrics(
        trajectory,
        weapon,
        loadout,
        projectionConfig,
        clip.capture.distanceMeters
    );
    const diagnoses = runCoreDiagnostics(metrics, weapon.category);
    const coaching = generateCoaching(diagnoses, loadout, {
        patchVersion: clip.capture.patchVersion,
        opticId: clip.capture.optic.opticId,
        opticStateId: clip.capture.optic.stateId,
    });
    const sensitivity = generateSensitivityRecommendation(
        metrics,
        diagnoses,
        800,
        'hybrid',
        'claw',
        45,
        {},
        1,
        45,
    );
    const analysisResultBase: AnalysisResult = {
        id: clip.clipId,
        timestamp: new Date(clip.quality.reviewProvenance?.reviewedAt ?? '2026-04-18T00:00:00.000Z'),
        patchVersion: clip.capture.patchVersion,
        analysisContext: {
            targetDistanceMeters: clip.capture.distanceMeters,
            distanceMode: 'exact',
            optic: {
                scopeId: clip.capture.optic.opticId,
                opticId: clip.capture.optic.opticId,
                opticStateId: clip.capture.optic.stateId,
                opticName: clip.capture.optic.opticId,
                opticStateName: clip.capture.optic.stateId,
                availableStateIds: [clip.capture.optic.stateId],
                isDynamicOptic: false,
            },
        },
        videoQualityReport: buildBenchmarkVideoQualityReport(clip),
        trajectory,
        loadout,
        metrics,
        diagnoses,
        sensitivity,
        coaching,
    };
    const coachPlan = buildCoachPlan({ analysisResult: analysisResultBase });
    const mastery = resolveMeasurementTruth({
        metrics,
        trajectory,
        sensitivity,
        ...(analysisResultBase.videoQualityReport ? { videoQualityReport: analysisResultBase.videoQualityReport } : {}),
        diagnoses,
        coachPlan,
    });
    const analysisResult: AnalysisResult = {
        ...analysisResultBase,
        coachPlan,
        mastery,
    };

    return {
        trackingFixture: buildTrackingGoldenFixtureFromCapturedLabels(clip, template),
        actualTrackingTier: toCapturedTrackingTier(clip),
        shotAlignmentErrorMs: trajectory.shotAlignmentErrorMs,
        diagnoses,
        coaching,
        coachPlan: toStableCoachPlanExpectation(coachPlan),
        truth: toStableTruthExpectation(analysisResult, coachPlan),
    };
}

function buildBenchmarkVideoQualityReport(clip: BenchmarkClip): VideoQualityReport {
    const score = scoreForVisibilityTier(clip.quality.visibilityTier);
    const compressionBurden = clip.quality.compressionLevel === 'heavy'
        ? 86
        : clip.quality.compressionLevel === 'medium'
            ? 52
            : 18;
    const usableForAnalysis = clip.quality.visibilityTier !== 'rejected';

    return {
        overallScore: asScore(score),
        sharpness: asScore(Math.max(20, score - 4)),
        compressionBurden: asScore(compressionBurden),
        reticleContrast: asScore(Math.max(20, score - 8)),
        roiStability: asScore(clip.quality.occlusionLevel === 'moderate' ? 58 : 82),
        fpsStability: asScore(80),
        usableForAnalysis,
        blockingReasons: usableForAnalysis ? [] : ['low_reticle_contrast'],
        diagnostic: {
            tier: clip.quality.visibilityTier === 'clean' ? 'analysis_ready' : 'limited',
            summary: clip.quality.notes ?? `Benchmark capture quality is ${clip.quality.visibilityTier}.`,
            recommendations: [],
            preprocessing: {
                normalizationApplied: false,
                sampledFrames: 0,
                selectedFrames: 0,
            },
        },
    };
}

function scoreForVisibilityTier(tier: BenchmarkClip['quality']['visibilityTier']): number {
    switch (tier) {
        case 'clean':
            return 82;
        case 'degraded':
            return 58;
        case 'rejected':
            return 28;
    }
}

function evidenceTierForMastery(input: AnalysisResult): BenchmarkTruthExpectation['evidenceTier'] {
    const mastery = input.mastery;
    const coverage = mastery?.evidence.coverage ?? 0;
    const confidence = mastery?.evidence.confidence ?? 0;
    const qualityScore = mastery?.evidence.qualityScore ?? 0;
    const usableForAnalysis = mastery?.evidence.usableForAnalysis ?? true;
    const weakestEvidence = Math.min(coverage, confidence);

    if (!usableForAnalysis || weakestEvidence < 0.6) {
        return 'weak';
    }

    if (weakestEvidence >= 0.8 && qualityScore >= 70) {
        return 'strong';
    }

    return 'moderate';
}

function toStableCoachPlanExpectation(
    coachPlan: ReturnType<typeof buildCoachPlan>
): BenchmarkCoachPlanExpectation {
    return {
        tier: coachPlan.tier,
        primaryFocusArea: coachPlan.primaryFocus.area,
        nextBlockTitle: coachPlan.nextBlock.title,
    };
}

function toStableTruthExpectation(
    analysisResult: AnalysisResult,
    coachPlan: ReturnType<typeof buildCoachPlan>
): BenchmarkTruthExpectation {
    const mastery = analysisResult.mastery ?? resolveMeasurementTruth({
        metrics: analysisResult.metrics,
        trajectory: analysisResult.trajectory,
        sensitivity: analysisResult.sensitivity,
        ...(analysisResult.videoQualityReport ? { videoQualityReport: analysisResult.videoQualityReport } : {}),
        diagnoses: analysisResult.diagnoses,
        coachPlan,
        ...(analysisResult.subSessions ? { subSessions: analysisResult.subSessions } : {}),
    });
    const nextBlockCheck = coachPlan.nextBlock.checks[0];
    const primaryProtocol = coachPlan.actionProtocols[0];

    return {
        actionState: mastery.actionState,
        mechanicalLevel: mastery.mechanicalLevel,
        evidenceTier: evidenceTierForMastery({ ...analysisResult, mastery }),
        weakEvidenceDowngrade: mastery.blockedRecommendations.length > 0,
        primaryFocusArea: coachPlan.primaryFocus.area,
        ...(coachPlan.secondaryFocuses.length > 0
            ? { secondaryFocusAreas: coachPlan.secondaryFocuses.map((focus) => focus.area) }
            : {}),
        nextBlock: {
            tier: coachPlan.tier,
            key: primaryProtocol?.id ?? coachPlan.nextBlock.title,
            title: coachPlan.nextBlock.title,
            durationMinutes: coachPlan.nextBlock.durationMinutes,
            ...(primaryProtocol ? { exercise: primaryProtocol.instruction } : {}),
            ...(coachPlan.nextBlock.steps[0] ? { stepMarker: coachPlan.nextBlock.steps[0] } : {}),
            target: nextBlockCheck?.target ?? coachPlan.nextBlock.title,
            minimumCoverage: nextBlockCheck?.minimumCoverage ?? 0,
            minimumConfidence: nextBlockCheck?.minimumConfidence ?? 0,
            successCondition: nextBlockCheck?.successCondition ?? coachPlan.nextBlock.title,
            failCondition: nextBlockCheck?.failCondition ?? coachPlan.nextBlock.title,
            nextClipValidation: nextBlockCheck?.label ?? coachPlan.nextBlock.title,
        },
    };
}

function createCapturedBenchmarkProxyLoader(
    clip: BenchmarkClip
): (() => Promise<CapturedBenchmarkProxy>) | undefined {
    const requiresCapturedProxy = (
        !clip.fixtures?.trackingFixturePath ||
        !clip.fixtures?.diagnosticFixturePath ||
        !clip.fixtures?.coachFixturePath
    );

    if (!requiresCapturedProxy || !clip.media.frameLabelsPath) {
        return undefined;
    }

    let proxyPromise: Promise<CapturedBenchmarkProxy> | undefined;

    return () => {
        proxyPromise ??= loadCapturedFrameLabelTemplateForClip(clip)
            .then((template) => buildCapturedBenchmarkProxy(clip, template));
        return proxyPromise;
    };
}

async function buildSyntheticTruthExpectation(clip: BenchmarkClip): Promise<BenchmarkTruthExpectation> {
    const weapon = getWeapon(clip.capture.weaponId);
    if (!weapon) {
        throw new Error(`weaponId "${clip.capture.weaponId}" nao existe para o clip ${clip.clipId}`);
    }

    const trackingFixturePath = clip.fixtures?.trackingFixturePath;
    const diagnosticFixturePath = clip.fixtures?.diagnosticFixturePath;
    if (!trackingFixturePath || !diagnosticFixturePath) {
        throw new Error(`Clip ${clip.clipId} precisa de trackingFixturePath e diagnosticFixturePath para validar truth`);
    }

    const trackingFixture = await loadTrackingGoldenFixture(resolveInputPath(trackingFixturePath));
    const diagnosticFixture = await loadDiagnosticGoldenFixture(resolveInputPath(diagnosticFixturePath));
    const trackingResult = buildTrackingResultFromTrackingFixture(trackingFixture);
    const trajectory = buildTrajectory(trackingResult, weapon);
    const loadout: WeaponLoadout = {
        stance: clip.capture.stance,
        muzzle: clip.capture.attachments.muzzle,
        grip: clip.capture.attachments.grip,
        stock: clip.capture.attachments.stock,
    };
    const metrics = makeDiagnosticMetrics(diagnosticFixture);
    const diagnoses = runCoreDiagnostics(metrics, weapon.category);
    const coaching = generateCoaching(diagnoses, loadout, {
        patchVersion: clip.capture.patchVersion,
        opticId: clip.capture.optic.opticId,
        opticStateId: clip.capture.optic.stateId,
    });
    const sensitivity = generateSensitivityRecommendation(
        metrics,
        diagnoses,
        800,
        'hybrid',
        'claw',
        45,
        {},
        1,
        45,
    );
    const analysisResultBase: AnalysisResult = {
        id: clip.clipId,
        timestamp: new Date(clip.quality.reviewProvenance?.reviewedAt ?? '2026-04-18T00:00:00.000Z'),
        patchVersion: clip.capture.patchVersion,
        analysisContext: {
            targetDistanceMeters: clip.capture.distanceMeters,
            distanceMode: 'exact',
            optic: {
                scopeId: clip.capture.optic.opticId,
                opticId: clip.capture.optic.opticId,
                opticStateId: clip.capture.optic.stateId,
                opticName: clip.capture.optic.opticId,
                opticStateName: clip.capture.optic.stateId,
                availableStateIds: [clip.capture.optic.stateId],
                isDynamicOptic: false,
            },
        },
        videoQualityReport: buildBenchmarkVideoQualityReport(clip),
        trajectory,
        loadout,
        metrics,
        diagnoses,
        sensitivity,
        coaching,
    };
    const coachPlan = buildCoachPlan({ analysisResult: analysisResultBase });
    const mastery = resolveMeasurementTruth({
        metrics,
        trajectory,
        sensitivity,
        ...(analysisResultBase.videoQualityReport ? { videoQualityReport: analysisResultBase.videoQualityReport } : {}),
        diagnoses,
        coachPlan,
    });

    return toStableTruthExpectation({
        ...analysisResultBase,
        coachPlan,
        mastery,
    }, coachPlan);
}

function deriveTrackingTier(result: TrackingGoldenFixtureResult): 'clean' | 'degraded' {
    const hasDegradedSignal = result.frames.some((frame) => frame.actualStatus !== 'tracked');
    return hasDegradedSignal ? 'degraded' : 'clean';
}

function deriveCoachMode(feedback: readonly { readonly mode: CoachMode }[]): CoachMode | undefined {
    const modes = feedback.map((entry) => entry.mode);

    if (modes.includes('inconclusive')) return 'inconclusive';
    if (modes.includes('low-confidence')) return 'low-confidence';
    if (modes.includes('standard')) return 'standard';
    return undefined;
}

async function runTrackingBenchmark(
    clip: BenchmarkClip,
    loadCapturedProxy?: () => Promise<CapturedBenchmarkProxy>
): Promise<BenchmarkClipResult['tracking']> {
    try {
        const fixturePath = clip.fixtures?.trackingFixturePath;
        const fixture = fixturePath
            ? await loadTrackingGoldenFixture(resolveInputPath(fixturePath))
            : (await loadCapturedProxy?.())?.trackingFixture;

        if (!fixture) {
            throw new Error(`Clip ${clip.clipId} nao define trackingFixturePath nem media.frameLabelsPath`);
        }

        const result = evaluateTrackingGoldenFixture(fixture);
        const shotAlignmentErrorMs = fixturePath
            ? (() => {
                const weapon = getWeapon(clip.capture.weaponId);
                if (!weapon) {
                    throw new Error(`weaponId "${clip.capture.weaponId}" nao existe para o clip ${clip.clipId}`);
                }

                return buildTrajectory(buildTrackingResultFromTrackingFixture(fixture), weapon).shotAlignmentErrorMs;
            })()
            : (await loadCapturedProxy?.())?.shotAlignmentErrorMs ?? 0;
        const actualTier = fixturePath
            ? deriveTrackingTier(result)
            : (await loadCapturedProxy?.())?.actualTrackingTier ?? deriveTrackingTier(result);

        return {
            passed: result.passed && actualTier === clip.labels.expectedTrackingTier,
            fixtureName: result.name,
            expectedTier: clip.labels.expectedTrackingTier,
            actualTier,
            coverage: toFixedNumber(result.coverage),
            meanErrorPx: toFixedNumber(result.meanErrorPx),
            shotAlignmentErrorMs: toFixedNumber(shotAlignmentErrorMs),
            statusMismatches: result.statusMismatches,
            confidenceCalibration: result.confidenceCalibration,
        };
    } catch (error) {
        return {
            passed: false,
            fixtureName: '(missing tracking fixture)',
            expectedTier: clip.labels.expectedTrackingTier,
            actualTier: clip.labels.expectedTrackingTier,
            coverage: 0,
            meanErrorPx: 0,
            shotAlignmentErrorMs: 0,
            statusMismatches: 0,
            confidenceCalibration: emptyConfidenceCalibration(),
            error: error instanceof Error ? error.message : 'erro desconhecido no benchmark de tracking',
        };
    }
}

async function runDiagnosticBenchmark(
    clip: BenchmarkClip,
    loadCapturedProxy?: () => Promise<CapturedBenchmarkProxy>
): Promise<BenchmarkClipResult['diagnostics']> {
    try {
        const fixturePath = clip.fixtures?.diagnosticFixturePath;
        if (fixturePath) {
            const fixture = await loadDiagnosticGoldenFixture(resolveInputPath(fixturePath));
            const result = evaluateDiagnosticGoldenFixture(fixture);

            return {
                passed: result.passed,
                fixtureName: result.name,
                expectedTypes: result.expectedDiagnosisTypes,
                actualTypes: result.actualDiagnosisTypes,
            };
        }

        const capturedProxy = await loadCapturedProxy?.();
        if (!capturedProxy) {
            throw new Error(`Clip ${clip.clipId} nao define diagnosticFixturePath nem media.frameLabelsPath`);
        }

        const actualTypes = capturedProxy.diagnoses.map((diagnosis) => diagnosis.type);
        const expectedTypes = clip.labels.expectedDiagnoses;

        return {
            passed: stableJson(actualTypes) === stableJson(expectedTypes),
            fixtureName: `captured-pipeline:${clip.clipId}`,
            expectedTypes,
            actualTypes,
        };
    } catch (error) {
        return {
            passed: false,
            fixtureName: '(missing diagnostic fixture)',
            expectedTypes: clip.labels.expectedDiagnoses,
            actualTypes: [],
            error: error instanceof Error ? error.message : 'erro desconhecido no benchmark de diagnostico',
        };
    }
}

async function runCoachBenchmark(
    clip: BenchmarkClip,
    loadCapturedProxy?: () => Promise<CapturedBenchmarkProxy>
): Promise<BenchmarkClipResult['coach']> {
    try {
        const fixturePath = clip.fixtures?.coachFixturePath;
        if (fixturePath) {
            const fixture = await loadCoachGoldenFixture(resolveInputPath(fixturePath));
            const result = evaluateCoachGoldenFixture(fixture);
            const actualMode = deriveCoachMode(result.actual);

            return {
                passed: result.passed && actualMode === clip.labels.expectedCoachMode,
                fixtureName: result.name,
                ...(clip.labels.expectedCoachMode !== undefined ? { expectedMode: clip.labels.expectedCoachMode } : {}),
                ...(actualMode !== undefined ? { actualMode } : {}),
            };
        }

        const capturedProxy = await loadCapturedProxy?.();
        if (!capturedProxy) {
            throw new Error(`Clip ${clip.clipId} nao define coachFixturePath nem media.frameLabelsPath`);
        }

        const actualMode = deriveCoachMode(capturedProxy.coaching);
        const actualPlan = capturedProxy.coachPlan;
        const expectedPlan = clip.labels.expectedCoachPlan;
        const planPassed = expectedPlan === undefined || stableJson(actualPlan) === stableJson(expectedPlan);

        return {
            passed: actualMode === clip.labels.expectedCoachMode && planPassed,
            fixtureName: `captured-pipeline:${clip.clipId}`,
            ...(clip.labels.expectedCoachMode !== undefined ? { expectedMode: clip.labels.expectedCoachMode } : {}),
            ...(actualMode !== undefined ? { actualMode } : {}),
            ...(expectedPlan !== undefined ? { expectedPlan } : {}),
            actualPlan,
        };
    } catch (error) {
        return {
            passed: false,
            fixtureName: '(missing coach fixture)',
            ...(clip.labels.expectedCoachMode !== undefined ? { expectedMode: clip.labels.expectedCoachMode } : {}),
            error: error instanceof Error ? error.message : 'erro desconhecido no benchmark de coaching',
        };
    }
}

function compareTruthExpectation(
    expected: BenchmarkTruthExpectation,
    actual: BenchmarkTruthExpectation
): readonly string[] {
    const mismatches: string[] = [];
    const compareField = (pathName: string, expectedValue: unknown, actualValue: unknown): void => {
        if (stableJson(expectedValue) !== stableJson(actualValue)) {
            mismatches.push(`${pathName}: expected ${stableJson(expectedValue)} but received ${stableJson(actualValue)}`);
        }
    };

    compareField('actionState', expected.actionState, actual.actionState);
    compareField('mechanicalLevel', expected.mechanicalLevel, actual.mechanicalLevel);
    compareField('evidenceTier', expected.evidenceTier, actual.evidenceTier);
    compareField('weakEvidenceDowngrade', expected.weakEvidenceDowngrade, actual.weakEvidenceDowngrade);
    compareField('primaryFocusArea', expected.primaryFocusArea, actual.primaryFocusArea);
    compareField(
        'secondaryFocusAreas',
        [...(expected.secondaryFocusAreas ?? [])].sort(),
        [...(actual.secondaryFocusAreas ?? [])].sort()
    );
    compareField('nextBlock.tier', expected.nextBlock.tier, actual.nextBlock.tier);
    compareField('nextBlock.key', expected.nextBlock.key, actual.nextBlock.key);
    compareField('nextBlock.title', expected.nextBlock.title, actual.nextBlock.title);
    compareField('nextBlock.durationMinutes', expected.nextBlock.durationMinutes, actual.nextBlock.durationMinutes);
    compareField('nextBlock.exercise', expected.nextBlock.exercise, actual.nextBlock.exercise);
    compareField('nextBlock.stepMarker', expected.nextBlock.stepMarker, actual.nextBlock.stepMarker);
    compareField('nextBlock.target', expected.nextBlock.target, actual.nextBlock.target);
    compareField('nextBlock.minimumCoverage', expected.nextBlock.minimumCoverage, actual.nextBlock.minimumCoverage);
    compareField('nextBlock.minimumConfidence', expected.nextBlock.minimumConfidence, actual.nextBlock.minimumConfidence);
    compareField('nextBlock.successCondition', expected.nextBlock.successCondition, actual.nextBlock.successCondition);
    compareField('nextBlock.failCondition', expected.nextBlock.failCondition, actual.nextBlock.failCondition);
    compareField('nextBlock.nextClipValidation', expected.nextBlock.nextClipValidation, actual.nextBlock.nextClipValidation);

    return mismatches;
}

async function runTruthBenchmark(
    clip: BenchmarkClip,
    loadCapturedProxy?: () => Promise<CapturedBenchmarkProxy>
): Promise<BenchmarkClipResult['truth']> {
    try {
        const actual = clip.quality.sourceType === 'captured'
            ? (await loadCapturedProxy?.())?.truth
            : await buildSyntheticTruthExpectation(clip);

        if (!actual) {
            throw new Error(`Clip ${clip.clipId} nao possui proxy suficiente para validar truth`);
        }

        const mismatches = compareTruthExpectation(clip.labels.expectedTruth, actual);

        return {
            passed: mismatches.length === 0,
            fixtureName: `${clip.quality.sourceType}-truth:${clip.clipId}`,
            expected: clip.labels.expectedTruth,
            actual,
            mismatches,
        };
    } catch (error) {
        return {
            passed: false,
            fixtureName: '(missing truth proxy)',
            expected: clip.labels.expectedTruth,
            mismatches: [],
            error: error instanceof Error ? error.message : 'erro desconhecido no benchmark de truth',
        };
    }
}

async function evaluateClip(clip: BenchmarkClip): Promise<BenchmarkClipResult> {
    const loadCapturedProxy = createCapturedBenchmarkProxyLoader(clip);
    const tracking = await runTrackingBenchmark(clip, loadCapturedProxy);
    const diagnostics = await runDiagnosticBenchmark(clip, loadCapturedProxy);
    const coach = await runCoachBenchmark(clip, loadCapturedProxy);
    const truth = await runTruthBenchmark(clip, loadCapturedProxy);

    return {
        clipId: clip.clipId,
        sourceType: clip.quality.sourceType,
        reviewStatus: clip.quality.reviewStatus,
        ...(clip.quality.reviewProvenance?.source ? { reviewProvenanceSource: clip.quality.reviewProvenance.source } : {}),
        passed: tracking.passed && diagnostics.passed && coach.passed && truth.passed,
        tracking,
        diagnostics,
        coach,
        truth,
    };
}

function buildSummary(clips: readonly BenchmarkClipResult[]): BenchmarkReportSummary {
    const failedClips = clips.filter((clip) => !clip.passed).length;
    const trackingPassed = clips.filter((clip) => clip.tracking.passed).length;
    const diagnosticsPassed = clips.filter((clip) => clip.diagnostics.passed).length;
    const coachPassed = clips.filter((clip) => clip.coach.passed).length;
    const truthPassed = clips.filter((clip) => clip.truth.passed).length;
    const totalClips = clips.length;
    const trackingMeanCoverage = totalClips > 0
        ? clips.reduce((sum, clip) => sum + clip.tracking.coverage, 0) / totalClips
        : 0;
    const trackingMeanErrorPx = totalClips > 0
        ? clips.reduce((sum, clip) => sum + clip.tracking.meanErrorPx, 0) / totalClips
        : 0;
    const trackingMeanShotAlignmentErrorMs = totalClips > 0
        ? clips.reduce((sum, clip) => sum + clip.tracking.shotAlignmentErrorMs, 0) / totalClips
        : 0;
    const trackingConfidenceCalibration = aggregateConfidenceCalibration(
        clips.map((clip) => clip.tracking.confidenceCalibration)
    );
    const score = toFixedNumber((
        passRate(trackingPassed, totalClips) +
        passRate(diagnosticsPassed, totalClips) +
        passRate(coachPassed, totalClips) +
        passRate(truthPassed, totalClips)
    ) / 4 * 100, 2);

    return {
        totalClips,
        failedClips,
        tracking: {
            passed: trackingPassed,
            total: totalClips,
            meanCoverage: toFixedNumber(trackingMeanCoverage),
            meanErrorPx: toFixedNumber(trackingMeanErrorPx),
            meanShotAlignmentErrorMs: toFixedNumber(trackingMeanShotAlignmentErrorMs),
            confidenceCalibration: trackingConfidenceCalibration,
        },
        diagnostics: {
            passed: diagnosticsPassed,
            total: totalClips,
        },
        coach: {
            passed: coachPassed,
            total: totalClips,
        },
        truth: {
            passed: truthPassed,
            total: totalClips,
        },
        score,
    };
}

function buildSourceBreakdown(clips: readonly BenchmarkClipResult[]): BenchmarkSourceBreakdown {
    const groups = new Map<BenchmarkSourceType, BenchmarkClipResult[]>();

    for (const clip of clips) {
        const group = groups.get(clip.sourceType) ?? [];
        groups.set(clip.sourceType, [...group, clip]);
    }

    return Object.fromEntries(
        [...groups.entries()].map(([sourceType, sourceClips]) => [sourceType, buildSummary(sourceClips)])
    ) as BenchmarkSourceBreakdown;
}

export function createBenchmarkRegressionBaseline(report: BenchmarkReport): BenchmarkRegressionBaseline {
    return {
        datasetId: report.datasetId,
        recordedAt: report.generatedAt,
        summary: {
            failedClips: report.summary.failedClips,
            score: report.summary.score,
            trackingMeanCoverage: report.summary.tracking.meanCoverage,
            trackingMeanErrorPx: report.summary.tracking.meanErrorPx,
            trackingMeanShotAlignmentErrorMs: report.summary.tracking.meanShotAlignmentErrorMs,
            diagnosticsPassRate: toFixedNumber(passRate(report.summary.diagnostics.passed, report.summary.diagnostics.total)),
            coachPassRate: toFixedNumber(passRate(report.summary.coach.passed, report.summary.coach.total)),
            truthPassRate: toFixedNumber(passRate(report.summary.truth.passed, report.summary.truth.total)),
        },
    };
}

function compareAgainstBaseline(
    summary: BenchmarkReportSummary,
    baseline: BenchmarkRegressionBaseline
): BenchmarkRegressionResult {
    const diagnosticsPassRate = toFixedNumber(passRate(summary.diagnostics.passed, summary.diagnostics.total));
    const coachPassRate = toFixedNumber(passRate(summary.coach.passed, summary.coach.total));
    const truthPassRate = toFixedNumber(passRate(summary.truth.passed, summary.truth.total));
    const deltas = {
        failedClips: summary.failedClips - baseline.summary.failedClips,
        score: toFixedNumber(summary.score - baseline.summary.score, 2),
        trackingMeanCoverage: toFixedNumber(summary.tracking.meanCoverage - baseline.summary.trackingMeanCoverage),
        trackingMeanErrorPx: toFixedNumber(summary.tracking.meanErrorPx - baseline.summary.trackingMeanErrorPx),
        trackingMeanShotAlignmentErrorMs: toFixedNumber(summary.tracking.meanShotAlignmentErrorMs - baseline.summary.trackingMeanShotAlignmentErrorMs),
        diagnosticsPassRate: toFixedNumber(diagnosticsPassRate - baseline.summary.diagnosticsPassRate),
        coachPassRate: toFixedNumber(coachPassRate - baseline.summary.coachPassRate),
        ...(baseline.summary.truthPassRate !== undefined
            ? { truthPassRate: toFixedNumber(truthPassRate - baseline.summary.truthPassRate) }
            : {}),
    };

    const isRegression = (
        deltas.failedClips > 0 ||
        deltas.score < 0 ||
        deltas.trackingMeanCoverage < 0 ||
        deltas.trackingMeanErrorPx > 0 ||
        deltas.trackingMeanShotAlignmentErrorMs > 0 ||
        deltas.diagnosticsPassRate < 0 ||
        deltas.coachPassRate < 0 ||
        (deltas.truthPassRate ?? 0) < 0
    );

    return {
        baselineDatasetId: baseline.datasetId,
        isRegression,
        deltas,
    };
}

export async function runBenchmark(
    options: RunBenchmarkOptions = {}
): Promise<BenchmarkReport> {
    const datasetPath = resolveInputPath(options.datasetPath ?? 'tests/goldens/benchmark/synthetic-benchmark.v1.json');
    const dataset = await loadBenchmarkDataset(datasetPath);
    const clips = await Promise.all(dataset.clips.map((clip) => evaluateClip(clip)));
    const summary = buildSummary(clips);
    const sourceBreakdown = buildSourceBreakdown(clips);
    const report: BenchmarkReport = {
        datasetId: dataset.datasetId,
        generatedAt: new Date().toISOString(),
        passed: summary.failedClips === 0,
        summary,
        sourceBreakdown,
        clips,
    };

    if (!options.baselinePath) {
        return report;
    }

    const baseline = await loadBenchmarkBaseline(resolveInputPath(options.baselinePath));
    return {
        ...report,
        regression: compareAgainstBaseline(summary, baseline),
    };
}

function isCliEntrypoint(): boolean {
    const entrypoint = process.argv[1];
    if (!entrypoint) return false;

    return import.meta.url === pathToFileURL(entrypoint).href;
}

async function main(): Promise<void> {
    const [, , datasetArg, baselineArg] = process.argv;
    const report = await runBenchmark({
        ...(datasetArg ? { datasetPath: datasetArg } : {}),
        ...(baselineArg ? { baselinePath: baselineArg } : {}),
    });
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.passed && report.regression?.isRegression !== true ? 0 : 1;
}

if (isCliEntrypoint()) {
    void main();
}

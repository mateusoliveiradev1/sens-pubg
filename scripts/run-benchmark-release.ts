import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
    buildAnalysisCalibrationReport,
    type AnalysisCalibrationRecord,
} from '../src/core/analysis-calibration-report';
import { buildBenchmarkCoverageSummary } from '../src/core/benchmark-coverage';
import { buildBenchmarkReleaseReport } from '../src/core/benchmark-release-report';
import { parseBenchmarkDataset, type BenchmarkClip, type BenchmarkDataset } from '../src/types/benchmark';
import { parseCapturedClipConsentManifest, type CapturedClipConsentManifest, type CapturedClipConsentRecord } from '../src/types/captured-clip-consent';
import { runBenchmark, type BenchmarkClipResult } from './run-benchmark';

const SYNTHETIC_DATASET = 'tests/goldens/benchmark/synthetic-benchmark.v1.json';
const SYNTHETIC_BASELINE = 'tests/goldens/benchmark/synthetic-benchmark.baseline.json';
const CAPTURED_DATASET = 'tests/goldens/benchmark/captured-benchmark-draft.json';
const CAPTURED_BASELINE = 'tests/goldens/benchmark/captured-benchmark.baseline.json';
const CAPTURED_CONSENT = 'tests/fixtures/captured-clips/consent.todo.v1.json';

function resolveInputPath(filePath: string): string {
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

async function loadBenchmarkDataset(datasetPath: string): Promise<BenchmarkDataset> {
    const raw = await readFile(resolveInputPath(datasetPath), 'utf8');
    return parseBenchmarkDataset(JSON.parse(raw));
}

async function loadConsentManifest(consentPath: string): Promise<CapturedClipConsentManifest> {
    const raw = await readFile(resolveInputPath(consentPath), 'utf8');
    return parseCapturedClipConsentManifest(JSON.parse(raw));
}

function decisionLevelForActionState(
    actionState: BenchmarkClip['labels']['expectedTruth']['actionState']
): AnalysisCalibrationRecord['expectedDecisionLevel'] {
    switch (actionState) {
        case 'capture_again':
            return 'inconclusive_recapture';
        case 'inconclusive':
            return 'partial_safe_read';
        case 'testable':
            return 'usable_analysis';
        case 'ready':
            return 'strong_analysis';
    }
}

function hasPurpose(consent: CapturedClipConsentRecord | undefined, purpose: CapturedClipConsentRecord['allowedPurposes'][number]): boolean {
    return consent?.allowedPurposes.includes(purpose) ?? false;
}

function consentAllowsPermissionedCalibration(consent: CapturedClipConsentRecord | undefined): boolean {
    return Boolean(
        consent &&
        consent.consentStatus !== 'withdrawn' &&
        (
            hasPurpose(consent, 'internal_validation') ||
            hasPurpose(consent, 'commercial_benchmark') ||
            hasPurpose(consent, 'trainability')
        )
    );
}

function consentAllowsCommercialBenchmark(consent: CapturedClipConsentRecord | undefined): boolean {
    return Boolean(
        consent &&
        consent.consentStatus !== 'withdrawn' &&
        (consent.consentStatus === 'golden_candidate' || consent.consentStatus === 'golden_promoted') &&
        hasPurpose(consent, 'commercial_benchmark') &&
        consent.trainabilityAuthorized
    );
}

function buildCalibrationRecords(input: {
    readonly dataset: BenchmarkDataset;
    readonly capturedClips: readonly BenchmarkClipResult[];
    readonly consentManifest: CapturedClipConsentManifest;
}): readonly AnalysisCalibrationRecord[] {
    const clipById = new Map(input.dataset.clips.map((clip) => [clip.clipId, clip]));
    const consentByClipId = new Map(input.consentManifest.clips.map((clip) => [clip.clipId, clip]));

    return input.capturedClips.map((result): AnalysisCalibrationRecord => {
        const clip = clipById.get(result.clipId);
        if (!clip) {
            throw new Error(`Clip ${result.clipId} not found in captured benchmark dataset.`);
        }

        const consent = consentByClipId.get(result.clipId);
        const expectedCalibration = clip.labels.expectedCalibration;
        const expectedBlockers = expectedCalibration?.expectedBlockerReasons ?? [];
        const actualDecisionLevel = result.truth.actual
            ? decisionLevelForActionState(result.truth.actual.actionState)
            : undefined;

        return {
            clipId: result.clipId,
            reviewStatus: result.reviewStatus,
            permissioned: expectedCalibration?.permissioned ?? consentAllowsPermissionedCalibration(consent),
            commercialEligible: expectedCalibration?.commercialBenchmarkEligible ?? consentAllowsCommercialBenchmark(consent),
            expectedDecisionLevel: expectedCalibration?.expectedDecisionLevel ?? decisionLevelForActionState(clip.labels.expectedTruth.actionState),
            ...(actualDecisionLevel ? { actualDecisionLevel } : {}),
            predictedConfidence: expectedCalibration?.predictedConfidence ?? result.tracking.confidenceCalibration.meanConfidence,
            reviewerCorrect: expectedCalibration?.reviewerCorrect ?? result.truth.passed,
            expectedBlockerReasons: expectedBlockers,
            actualBlockerReasons: result.truth.passed ? expectedBlockers : [],
            coachTier: result.coach.actualPlan?.tier ?? result.truth.actual?.nextBlock.tier ?? result.truth.expected.nextBlock.tier,
        };
    });
}

async function main(): Promise<void> {
    const generatedAt = new Date().toISOString();
    const capturedDataset = await loadBenchmarkDataset(CAPTURED_DATASET);
    const consentManifest = await loadConsentManifest(CAPTURED_CONSENT);
    const syntheticReport = await runBenchmark({
        datasetPath: SYNTHETIC_DATASET,
        baselinePath: SYNTHETIC_BASELINE,
    });
    const capturedReport = await runBenchmark({
        datasetPath: CAPTURED_DATASET,
        baselinePath: CAPTURED_BASELINE,
    });
    const coverageSummary = buildBenchmarkCoverageSummary(capturedDataset);
    const calibrationReport = buildAnalysisCalibrationReport({
        records: buildCalibrationRecords({
            dataset: capturedDataset,
            capturedClips: capturedReport.clips,
            consentManifest,
        }),
    });
    const releaseReport = buildBenchmarkReleaseReport({
        generatedAt,
        syntheticReport,
        capturedReport,
        coverageSummary,
        calibrationReport,
    });

    await mkdir(path.dirname(resolveInputPath(releaseReport.datedReportPath)), { recursive: true });
    await writeFile(resolveInputPath(releaseReport.datedReportPath), releaseReport.markdown);
    await writeFile(resolveInputPath(releaseReport.latestReportPath), releaseReport.markdown);

    for (const line of releaseReport.consoleLines) {
        console.log(line);
    }
    console.log(`report: ${releaseReport.datedReportPath}`);
    console.log(`latest: ${releaseReport.latestReportPath}`);

    process.exitCode = releaseReport.status === 'blocked' ? 1 : 0;
}

function isCliEntrypoint(): boolean {
    const entrypoint = process.argv[1];
    if (!entrypoint) return false;

    return import.meta.url === pathToFileURL(entrypoint).href;
}

if (isCliEntrypoint()) {
    void main();
}

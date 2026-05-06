import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runDiagnostics } from '../src/core/diagnostic-engine';
import type {
    DiagnosisType,
    MetricEvidenceQuality,
    SprayMetricQuality,
    SprayMetricQualityKey,
    SprayMetrics,
} from '../src/types/engine';
import { asMilliseconds, asScore } from '../src/types/branded';
import type { WeaponCategory } from '../src/game/pubg/weapon-data';

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

export interface DiagnosticGoldenFixture {
    readonly version: 1;
    readonly name: string;
    readonly weaponCategory: WeaponCategory;
    readonly metricOverrides?: Partial<SprayMetrics>;
    readonly metricQualityOverrides?: Partial<MetricEvidenceQuality>;
    readonly expectedDiagnosisTypes: readonly DiagnosisType[];
}

export interface DiagnosticGoldenFixtureResult {
    readonly name: string;
    readonly passed: boolean;
    readonly actualDiagnosisTypes: readonly DiagnosisType[];
    readonly expectedDiagnosisTypes: readonly DiagnosisType[];
}

export interface DiagnosticGoldenReport {
    readonly passed: boolean;
    readonly summary: {
        readonly totalFixtures: number;
        readonly failedFixtures: number;
    };
    readonly fixtures: readonly DiagnosticGoldenFixtureResult[];
}

export interface RunDiagnosticGoldensOptions {
    readonly fixturesDir?: string;
}

function makeMetricQuality(overrides: Partial<MetricEvidenceQuality> = {}): SprayMetricQuality {
    const evidence: MetricEvidenceQuality = {
        coverage: 1,
        confidence: 1,
        sampleSize: 30,
        framesTracked: 30,
        framesLost: 0,
        framesProcessed: 30,
        cameraMotionPenalty: 0,
        hardCutPenalty: 0,
        flickPenalty: 0,
        targetSwapPenalty: 0,
        identityPenalty: 0,
        contaminatedFrameCount: 0,
        ...overrides,
    };

    return Object.fromEntries(
        metricQualityKeys.map((key) => [key, evidence])
    ) as SprayMetricQuality;
}

function makeMetrics(
    metricOverrides: Partial<SprayMetrics> = {},
    metricQualityOverrides: Partial<MetricEvidenceQuality> = {}
): SprayMetrics {
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
        metricQuality: makeMetricQuality(metricQualityOverrides),
        sprayScore: 80,
        ...metricOverrides,
    };
}

function stableJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
}

export function evaluateDiagnosticGoldenFixture(
    fixture: DiagnosticGoldenFixture
): DiagnosticGoldenFixtureResult {
    const metrics = makeMetrics(
        fixture.metricOverrides ?? {},
        fixture.metricQualityOverrides ?? {}
    );
    const actualDiagnosisTypes = runDiagnostics(metrics, fixture.weaponCategory).map((diagnosis) => diagnosis.type);
    const passed = stableJson(actualDiagnosisTypes) === stableJson(fixture.expectedDiagnosisTypes);

    return {
        name: fixture.name,
        passed,
        actualDiagnosisTypes,
        expectedDiagnosisTypes: fixture.expectedDiagnosisTypes,
    };
}

export async function loadDiagnosticGoldenFixture(filePath: string): Promise<DiagnosticGoldenFixture> {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as DiagnosticGoldenFixture;
}

async function loadFixtures(fixturesDir: string): Promise<DiagnosticGoldenFixture[]> {
    const entries = await readdir(fixturesDir);
    const files = entries.filter((entry) => entry.endsWith('.json')).sort();
    const fixtures: DiagnosticGoldenFixture[] = [];

    for (const file of files) {
        fixtures.push(await loadDiagnosticGoldenFixture(path.join(fixturesDir, file)));
    }

    return fixtures;
}

export async function runDiagnosticGoldens(
    options: RunDiagnosticGoldensOptions = {}
): Promise<DiagnosticGoldenReport> {
    const fixturesDir = options.fixturesDir ?? path.resolve(process.cwd(), 'tests/goldens/diagnostic');
    const fixtures = await loadFixtures(fixturesDir);
    const results = fixtures.map(evaluateDiagnosticGoldenFixture);
    const failedFixtures = results.filter((result) => !result.passed).length;

    return {
        passed: failedFixtures === 0,
        summary: {
            totalFixtures: results.length,
            failedFixtures,
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
    const report = await runDiagnosticGoldens();
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.passed ? 0 : 1;
}

if (isCliEntrypoint()) {
    void main();
}

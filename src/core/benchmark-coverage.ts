import type { BenchmarkClip, BenchmarkDataset } from '@/types/benchmark';

type BenchmarkSourceType = BenchmarkClip['quality']['sourceType'];
type ReviewStatus = BenchmarkClip['quality']['reviewStatus'];
type TrackingTier = BenchmarkClip['labels']['expectedTrackingTier'];
type VisibilityTier = BenchmarkClip['quality']['visibilityTier'];
type OcclusionLevel = BenchmarkClip['quality']['occlusionLevel'];
type CompressionLevel = BenchmarkClip['quality']['compressionLevel'];

const SOURCE_TYPES = ['captured', 'synthetic', 'augmented'] as const satisfies readonly BenchmarkSourceType[];
const REVIEW_STATUSES = ['draft', 'reviewed', 'golden'] as const satisfies readonly ReviewStatus[];
const TRACKING_TIERS = ['clean', 'degraded'] as const satisfies readonly TrackingTier[];
const VISIBILITY_TIERS = ['clean', 'degraded', 'rejected'] as const satisfies readonly VisibilityTier[];
const OCCLUSION_LEVELS = ['none', 'light', 'moderate', 'heavy'] as const satisfies readonly OcclusionLevel[];
const COMPRESSION_LEVELS = ['lossless', 'light', 'medium', 'heavy'] as const satisfies readonly CompressionLevel[];
const DISTANCE_BUCKETS = ['0-30m', '31-60m', '61-100m', '101m+'] as const;

export interface BenchmarkCoverageSummary {
    readonly datasetId: string;
    readonly totalClips: number;
    readonly generatedFrom: 'all-clips';
    readonly sourceTypes: Record<BenchmarkSourceType, number>;
    readonly reviewStatuses: Record<ReviewStatus, number>;
    readonly trackingTiers: Record<TrackingTier, number>;
    readonly visibilityTiers: Record<VisibilityTier, number>;
    readonly occlusionLevels: Record<OcclusionLevel, number>;
    readonly compressionLevels: Record<CompressionLevel, number>;
    readonly patchVersions: Record<string, number>;
    readonly weapons: Record<string, number>;
    readonly optics: Record<string, number>;
    readonly distanceBuckets: Record<typeof DISTANCE_BUCKETS[number], number>;
    readonly diagnosisTypes: Record<string, number>;
    readonly uniqueWeapons: readonly string[];
    readonly uniqueOptics: readonly string[];
    readonly clipsWithDiagnoses: number;
    readonly goldenClips: number;
    readonly starterGate: BenchmarkCoverageGate;
    readonly starterGaps: readonly string[];
}

export interface BenchmarkCoverageGateCheck {
    readonly key: 'capturedClips' | 'distinctWeapons' | 'capturedDiagnosedClips' | 'capturedGoldenClips';
    readonly label: string;
    readonly actual: number;
    readonly required: number;
    readonly passed: boolean;
}

export interface BenchmarkCoverageGate {
    readonly passed: boolean;
    readonly checks: readonly BenchmarkCoverageGateCheck[];
}

export interface BenchmarkCoverageMarkdownOptions {
    readonly title: string;
    readonly generatedFor: string;
}

function createCounter<T extends string>(keys: readonly T[]): Record<T, number> {
    return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
}

function countBy<T extends string>(counter: Record<T, number>, key: T): void {
    counter[key] = (counter[key] ?? 0) + 1;
}

function countLoose(counter: Record<string, number>, key: string): void {
    counter[key] = (counter[key] ?? 0) + 1;
}

function getDistanceBucket(distanceMeters: number): typeof DISTANCE_BUCKETS[number] {
    if (distanceMeters <= 30) return '0-30m';
    if (distanceMeters <= 60) return '31-60m';
    if (distanceMeters <= 100) return '61-100m';
    return '101m+';
}

function buildStarterGaps(dataset: BenchmarkDataset): readonly string[] {
    const capturedClips = dataset.clips.filter((clip) => clip.quality.sourceType === 'captured');
    const capturedWeapons = new Set(capturedClips.map((clip) => clip.capture.weaponId));
    const capturedGoldenClips = capturedClips.filter((clip) => clip.quality.reviewStatus === 'golden').length;
    const capturedDiagnosedClips = capturedClips.filter((clip) => clip.labels.expectedDiagnoses.length > 0).length;
    const gaps: string[] = [];

    if (capturedClips.length < 4) {
        gaps.push(`Adicionar pelo menos ${4 - capturedClips.length} clips capturados extras para sair do draft minimo de ${capturedClips.length}/4.`);
    }

    if (capturedWeapons.size < 2) {
        gaps.push(`Adicionar pelo menos ${2 - capturedWeapons.size} arma distinta ao corpus capturado inicial.`);
    }

    if (capturedDiagnosedClips < 1) {
        gaps.push('Adicionar pelo menos 1 clip capturado com diagnostico esperado nao vazio.');
    }

    if (capturedGoldenClips < 1) {
        gaps.push('Promover pelo menos 1 clip capturado para reviewStatus=golden.');
    }

    return gaps;
}

function buildStarterGate(dataset: BenchmarkDataset): BenchmarkCoverageGate {
    const capturedClips = dataset.clips.filter((clip) => clip.quality.sourceType === 'captured');
    const distinctWeapons = new Set(capturedClips.map((clip) => clip.capture.weaponId)).size;
    const capturedDiagnosedClips = capturedClips.filter((clip) => clip.labels.expectedDiagnoses.length > 0).length;
    const capturedGoldenClips = capturedClips.filter((clip) => clip.quality.reviewStatus === 'golden').length;
    const checks: BenchmarkCoverageGateCheck[] = [
        {
            key: 'capturedClips',
            label: 'Captured clips',
            actual: capturedClips.length,
            required: 4,
            passed: capturedClips.length >= 4,
        },
        {
            key: 'distinctWeapons',
            label: 'Distinct weapons',
            actual: distinctWeapons,
            required: 2,
            passed: distinctWeapons >= 2,
        },
        {
            key: 'capturedDiagnosedClips',
            label: 'Captured clips with diagnoses',
            actual: capturedDiagnosedClips,
            required: 1,
            passed: capturedDiagnosedClips >= 1,
        },
        {
            key: 'capturedGoldenClips',
            label: 'Captured golden clips',
            actual: capturedGoldenClips,
            required: 1,
            passed: capturedGoldenClips >= 1,
        },
    ];

    return {
        passed: checks.every((check) => check.passed),
        checks,
    };
}

export function buildBenchmarkCoverageSummary(dataset: BenchmarkDataset): BenchmarkCoverageSummary {
    const sourceTypes = createCounter(SOURCE_TYPES);
    const reviewStatuses = createCounter(REVIEW_STATUSES);
    const trackingTiers = createCounter(TRACKING_TIERS);
    const visibilityTiers = createCounter(VISIBILITY_TIERS);
    const occlusionLevels = createCounter(OCCLUSION_LEVELS);
    const compressionLevels = createCounter(COMPRESSION_LEVELS);
    const distanceBuckets = createCounter(DISTANCE_BUCKETS);
    const patchVersions: Record<string, number> = {};
    const weapons: Record<string, number> = {};
    const optics: Record<string, number> = {};
    const diagnosisTypes: Record<string, number> = {};

    let clipsWithDiagnoses = 0;
    let goldenClips = 0;

    for (const clip of dataset.clips) {
        countBy(sourceTypes, clip.quality.sourceType);
        countBy(reviewStatuses, clip.quality.reviewStatus);
        countBy(trackingTiers, clip.labels.expectedTrackingTier);
        countBy(visibilityTiers, clip.quality.visibilityTier);
        countBy(occlusionLevels, clip.quality.occlusionLevel);
        countBy(compressionLevels, clip.quality.compressionLevel);
        countBy(distanceBuckets, getDistanceBucket(clip.capture.distanceMeters));
        countLoose(patchVersions, clip.capture.patchVersion);
        countLoose(weapons, clip.capture.weaponId);
        countLoose(optics, `${clip.capture.optic.opticId}:${clip.capture.optic.stateId}`);

        if (clip.labels.expectedDiagnoses.length > 0) {
            clipsWithDiagnoses++;
        }

        if (clip.quality.reviewStatus === 'golden') {
            goldenClips++;
        }

        for (const diagnosisType of clip.labels.expectedDiagnoses) {
            countLoose(diagnosisTypes, diagnosisType);
        }
    }

    return {
        datasetId: dataset.datasetId,
        totalClips: dataset.clips.length,
        generatedFrom: 'all-clips',
        sourceTypes,
        reviewStatuses,
        trackingTiers,
        visibilityTiers,
        occlusionLevels,
        compressionLevels,
        patchVersions,
        weapons,
        optics,
        distanceBuckets,
        diagnosisTypes,
        uniqueWeapons: Object.keys(weapons).sort(),
        uniqueOptics: Object.keys(optics).sort(),
        clipsWithDiagnoses,
        goldenClips,
        starterGate: buildStarterGate(dataset),
        starterGaps: buildStarterGaps(dataset),
    };
}

function renderCounterRows(counter: Record<string, number>, prefix?: string): string[] {
    return Object.entries(counter)
        .filter(([, value]) => value > 0)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `| ${prefix ? `${prefix} ${key}` : key} | ${value} |`);
}

export function renderBenchmarkCoverageMarkdown(
    summary: BenchmarkCoverageSummary,
    options: BenchmarkCoverageMarkdownOptions
): string {
    const lines = [
        `# ${options.title}`,
        '',
        `Dataset: \`${summary.datasetId}\``,
        `Source: \`${options.generatedFor}\``,
        '',
        '## Snapshot',
        '',
        '| Metric | Value |',
        '|---|---:|',
        `| Total clips | ${summary.totalClips} |`,
        `| Clips com diagnostico esperado | ${summary.clipsWithDiagnoses} |`,
        `| Clips promovidos para golden | ${summary.goldenClips} |`,
        '',
        '## Coverage',
        '',
        '| Dimension | Count |',
        '|---|---:|',
        ...renderCounterRows(summary.sourceTypes, 'Source type'),
        ...renderCounterRows(summary.reviewStatuses, 'Review status'),
        ...renderCounterRows(summary.trackingTiers, 'Tracking tier'),
        ...renderCounterRows(summary.visibilityTiers, 'Visibility tier'),
        ...renderCounterRows(summary.occlusionLevels, 'Occlusion'),
        ...renderCounterRows(summary.compressionLevels, 'Compression'),
        ...renderCounterRows(summary.distanceBuckets, 'Distance bucket'),
        '',
        '## Domain Diversity',
        '',
        '| Dimension | Values |',
        '|---|---|',
        `| Weapons | ${summary.uniqueWeapons.length > 0 ? summary.uniqueWeapons.join(', ') : '(none)'} |`,
        `| Optics | ${summary.uniqueOptics.length > 0 ? summary.uniqueOptics.join(', ') : '(none)'} |`,
        `| Patch versions | ${Object.keys(summary.patchVersions).length > 0 ? Object.keys(summary.patchVersions).sort().join(', ') : '(none)'} |`,
        '',
        '## Starter Gate',
        '',
        '| Requirement | Actual | Required | Status |',
        '|---|---:|---:|---|',
        ...summary.starterGate.checks.map((check) => `| ${check.label} | ${check.actual} | ${check.required} | ${check.passed ? 'PASS' : 'FAIL'} |`),
        '',
        '## Starter Gaps',
        '',
        ...(summary.starterGaps.length > 0
            ? summary.starterGaps.map((gap) => `- ${gap}`)
            : ['- Nenhuma lacuna minima detectada para o starter pack capturado.']),
    ];

    return `${lines.join('\n')}\n`;
}

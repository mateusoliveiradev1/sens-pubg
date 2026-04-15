import type { BenchmarkClip, BenchmarkDataset } from '@/types/benchmark';
import type { CapturedClipIntakeManifest } from '@/types/captured-clip-intake';
import {
    summarizeCapturedClipLabelSet,
    type CapturedClipLabelSet,
} from '@/types/captured-clip-labels';
import {
    buildBenchmarkCoverageSummary,
    type BenchmarkCoverageGate,
    type BenchmarkCoverageGateCheck,
} from './benchmark-coverage';

const DISTANCE_BUCKET_ORDER = ['0-30m', '31-60m', '61-100m', '101m+'] as const;
const TRACKING_TIERS = ['clean', 'degraded'] as const;

type DistanceBucket = typeof DISTANCE_BUCKET_ORDER[number];
type TrackingTier = typeof TRACKING_TIERS[number];

interface StarterGateActuals {
    capturedClips: number;
    distinctWeapons: number;
    capturedDiagnosedClips: number;
    capturedGoldenClips: number;
}

export interface CapturedBenchmarkPromotionAction {
    readonly clipId: string;
    readonly currentReviewStatus: BenchmarkClip['quality']['reviewStatus'];
    readonly targetReviewStatus: 'golden';
    readonly qualityTier: 'candidate-clean' | 'candidate-degraded';
    readonly reason: string;
}

export interface CapturedBenchmarkCaptureBlueprint {
    readonly slotId: string;
    readonly purpose: readonly string[];
    readonly targetReviewStatus: BenchmarkClip['quality']['reviewStatus'];
    readonly targetTrackingTier: BenchmarkClip['labels']['expectedTrackingTier'];
    readonly targetVisibilityTier: BenchmarkClip['quality']['visibilityTier'];
    readonly targetOcclusionLevel: BenchmarkClip['quality']['occlusionLevel'];
    readonly targetCompressionLevel: BenchmarkClip['quality']['compressionLevel'];
    readonly targetDistanceBucket: DistanceBucket;
    readonly weaponPolicy: 'new-distinct-weapon' | 'any';
    readonly avoidWeaponIds: readonly string[];
    readonly requiresExpectedDiagnosis: boolean;
    readonly notes: string;
}

export interface CapturedBenchmarkPlan {
    readonly datasetId: string;
    readonly currentStarterGate: BenchmarkCoverageGate;
    readonly promotionActions: readonly CapturedBenchmarkPromotionAction[];
    readonly captureBlueprints: readonly CapturedBenchmarkCaptureBlueprint[];
    readonly projectedStarterGate: BenchmarkCoverageGate;
}

export interface CapturedBenchmarkPlanMarkdownOptions {
    readonly title: string;
    readonly generatedFor: string;
}

function buildStarterGate(actuals: StarterGateActuals): BenchmarkCoverageGate {
    const checks: BenchmarkCoverageGateCheck[] = [
        {
            key: 'capturedClips',
            label: 'Captured clips',
            actual: actuals.capturedClips,
            required: 4,
            passed: actuals.capturedClips >= 4,
        },
        {
            key: 'distinctWeapons',
            label: 'Distinct weapons',
            actual: actuals.distinctWeapons,
            required: 2,
            passed: actuals.distinctWeapons >= 2,
        },
        {
            key: 'capturedDiagnosedClips',
            label: 'Captured clips with diagnoses',
            actual: actuals.capturedDiagnosedClips,
            required: 1,
            passed: actuals.capturedDiagnosedClips >= 1,
        },
        {
            key: 'capturedGoldenClips',
            label: 'Captured golden clips',
            actual: actuals.capturedGoldenClips,
            required: 1,
            passed: actuals.capturedGoldenClips >= 1,
        },
    ];

    return {
        passed: checks.every((check) => check.passed),
        checks,
    };
}

function chooseDistanceBucket(distanceCounts: Record<DistanceBucket, number>): DistanceBucket {
    return [...DISTANCE_BUCKET_ORDER].sort((left, right) => {
        const byCount = distanceCounts[left] - distanceCounts[right];
        if (byCount !== 0) {
            return byCount;
        }

        return DISTANCE_BUCKET_ORDER.indexOf(left) - DISTANCE_BUCKET_ORDER.indexOf(right);
    })[0] ?? DISTANCE_BUCKET_ORDER[0];
}

function chooseTrackingTier(trackingCounts: Record<TrackingTier, number>): TrackingTier {
    return [...TRACKING_TIERS].sort((left, right) => {
        const byCount = trackingCounts[left] - trackingCounts[right];
        if (byCount !== 0) {
            return byCount;
        }

        return TRACKING_TIERS.indexOf(left) - TRACKING_TIERS.indexOf(right);
    })[0] ?? TRACKING_TIERS[0];
}

function getPromotionReason(clip: BenchmarkClip, qualityTier: 'candidate-clean' | 'candidate-degraded'): string {
    const qualityLabel = qualityTier === 'candidate-clean' ? 'candidate-clean' : 'candidate-degraded';

    return [
        `clip capturado ja esta em \`${clip.quality.reviewStatus}\``,
        `rotulos completos`,
        `intake marcado como \`${qualityLabel}\``,
        'pronto para promover sem capturar video novo',
    ].join(', ');
}

export function buildCapturedBenchmarkPlan(
    dataset: BenchmarkDataset,
    intakeManifest: CapturedClipIntakeManifest,
    labelSet: CapturedClipLabelSet,
): CapturedBenchmarkPlan {
    const coverage = buildBenchmarkCoverageSummary(dataset);
    const capturedClips = dataset.clips.filter((clip) => clip.quality.sourceType === 'captured');
    const capturedWeapons = new Set(capturedClips.map((clip) => clip.capture.weaponId));
    const labelSummaryByClipId = new Map(
        summarizeCapturedClipLabelSet(labelSet).clips.map((clip) => [clip.clipId, clip])
    );
    const intakeByClipId = new Map(intakeManifest.clips.map((clip) => [clip.clipId, clip]));

    const promotionCandidates = capturedClips
        .filter((clip) => clip.quality.reviewStatus === 'reviewed')
        .flatMap((clip) => {
            const intakeClip = intakeByClipId.get(clip.clipId);
            const labelSummary = labelSummaryByClipId.get(clip.clipId);

            if (!intakeClip || !labelSummary?.readyForGoldenLabels) {
                return [];
            }

            if (intakeClip.quality.benchmarkReadiness !== 'ready-for-golden-labels') {
                return [];
            }

            if (intakeClip.quality.qualityTier === 'rejected') {
                return [];
            }

            return [{
                clipId: clip.clipId,
                currentReviewStatus: clip.quality.reviewStatus,
                targetReviewStatus: 'golden' as const,
                qualityTier: intakeClip.quality.qualityTier,
                reason: getPromotionReason(clip, intakeClip.quality.qualityTier),
            }];
        })
        .sort((left, right) => {
            if (left.qualityTier !== right.qualityTier) {
                return left.qualityTier === 'candidate-clean' ? -1 : 1;
            }

            return left.clipId.localeCompare(right.clipId);
        });

    let remainingGoldenGap = Math.max(0, 1 - coverage.goldenClips);
    const promotionActions = promotionCandidates.slice(0, remainingGoldenGap);
    remainingGoldenGap -= promotionActions.length;

    let remainingCaptureGap = Math.max(0, 4 - capturedClips.length);
    let remainingDistinctWeaponGap = Math.max(0, 2 - capturedWeapons.size);
    let remainingDiagnosedGap = Math.max(0, 1 - coverage.clipsWithDiagnoses);

    const projectedActuals: StarterGateActuals = {
        capturedClips: capturedClips.length,
        distinctWeapons: capturedWeapons.size,
        capturedDiagnosedClips: coverage.clipsWithDiagnoses,
        capturedGoldenClips: coverage.goldenClips + promotionActions.length,
    };

    const distanceCounts: Record<DistanceBucket, number> = {
        '0-30m': coverage.distanceBuckets['0-30m'],
        '31-60m': coverage.distanceBuckets['31-60m'],
        '61-100m': coverage.distanceBuckets['61-100m'],
        '101m+': coverage.distanceBuckets['101m+'],
    };
    const trackingCounts: Record<TrackingTier, number> = {
        clean: coverage.trackingTiers.clean,
        degraded: coverage.trackingTiers.degraded,
    };
    const knownWeaponIds = new Set(capturedClips.map((clip) => clip.capture.weaponId));
    const captureBlueprints: CapturedBenchmarkCaptureBlueprint[] = [];

    while (remainingCaptureGap > 0) {
        const purpose: string[] = ['fechar gap de quantidade minima de clips capturados'];
        const distanceBucket = chooseDistanceBucket(distanceCounts);

        let targetReviewStatus: BenchmarkClip['quality']['reviewStatus'] = 'reviewed';
        let requiresExpectedDiagnosis = false;
        let weaponPolicy: CapturedBenchmarkCaptureBlueprint['weaponPolicy'] = 'any';
        let targetTrackingTier: TrackingTier;

        if (remainingDistinctWeaponGap > 0) {
            weaponPolicy = 'new-distinct-weapon';
            purpose.push('fechar gap de arma distinta');
            remainingDistinctWeaponGap -= 1;
            projectedActuals.distinctWeapons += 1;
        }

        if (remainingDiagnosedGap > 0) {
            requiresExpectedDiagnosis = true;
            purpose.push('fechar gap de diagnostico esperado');
            remainingDiagnosedGap -= 1;
            projectedActuals.capturedDiagnosedClips += 1;
        }

        if (remainingGoldenGap > 0) {
            targetReviewStatus = 'golden';
            purpose.push('fechar gap de golden');
            remainingGoldenGap -= 1;
            projectedActuals.capturedGoldenClips += 1;
        }

        if (requiresExpectedDiagnosis || targetReviewStatus === 'golden') {
            targetTrackingTier = 'clean';
        } else {
            targetTrackingTier = chooseTrackingTier(trackingCounts);
        }

        trackingCounts[targetTrackingTier] += 1;
        distanceCounts[distanceBucket] += 1;
        projectedActuals.capturedClips += 1;
        remainingCaptureGap -= 1;

        const targetVisibilityTier = targetTrackingTier === 'clean' ? 'clean' : 'degraded';
        const targetOcclusionLevel = targetTrackingTier === 'clean' ? 'light' : 'moderate';
        const targetCompressionLevel = targetTrackingTier === 'clean' ? 'light' : 'medium';
        const avoidWeaponIds = weaponPolicy === 'new-distinct-weapon'
            ? [...knownWeaponIds].sort()
            : [];

        if (weaponPolicy === 'new-distinct-weapon') {
            knownWeaponIds.add(`planned-weapon-${captureBlueprints.length + 1}`);
        }

        const notes = weaponPolicy === 'new-distinct-weapon'
            ? 'Escolher uma arma diferente das que ja existem no corpus atual e manter o clip ADS estavel o suficiente para rotulo humano confiavel.'
            : 'Pode reaproveitar a arma atual ou introduzir outra, mas priorize fechar a lacuna de diversidade de distancia/qualidade restante.';

        captureBlueprints.push({
            slotId: `captured-slot-${captureBlueprints.length + 1}`,
            purpose,
            targetReviewStatus,
            targetTrackingTier,
            targetVisibilityTier,
            targetOcclusionLevel,
            targetCompressionLevel,
            targetDistanceBucket: distanceBucket,
            weaponPolicy,
            avoidWeaponIds,
            requiresExpectedDiagnosis,
            notes,
        });
    }

    return {
        datasetId: dataset.datasetId,
        currentStarterGate: coverage.starterGate,
        promotionActions,
        captureBlueprints,
        projectedStarterGate: buildStarterGate(projectedActuals),
    };
}

function renderGateTable(gate: BenchmarkCoverageGate): string[] {
    return [
        '| Requirement | Actual | Required | Status |',
        '|---|---:|---:|---|',
        ...gate.checks.map((check) => `| ${check.label} | ${check.actual} | ${check.required} | ${check.passed ? 'PASS' : 'FAIL'} |`),
    ];
}

export function renderCapturedBenchmarkPlanMarkdown(
    plan: CapturedBenchmarkPlan,
    options: CapturedBenchmarkPlanMarkdownOptions,
): string {
    const lines = [
        `# ${options.title}`,
        '',
        `Dataset: \`${plan.datasetId}\``,
        `Source: \`${options.generatedFor}\``,
        '',
        '## Current Starter Gate',
        '',
        ...renderGateTable(plan.currentStarterGate),
        '',
        '## Immediate Promotions',
        '',
    ];

    if (plan.promotionActions.length === 0) {
        if (plan.currentStarterGate.passed && plan.captureBlueprints.length === 0) {
            lines.push('- Nenhuma promocao imediata restante; o starter gate ja esta fechado com a cobertura atual.');
        } else if (plan.captureBlueprints.length === 0) {
            lines.push('- Nenhuma promocao imediata encontrada; revisar intake, labels e decisoes porque o gate ainda nao fecha sem novas acoes.');
        } else {
            lines.push('- Nenhuma promocao imediata encontrada; as lacunas restantes exigem captura nova.');
        }
    } else {
        for (const promotion of plan.promotionActions) {
            lines.push(`- Promover \`${promotion.clipId}\` de \`${promotion.currentReviewStatus}\` para \`${promotion.targetReviewStatus}\`.`);
            lines.push(`  Motivo: ${promotion.reason}.`);
        }
    }

    lines.push('');
    lines.push('## New Capture Blueprints');
    lines.push('');

    if (plan.captureBlueprints.length === 0) {
        lines.push('- Nenhum clip novo necessario para fechar o starter gate.');
    } else {
        for (const blueprint of plan.captureBlueprints) {
            lines.push(`### ${blueprint.slotId}`);
            lines.push('');
            lines.push(`- Purpose: ${blueprint.purpose.join('; ')}.`);
            lines.push(`- Target review status: \`${blueprint.targetReviewStatus}\``);
            lines.push(`- Target tracking tier: \`${blueprint.targetTrackingTier}\``);
            lines.push(`- Target visibility tier: \`${blueprint.targetVisibilityTier}\``);
            lines.push(`- Target occlusion: \`${blueprint.targetOcclusionLevel}\``);
            lines.push(`- Target compression: \`${blueprint.targetCompressionLevel}\``);
            lines.push(`- Target distance bucket: \`${blueprint.targetDistanceBucket}\``);
            lines.push(`- Weapon policy: \`${blueprint.weaponPolicy}\``);
            if (blueprint.avoidWeaponIds.length > 0) {
                lines.push(`- Avoid weapon ids: \`${blueprint.avoidWeaponIds.join('`, `')}\``);
            }
            lines.push(`- Requires expected diagnosis: \`${blueprint.requiresExpectedDiagnosis}\``);
            lines.push(`- Notes: ${blueprint.notes}`);
            lines.push('');
        }
    }

    lines.push('## Projected Starter Gate After Plan');
    lines.push('');
    lines.push(...renderGateTable(plan.projectedStarterGate));

    return `${lines.join('\n')}\n`;
}

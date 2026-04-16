import { CURRENT_PUBG_PATCH_VERSION } from '@/game/pubg/patch';
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
type ReviewProvenanceSource = NonNullable<BenchmarkClip['quality']['reviewProvenance']>['source'] | 'unspecified';

interface StarterGateActuals {
    capturedClips: number;
    distinctWeapons: number;
    capturedDiagnosedClips: number;
    capturedGoldenClips: number;
}

interface SddGateActuals {
    currentPatchCapturedClips: number;
    distinctOptics: number;
    cleanCapturedClips: number;
    degradedCapturedClips: number;
    specialistReviewedGoldenClips: number;
}

export interface CapturedBenchmarkPromotionAction {
    readonly clipId: string;
    readonly currentReviewStatus: BenchmarkClip['quality']['reviewStatus'];
    readonly targetReviewStatus: 'golden';
    readonly qualityTier: 'candidate-clean' | 'candidate-degraded';
    readonly reason: string;
}

export interface CapturedBenchmarkSpecialistReviewAction {
    readonly clipId: string;
    readonly currentReviewStatus: BenchmarkClip['quality']['reviewStatus'];
    readonly currentReviewProvenance: ReviewProvenanceSource;
    readonly targetReviewStatus: 'golden';
    readonly targetReviewProvenance: 'specialist-reviewed';
    readonly reason: string;
}

export interface CapturedBenchmarkCaptureBlueprint {
    readonly slotId: string;
    readonly planTier: 'starter' | 'sdd-evidence';
    readonly purpose: readonly string[];
    readonly targetReviewStatus: BenchmarkClip['quality']['reviewStatus'];
    readonly targetTrackingTier: BenchmarkClip['labels']['expectedTrackingTier'];
    readonly targetVisibilityTier: BenchmarkClip['quality']['visibilityTier'];
    readonly targetOcclusionLevel: BenchmarkClip['quality']['occlusionLevel'];
    readonly targetCompressionLevel: BenchmarkClip['quality']['compressionLevel'];
    readonly targetDistanceBucket: DistanceBucket;
    readonly targetPatchVersion: string;
    readonly weaponPolicy: 'new-distinct-weapon' | 'any';
    readonly opticPolicy: 'new-distinct-optic' | 'any';
    readonly avoidWeaponIds: readonly string[];
    readonly avoidOpticKeys: readonly string[];
    readonly requiresExpectedDiagnosis: boolean;
    readonly requiresSpecialistReview: boolean;
    readonly notes: string;
}

export interface CapturedBenchmarkPlan {
    readonly datasetId: string;
    readonly currentStarterGate: BenchmarkCoverageGate;
    readonly currentSddGate: BenchmarkCoverageGate;
    readonly promotionActions: readonly CapturedBenchmarkPromotionAction[];
    readonly specialistReviewActions: readonly CapturedBenchmarkSpecialistReviewAction[];
    readonly captureBlueprints: readonly CapturedBenchmarkCaptureBlueprint[];
    readonly evidenceCaptureBlueprints: readonly CapturedBenchmarkCaptureBlueprint[];
    readonly projectedStarterGate: BenchmarkCoverageGate;
    readonly projectedSddGate: BenchmarkCoverageGate;
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

function getSddActual(actuals: SddGateActuals, key: BenchmarkCoverageGateCheck['key']): number {
    switch (key) {
        case 'currentPatchCapturedClips':
            return actuals.currentPatchCapturedClips;
        case 'distinctOptics':
            return actuals.distinctOptics;
        case 'cleanCapturedClips':
            return actuals.cleanCapturedClips;
        case 'degradedCapturedClips':
            return actuals.degradedCapturedClips;
        case 'specialistReviewedGoldenClips':
            return actuals.specialistReviewedGoldenClips;
        default:
            return 0;
    }
}

function buildProjectedSddGate(
    actuals: SddGateActuals,
    templates: readonly BenchmarkCoverageGateCheck[],
): BenchmarkCoverageGate {
    const checks = templates.map((template) => {
        const actual = getSddActual(actuals, template.key);
        return {
            ...template,
            actual,
            passed: actual >= template.required,
        };
    });

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

function choosePrimaryPatchVersion(capturedClips: readonly BenchmarkClip[]): string {
    if (capturedClips.length === 0) {
        return CURRENT_PUBG_PATCH_VERSION;
    }

    const counts = new Map<string, number>();
    for (const clip of capturedClips) {
        counts.set(clip.capture.patchVersion, (counts.get(clip.capture.patchVersion) ?? 0) + 1);
    }

    return [...counts.entries()]
        .sort((left, right) => {
            const byCount = right[1] - left[1];
            if (byCount !== 0) return byCount;
            return left[0].localeCompare(right[0]);
        })[0]?.[0] ?? CURRENT_PUBG_PATCH_VERSION;
}

function resolveReviewProvenanceSource(clip: BenchmarkClip): ReviewProvenanceSource {
    return clip.quality.reviewProvenance?.source ?? 'unspecified';
}

function getPromotionReason(clip: BenchmarkClip, qualityTier: 'candidate-clean' | 'candidate-degraded'): string {
    const qualityLabel = qualityTier === 'candidate-clean' ? 'candidate-clean' : 'candidate-degraded';

    return [
        `clip capturado ja esta em \`${clip.quality.reviewStatus}\``,
        'rotulos completos',
        `intake marcado como \`${qualityLabel}\``,
        'pronto para promover sem capturar video novo',
    ].join(', ');
}

function getSpecialistReviewReason(clip: BenchmarkClip): string {
    return `clip \`${clip.clipId}\` ja esta em \`${clip.quality.reviewStatus}\`, mas ainda nao possui provenance \`specialist-reviewed\``;
}

function renderGateTable(gate: BenchmarkCoverageGate): string[] {
    return [
        '| Requirement | Actual | Required | Status |',
        '|---|---:|---:|---|',
        ...gate.checks.map((check) => `| ${check.label} | ${check.actual} | ${check.required} | ${check.passed ? 'PASS' : 'FAIL'} |`),
    ];
}

function getGateActual(gate: BenchmarkCoverageGate, key: BenchmarkCoverageGateCheck['key']): number {
    return gate.checks.find((check) => check.key === key)?.actual ?? 0;
}

export function buildCapturedBenchmarkPlan(
    dataset: BenchmarkDataset,
    intakeManifest: CapturedClipIntakeManifest,
    labelSet: CapturedClipLabelSet,
): CapturedBenchmarkPlan {
    const coverage = buildBenchmarkCoverageSummary(dataset);
    const capturedClips = dataset.clips.filter((clip) => clip.quality.sourceType === 'captured');
    const capturedWeapons = new Set(capturedClips.map((clip) => clip.capture.weaponId));
    const capturedOptics = new Set(capturedClips.map((clip) => `${clip.capture.optic.opticId}:${clip.capture.optic.stateId}`));
    const primaryPatchVersion = choosePrimaryPatchVersion(capturedClips);
    const labelSummaryByClipId = new Map(
        summarizeCapturedClipLabelSet(labelSet).clips.map((clip) => [clip.clipId, clip]),
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

    const projectedStarterActuals: StarterGateActuals = {
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
            projectedStarterActuals.distinctWeapons += 1;
        }

        if (remainingDiagnosedGap > 0) {
            requiresExpectedDiagnosis = true;
            purpose.push('fechar gap de diagnostico esperado');
            remainingDiagnosedGap -= 1;
            projectedStarterActuals.capturedDiagnosedClips += 1;
        }

        if (remainingGoldenGap > 0) {
            targetReviewStatus = 'golden';
            purpose.push('fechar gap de golden');
            remainingGoldenGap -= 1;
            projectedStarterActuals.capturedGoldenClips += 1;
        }

        if (requiresExpectedDiagnosis || targetReviewStatus === 'golden') {
            targetTrackingTier = 'clean';
        } else {
            targetTrackingTier = chooseTrackingTier(trackingCounts);
        }

        trackingCounts[targetTrackingTier] += 1;
        distanceCounts[distanceBucket] += 1;
        projectedStarterActuals.capturedClips += 1;
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
            planTier: 'starter',
            purpose,
            targetReviewStatus,
            targetTrackingTier,
            targetVisibilityTier,
            targetOcclusionLevel,
            targetCompressionLevel,
            targetDistanceBucket: distanceBucket,
            targetPatchVersion: primaryPatchVersion,
            weaponPolicy,
            opticPolicy: 'any',
            avoidWeaponIds,
            avoidOpticKeys: [],
            requiresExpectedDiagnosis,
            requiresSpecialistReview: false,
            notes,
        });
    }

    const specialistReviewGap = Math.max(
        0,
        (coverage.sddGate.checks.find((check) => check.key === 'specialistReviewedGoldenClips')?.required ?? 0) - coverage.specialistReviewedGoldenClips,
    );
    const specialistReviewActions = specialistReviewGap > 0
        ? capturedClips
            .filter((clip) => clip.quality.reviewStatus === 'golden' && resolveReviewProvenanceSource(clip) !== 'specialist-reviewed')
            .sort((left, right) => {
                const leftProvenance = resolveReviewProvenanceSource(left);
                const rightProvenance = resolveReviewProvenanceSource(right);
                if (leftProvenance !== rightProvenance) {
                    return leftProvenance.localeCompare(rightProvenance);
                }

                return left.clipId.localeCompare(right.clipId);
            })
            .slice(0, specialistReviewGap)
            .map((clip) => ({
                clipId: clip.clipId,
                currentReviewStatus: clip.quality.reviewStatus,
                currentReviewProvenance: resolveReviewProvenanceSource(clip),
                targetReviewStatus: 'golden' as const,
                targetReviewProvenance: 'specialist-reviewed' as const,
                reason: getSpecialistReviewReason(clip),
            }))
        : [];

    const projectedSddActuals: SddGateActuals = {
        currentPatchCapturedClips: coverage.currentPatchCapturedClips,
        distinctOptics: coverage.uniqueOptics.length,
        cleanCapturedClips: coverage.trackingTiers.clean,
        degradedCapturedClips: coverage.trackingTiers.degraded,
        specialistReviewedGoldenClips: coverage.specialistReviewedGoldenClips + specialistReviewActions.length,
    };

    let remainingCurrentPatchGap = Math.max(0, getGateActual(coverage.sddGate, 'currentPatchCapturedClips') === 0 ? 1 : 0);
    let remainingDistinctOpticGap = Math.max(0, (coverage.sddGate.checks.find((check) => check.key === 'distinctOptics')?.required ?? 0) - coverage.uniqueOptics.length);
    const evidenceDistanceCounts: Record<DistanceBucket, number> = {
        '0-30m': coverage.distanceBuckets['0-30m'],
        '31-60m': coverage.distanceBuckets['31-60m'],
        '61-100m': coverage.distanceBuckets['61-100m'],
        '101m+': coverage.distanceBuckets['101m+'],
    };
    const evidenceCaptureBlueprints: CapturedBenchmarkCaptureBlueprint[] = [];

    while (remainingCurrentPatchGap > 0 || remainingDistinctOpticGap > 0) {
        const purpose: string[] = [];
        const targetPatchVersion = remainingCurrentPatchGap > 0 ? CURRENT_PUBG_PATCH_VERSION : primaryPatchVersion;
        const opticPolicy = remainingDistinctOpticGap > 0 ? 'new-distinct-optic' : 'any';
        const distanceBucket = chooseDistanceBucket(evidenceDistanceCounts);

        if (remainingCurrentPatchGap > 0) {
            purpose.push(`fechar gap de clip capturado no patch atual ${CURRENT_PUBG_PATCH_VERSION}`);
            remainingCurrentPatchGap -= 1;
            projectedSddActuals.currentPatchCapturedClips += 1;
        }

        if (remainingDistinctOpticGap > 0) {
            purpose.push('fechar gap de optic/optic state distinto no corpus SDD');
            remainingDistinctOpticGap -= 1;
            projectedSddActuals.distinctOptics += 1;
        }

        evidenceDistanceCounts[distanceBucket] += 1;
        projectedSddActuals.cleanCapturedClips += 1;

        evidenceCaptureBlueprints.push({
            slotId: `sdd-evidence-slot-${evidenceCaptureBlueprints.length + 1}`,
            planTier: 'sdd-evidence',
            purpose,
            targetReviewStatus: 'reviewed',
            targetTrackingTier: 'clean',
            targetVisibilityTier: 'clean',
            targetOcclusionLevel: 'light',
            targetCompressionLevel: 'light',
            targetDistanceBucket: distanceBucket,
            targetPatchVersion,
            weaponPolicy: 'any',
            opticPolicy,
            avoidWeaponIds: [],
            avoidOpticKeys: opticPolicy === 'new-distinct-optic' ? [...capturedOptics].sort() : [],
            requiresExpectedDiagnosis: false,
            requiresSpecialistReview: true,
            notes: 'Priorizar um clip limpo no patch atual, preferencialmente com outro optic/optic state, para virar candidato forte a validacao especialista.',
        });
    }

    return {
        datasetId: dataset.datasetId,
        currentStarterGate: coverage.starterGate,
        currentSddGate: coverage.sddGate,
        promotionActions,
        specialistReviewActions,
        captureBlueprints,
        evidenceCaptureBlueprints,
        projectedStarterGate: buildStarterGate(projectedStarterActuals),
        projectedSddGate: buildProjectedSddGate(projectedSddActuals, coverage.sddGate.checks),
    };
}

export function renderCapturedBenchmarkPlanMarkdown(
    plan: CapturedBenchmarkPlan,
    options: CapturedBenchmarkPlanMarkdownOptions,
): string {
    const currentGoldenActual = getGateActual(plan.currentStarterGate, 'capturedGoldenClips');
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
        '## Current SDD Evidence Gate',
        '',
        ...renderGateTable(plan.currentSddGate),
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
    lines.push('## SDD Specialist Review Actions');
    lines.push('');

    if (plan.specialistReviewActions.length === 0) {
        if (currentGoldenActual === 0) {
            lines.push('- Nenhuma revisao especialista pendente foi planejada enquanto o clip golden ainda nao existe.');
        } else if (plan.currentSddGate.passed) {
            lines.push('- Nenhuma revisao especialista pendente; o corpus atual ja cumpre o requisito de provenance especialista.');
        } else {
            lines.push('- Nenhuma revisao especialista automatica encontrada; revisar manualmente os goldens atuais.');
        }
    } else {
        for (const action of plan.specialistReviewActions) {
            lines.push(`- Solicitar revisao especialista de \`${action.clipId}\` para manter \`${action.targetReviewStatus}\` com provenance \`${action.targetReviewProvenance}\`.`);
            lines.push(`  Motivo: ${action.reason}.`);
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
            lines.push(`- Plan tier: \`${blueprint.planTier}\``);
            lines.push(`- Target review status: \`${blueprint.targetReviewStatus}\``);
            lines.push(`- Target tracking tier: \`${blueprint.targetTrackingTier}\``);
            lines.push(`- Target visibility tier: \`${blueprint.targetVisibilityTier}\``);
            lines.push(`- Target occlusion: \`${blueprint.targetOcclusionLevel}\``);
            lines.push(`- Target compression: \`${blueprint.targetCompressionLevel}\``);
            lines.push(`- Target distance bucket: \`${blueprint.targetDistanceBucket}\``);
            lines.push(`- Target patch version: \`${blueprint.targetPatchVersion}\``);
            lines.push(`- Weapon policy: \`${blueprint.weaponPolicy}\``);
            lines.push(`- Optic policy: \`${blueprint.opticPolicy}\``);
            if (blueprint.avoidWeaponIds.length > 0) {
                lines.push(`- Avoid weapon ids: \`${blueprint.avoidWeaponIds.join('`, `')}\``);
            }
            if (blueprint.avoidOpticKeys.length > 0) {
                lines.push(`- Avoid optic keys: \`${blueprint.avoidOpticKeys.join('`, `')}\``);
            }
            lines.push(`- Requires expected diagnosis: \`${blueprint.requiresExpectedDiagnosis}\``);
            lines.push(`- Requires specialist review: \`${blueprint.requiresSpecialistReview}\``);
            lines.push(`- Notes: ${blueprint.notes}`);
            lines.push('');
        }
    }

    lines.push('## SDD Evidence Capture Blueprints');
    lines.push('');

    if (plan.evidenceCaptureBlueprints.length === 0) {
        lines.push('- Nenhum clip novo necessario para fechar o SDD evidence gate.');
    } else {
        for (const blueprint of plan.evidenceCaptureBlueprints) {
            lines.push(`### ${blueprint.slotId}`);
            lines.push('');
            lines.push(`- Purpose: ${blueprint.purpose.join('; ')}.`);
            lines.push(`- Plan tier: \`${blueprint.planTier}\``);
            lines.push(`- Target review status: \`${blueprint.targetReviewStatus}\``);
            lines.push(`- Target tracking tier: \`${blueprint.targetTrackingTier}\``);
            lines.push(`- Target visibility tier: \`${blueprint.targetVisibilityTier}\``);
            lines.push(`- Target occlusion: \`${blueprint.targetOcclusionLevel}\``);
            lines.push(`- Target compression: \`${blueprint.targetCompressionLevel}\``);
            lines.push(`- Target distance bucket: \`${blueprint.targetDistanceBucket}\``);
            lines.push(`- Target patch version: \`${blueprint.targetPatchVersion}\``);
            lines.push(`- Weapon policy: \`${blueprint.weaponPolicy}\``);
            lines.push(`- Optic policy: \`${blueprint.opticPolicy}\``);
            if (blueprint.avoidWeaponIds.length > 0) {
                lines.push(`- Avoid weapon ids: \`${blueprint.avoidWeaponIds.join('`, `')}\``);
            }
            if (blueprint.avoidOpticKeys.length > 0) {
                lines.push(`- Avoid optic keys: \`${blueprint.avoidOpticKeys.join('`, `')}\``);
            }
            lines.push(`- Requires expected diagnosis: \`${blueprint.requiresExpectedDiagnosis}\``);
            lines.push(`- Requires specialist review: \`${blueprint.requiresSpecialistReview}\``);
            lines.push(`- Notes: ${blueprint.notes}`);
            lines.push('');
        }
    }

    lines.push('## Projected Starter Gate After Plan');
    lines.push('');
    lines.push(...renderGateTable(plan.projectedStarterGate));
    lines.push('');
    lines.push('## Projected SDD Evidence Gate After Plan');
    lines.push('');
    lines.push(...renderGateTable(plan.projectedSddGate));

    return `${lines.join('\n')}\n`;
}

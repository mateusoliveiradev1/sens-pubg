import type { CapturedBenchmarkPlan } from './captured-benchmark-plan';
import type { CapturedCaptureSlotRequestSet } from '@/types/captured-capture-slot-request';

export interface BuildCapturedCaptureSlotTemplateOptions {
    readonly requestSetId: string;
    readonly datasetId: string;
    readonly createdAt: string;
    readonly plan: CapturedBenchmarkPlan;
}

export function buildCapturedCaptureSlotTemplate(
    options: BuildCapturedCaptureSlotTemplateOptions,
): CapturedCaptureSlotRequestSet {
    const blueprints = [
        ...options.plan.captureBlueprints,
        ...options.plan.evidenceCaptureBlueprints,
    ];

    return {
        schemaVersion: 1,
        requestSetId: options.requestSetId,
        datasetId: options.datasetId,
        createdAt: options.createdAt,
        slots: blueprints.map((blueprint) => ({
            slotId: blueprint.slotId,
            planTier: blueprint.planTier,
            purpose: [...blueprint.purpose],
            targetReviewStatus: blueprint.targetReviewStatus,
            targetTrackingTier: blueprint.targetTrackingTier,
            targetVisibilityTier: blueprint.targetVisibilityTier,
            targetOcclusionLevel: blueprint.targetOcclusionLevel,
            targetCompressionLevel: blueprint.targetCompressionLevel,
            targetDistanceBucket: blueprint.targetDistanceBucket,
            targetPatchVersion: blueprint.targetPatchVersion,
            weaponPolicy: blueprint.weaponPolicy,
            opticPolicy: blueprint.opticPolicy,
            avoidWeaponIds: [...blueprint.avoidWeaponIds],
            avoidOpticKeys: [...blueprint.avoidOpticKeys],
            requiresExpectedDiagnosis: blueprint.requiresExpectedDiagnosis,
            requiresSpecialistReview: blueprint.requiresSpecialistReview,
            notes: blueprint.notes,
            intakeTemplate: {
                clipId: `captured-${blueprint.slotId}`,
                videoPath: null,
                contactPreviewPath: null,
                centerPreviewPath: null,
                sha256: null,
            },
        })),
    };
}

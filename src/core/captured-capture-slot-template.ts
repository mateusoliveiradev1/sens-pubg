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
    return {
        schemaVersion: 1,
        requestSetId: options.requestSetId,
        datasetId: options.datasetId,
        createdAt: options.createdAt,
        slots: options.plan.captureBlueprints.map((blueprint) => ({
            slotId: blueprint.slotId,
            purpose: [...blueprint.purpose],
            targetReviewStatus: blueprint.targetReviewStatus,
            targetTrackingTier: blueprint.targetTrackingTier,
            targetVisibilityTier: blueprint.targetVisibilityTier,
            targetOcclusionLevel: blueprint.targetOcclusionLevel,
            targetCompressionLevel: blueprint.targetCompressionLevel,
            targetDistanceBucket: blueprint.targetDistanceBucket,
            weaponPolicy: blueprint.weaponPolicy,
            avoidWeaponIds: [...blueprint.avoidWeaponIds],
            requiresExpectedDiagnosis: blueprint.requiresExpectedDiagnosis,
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

import { z } from 'zod';

const CAPTURED_CAPTURE_SLOT_REQUEST_SCHEMA_VERSION = 1 as const;

const benchmarkReviewStatusSchema = z.enum(['draft', 'reviewed', 'golden']);
const trackingTierSchema = z.enum(['clean', 'degraded']);
const visibilityTierSchema = z.enum(['clean', 'degraded', 'rejected']);
const occlusionLevelSchema = z.enum(['none', 'light', 'moderate', 'heavy']);
const compressionLevelSchema = z.enum(['lossless', 'light', 'medium', 'heavy']);
const distanceBucketSchema = z.enum(['0-30m', '31-60m', '61-100m', '101m+']);
const weaponPolicySchema = z.enum(['new-distinct-weapon', 'any']);
const opticPolicySchema = z.enum(['new-distinct-optic', 'any']);
const planTierSchema = z.enum(['starter', 'sdd-evidence']);

export const capturedCaptureSlotRequestSchema = z.object({
    slotId: z.string().min(1),
    planTier: planTierSchema,
    purpose: z.array(z.string().min(1)).min(1),
    targetReviewStatus: benchmarkReviewStatusSchema,
    targetTrackingTier: trackingTierSchema,
    targetVisibilityTier: visibilityTierSchema,
    targetOcclusionLevel: occlusionLevelSchema,
    targetCompressionLevel: compressionLevelSchema,
    targetDistanceBucket: distanceBucketSchema,
    targetPatchVersion: z.string().min(1),
    weaponPolicy: weaponPolicySchema,
    opticPolicy: opticPolicySchema,
    avoidWeaponIds: z.array(z.string().min(1)),
    avoidOpticKeys: z.array(z.string().min(1)),
    requiresExpectedDiagnosis: z.boolean(),
    requiresSpecialistReview: z.boolean(),
    notes: z.string().min(1),
    intakeTemplate: z.object({
        clipId: z.string().min(1),
        videoPath: z.string().nullable(),
        contactPreviewPath: z.string().nullable(),
        centerPreviewPath: z.string().nullable(),
        sha256: z.string().nullable(),
    }),
});

export const capturedCaptureSlotRequestSetSchema = z.object({
    schemaVersion: z.literal(CAPTURED_CAPTURE_SLOT_REQUEST_SCHEMA_VERSION),
    requestSetId: z.string().min(1),
    datasetId: z.string().min(1),
    createdAt: z.string().datetime(),
    slots: z.array(capturedCaptureSlotRequestSchema),
});

export type CapturedCaptureSlotRequest = z.infer<typeof capturedCaptureSlotRequestSchema>;
export type CapturedCaptureSlotRequestSet = z.infer<typeof capturedCaptureSlotRequestSetSchema>;

export const parseCapturedCaptureSlotRequestSet = (value: unknown): CapturedCaptureSlotRequestSet =>
    capturedCaptureSlotRequestSetSchema.parse(value);

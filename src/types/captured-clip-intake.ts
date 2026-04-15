import { z } from 'zod';

const CAPTURED_CLIP_INTAKE_SCHEMA_VERSION = 1 as const;

const reviewStatusSchema = z.enum(['auto-triaged', 'human-reviewed']);
const qualityTierSchema = z.enum(['candidate-clean', 'candidate-degraded', 'rejected']);
const occlusionLevelSchema = z.enum(['none', 'light', 'moderate', 'heavy']);
const compressionLevelSchema = z.enum(['lossless', 'light', 'medium', 'heavy']);
const reticleVisibilitySchema = z.enum(['visible', 'intermittent', 'blocked']);
const benchmarkReadinessSchema = z.enum(['needs-labels', 'ready-for-golden-labels', 'rejected']);
const unknownCaptureFieldSchema = z.enum([
    'patchVersion',
    'weaponId',
    'distanceMeters',
    'stance',
    'optic',
    'attachments',
    'expectedDiagnoses',
    'sprayWindow',
    'frameLabels',
]);

export const capturedClipIntakeMediaSchema = z.object({
    videoPath: z.string().min(1),
    contactPreviewPath: z.string().min(1),
    centerPreviewPath: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    sizeBytes: z.number().int().positive(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().positive(),
    frameCount: z.number().int().positive(),
    durationSeconds: z.number().positive(),
    codecFourcc: z.string().min(1),
    meanBlurLaplacian: z.number().nonnegative(),
    meanCenterBlurLaplacian: z.number().nonnegative(),
});

export const capturedClipIntakeQualitySchema = z.object({
    reviewStatus: reviewStatusSchema,
    qualityTier: qualityTierSchema,
    occlusionLevel: occlusionLevelSchema,
    compressionLevel: compressionLevelSchema,
    reticleVisibility: reticleVisibilitySchema,
    benchmarkReadiness: benchmarkReadinessSchema,
    rationale: z.string().min(1),
});

export const capturedClipIntakeClipSchema = z
    .object({
        clipId: z.string().min(1),
        media: capturedClipIntakeMediaSchema,
        quality: capturedClipIntakeQualitySchema,
        unknownCaptureFields: z.array(unknownCaptureFieldSchema),
    })
    .superRefine((clip, ctx) => {
        if (clip.quality.qualityTier === 'rejected' && clip.quality.benchmarkReadiness !== 'rejected') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['quality', 'benchmarkReadiness'],
                message: 'clips rejeitados devem ter benchmarkReadiness="rejected"',
            });
        }

        if (clip.unknownCaptureFields.length > 0 && clip.quality.benchmarkReadiness === 'ready-for-golden-labels') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['quality', 'benchmarkReadiness'],
                message: 'clips com campos humanos pendentes nao podem ser marcados como prontos para goldens',
            });
        }

        if (clip.quality.reticleVisibility === 'blocked' && clip.quality.qualityTier !== 'rejected') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['quality', 'qualityTier'],
                message: 'clips com reticulo bloqueado devem ser rejeitados no intake',
            });
        }
    });

export const capturedClipIntakeManifestSchema = z.object({
    schemaVersion: z.literal(CAPTURED_CLIP_INTAKE_SCHEMA_VERSION),
    manifestId: z.string().min(1),
    createdAt: z.string().datetime(),
    clips: z.array(capturedClipIntakeClipSchema).min(1),
});

export type CapturedClipIntakeMedia = z.infer<typeof capturedClipIntakeMediaSchema>;
export type CapturedClipIntakeQuality = z.infer<typeof capturedClipIntakeQualitySchema>;
export type CapturedClipIntakeClip = z.infer<typeof capturedClipIntakeClipSchema>;
export type CapturedClipIntakeManifest = z.infer<typeof capturedClipIntakeManifestSchema>;

export const parseCapturedClipIntakeManifest = (value: unknown): CapturedClipIntakeManifest =>
    capturedClipIntakeManifestSchema.parse(value);

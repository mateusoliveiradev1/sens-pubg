import { z } from 'zod';
import { getOptic, getOpticState } from '@/game/pubg/optic-catalog';
import { getWeaponPatchProfile } from '@/game/pubg/weapon-patch-catalog';
import { getAttachmentByLegacyId } from '@/game/pubg/attachment-catalog';

const BENCHMARK_SCHEMA_VERSION = 1 as const;

const playerStanceSchema = z.enum(['standing', 'crouching', 'prone']);
const muzzleAttachmentSchema = z.enum(['none', 'compensator', 'flash_hider', 'suppressor', 'muzzle_brake', 'choke', 'duckbill']);
const gripAttachmentSchema = z.enum(['none', 'vertical', 'angled', 'half', 'thumb', 'lightweight', 'laser', 'ergonomic', 'tilted']);
const stockAttachmentSchema = z.enum(['none', 'tactical', 'heavy', 'folding', 'cheek_pad']);
const diagnosisTypeSchema = z.enum([
    'overpull',
    'underpull',
    'late_compensation',
    'excessive_jitter',
    'horizontal_drift',
    'inconsistency',
    'inconclusive',
]);
const coachModeSchema = z.enum(['standard', 'low-confidence', 'inconclusive']);
const coachDecisionTierSchema = z.enum(['capture_again', 'test_protocol', 'stabilize_block', 'apply_protocol']);
const coachFocusAreaSchema = z.enum([
    'capture_quality',
    'vertical_control',
    'horizontal_control',
    'timing',
    'consistency',
    'sensitivity',
    'loadout',
    'validation',
]);
const trackingTierSchema = z.enum(['clean', 'degraded']);
const sourceTypeSchema = z.enum(['captured', 'synthetic', 'augmented']);
const reviewStatusSchema = z.enum(['draft', 'reviewed', 'golden']);
const reviewProvenanceSourceSchema = z.enum(['machine-assisted', 'codex-assisted', 'human-reviewed', 'specialist-reviewed']);
const occlusionLevelSchema = z.enum(['none', 'light', 'moderate', 'heavy']);
const compressionLevelSchema = z.enum(['lossless', 'light', 'medium', 'heavy']);
const visibilityTierSchema = z.enum(['clean', 'degraded', 'rejected']);

export const benchmarkClipMediaSchema = z.object({
    videoPath: z.string().min(1),
    frameLabelsPath: z.string().min(1).optional(),
    previewImagePath: z.string().min(1).optional(),
    sha256: z.string().min(32).optional(),
});

export const benchmarkClipSprayWindowSchema = z.object({
    startSeconds: z.number().nonnegative(),
    endSeconds: z.number().positive(),
}).superRefine((sprayWindow, ctx) => {
    if (sprayWindow.endSeconds <= sprayWindow.startSeconds) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['endSeconds'],
            message: 'endSeconds deve ser maior que startSeconds',
        });
    }
});

export const benchmarkClipOpticSchema = z.object({
    opticId: z.string().min(1),
    stateId: z.string().min(1),
});

export const benchmarkClipCaptureSchema = z.object({
    patchVersion: z.string().regex(/^\d+\.\d+$/, 'patchVersion deve usar o formato major.minor'),
    weaponId: z.string().min(1),
    distanceMeters: z.number().positive(),
    stance: playerStanceSchema,
    optic: benchmarkClipOpticSchema,
    attachments: z.object({
        muzzle: muzzleAttachmentSchema,
        grip: gripAttachmentSchema,
        stock: stockAttachmentSchema,
    }),
});

export const benchmarkCoachPlanExpectationSchema = z.object({
    tier: coachDecisionTierSchema,
    primaryFocusArea: coachFocusAreaSchema,
    nextBlockTitle: z.string().min(1),
});

export const benchmarkClipLabelsSchema = z.object({
    expectedDiagnoses: z.array(diagnosisTypeSchema),
    expectedCoachMode: coachModeSchema.optional(),
    expectedCoachPlan: benchmarkCoachPlanExpectationSchema.optional(),
    expectedTrackingTier: trackingTierSchema,
    notes: z.string().min(1).optional(),
}).superRefine((labels, ctx) => {
    if (labels.expectedDiagnoses.length === 0 && labels.expectedCoachMode !== undefined) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['expectedCoachMode'],
            message: 'expectedCoachMode deve ser omitido quando nao houver diagnosticos esperados',
        });
    }

    if (labels.expectedDiagnoses.length > 0 && labels.expectedCoachMode === undefined) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['expectedCoachMode'],
            message: 'expectedCoachMode e obrigatorio quando houver diagnosticos esperados',
        });
    }
});

export const benchmarkClipReviewProvenanceSchema = z.object({
    source: reviewProvenanceSourceSchema,
    reviewerId: z.string().min(1).optional(),
    reviewedAt: z.string().datetime().optional(),
    notes: z.string().min(1).optional(),
});

export const benchmarkClipQualitySchema = z.object({
    sourceType: sourceTypeSchema,
    reviewStatus: reviewStatusSchema,
    occlusionLevel: occlusionLevelSchema,
    compressionLevel: compressionLevelSchema,
    visibilityTier: visibilityTierSchema,
    notes: z.string().min(1).optional(),
    reviewProvenance: benchmarkClipReviewProvenanceSchema.optional(),
});

export const benchmarkClipFixturesSchema = z.object({
    trackingFixturePath: z.string().min(1).optional(),
    diagnosticFixturePath: z.string().min(1).optional(),
    coachFixturePath: z.string().min(1).optional(),
});

export const benchmarkClipSchema = z.object({
    clipId: z.string().min(1),
    media: benchmarkClipMediaSchema,
    sprayWindow: benchmarkClipSprayWindowSchema.optional(),
    capture: benchmarkClipCaptureSchema,
    labels: benchmarkClipLabelsSchema,
    quality: benchmarkClipQualitySchema,
    fixtures: benchmarkClipFixturesSchema.optional(),
}).superRefine((clip, ctx) => {
    const { patchVersion, weaponId, optic, attachments } = clip.capture;

    if (!getWeaponPatchProfile(patchVersion, weaponId)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['capture', 'weaponId'],
            message: `weaponId "${weaponId}" nao existe no patch ${patchVersion}`,
        });
    }

    const opticDefinition = getOptic(patchVersion, optic.opticId);
    if (!opticDefinition) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['capture', 'optic', 'opticId'],
            message: `opticId "${optic.opticId}" nao existe no patch ${patchVersion}`,
        });
    } else if (!getOpticState(patchVersion, optic.opticId, optic.stateId)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['capture', 'optic', 'stateId'],
            message: `stateId "${optic.stateId}" nao existe para opticId "${optic.opticId}" no patch ${patchVersion}`,
        });
    }

    if (attachments.muzzle !== 'none' && !getAttachmentByLegacyId(patchVersion, attachments.muzzle, 'muzzle')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['capture', 'attachments', 'muzzle'],
            message: `muzzle "${attachments.muzzle}" nao existe no patch ${patchVersion}`,
        });
    }

    if (attachments.grip !== 'none' && !getAttachmentByLegacyId(patchVersion, attachments.grip, 'grip')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['capture', 'attachments', 'grip'],
            message: `grip "${attachments.grip}" nao existe no patch ${patchVersion}`,
        });
    }

    if (attachments.stock !== 'none' && !getAttachmentByLegacyId(patchVersion, attachments.stock, 'stock')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['capture', 'attachments', 'stock'],
            message: `stock "${attachments.stock}" nao existe no patch ${patchVersion}`,
        });
    }
});

export const benchmarkDatasetSchema = z.object({
    schemaVersion: z.literal(BENCHMARK_SCHEMA_VERSION),
    datasetId: z.string().min(1),
    createdAt: z.string().datetime(),
    clips: z.array(benchmarkClipSchema).min(1),
});

export type BenchmarkClipMedia = z.infer<typeof benchmarkClipMediaSchema>;
export type BenchmarkClipSprayWindow = z.infer<typeof benchmarkClipSprayWindowSchema>;
export type BenchmarkClipOptic = z.infer<typeof benchmarkClipOpticSchema>;
export type BenchmarkClipCapture = z.infer<typeof benchmarkClipCaptureSchema>;
export type BenchmarkCoachPlanExpectation = z.infer<typeof benchmarkCoachPlanExpectationSchema>;
export type BenchmarkClipLabels = z.infer<typeof benchmarkClipLabelsSchema>;
export type BenchmarkClipReviewProvenance = z.infer<typeof benchmarkClipReviewProvenanceSchema>;
export type BenchmarkClipQuality = z.infer<typeof benchmarkClipQualitySchema>;
export type BenchmarkClipFixtures = z.infer<typeof benchmarkClipFixturesSchema>;
export type BenchmarkClip = z.infer<typeof benchmarkClipSchema>;
export type BenchmarkDataset = z.infer<typeof benchmarkDatasetSchema>;

export function parseBenchmarkDataset(value: unknown): BenchmarkDataset {
    return benchmarkDatasetSchema.parse(value);
}

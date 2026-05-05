import { z } from 'zod';
import { getAttachmentByLegacyId } from '@/game/pubg/attachment-catalog';
import { getOptic, getOpticState } from '@/game/pubg/optic-catalog';
import { getWeaponPatchProfile } from '@/game/pubg/weapon-patch-catalog';
import { benchmarkCoachPlanExpectationSchema, benchmarkTruthExpectationSchema } from './benchmark';

const CAPTURED_CLIP_LABEL_SET_SCHEMA_VERSION = 1 as const;

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
const trackingTierSchema = z.enum(['clean', 'degraded']);

const nullablePatchVersionSchema = z.string().regex(/^\d+\.\d+$/).nullable();
const nullablePositiveNumberSchema = z.number().positive().nullable();
const nullableNonEmptyStringSchema = z.string().min(1).nullable();

export const capturedClipCaptureLabelsSchema = z
    .object({
        patchVersion: nullablePatchVersionSchema,
        weaponId: nullableNonEmptyStringSchema,
        distanceMeters: nullablePositiveNumberSchema,
        stance: playerStanceSchema.nullable(),
        optic: z.object({
            opticId: nullableNonEmptyStringSchema,
            stateId: nullableNonEmptyStringSchema,
        }),
        attachments: z.object({
            muzzle: muzzleAttachmentSchema.nullable(),
            grip: gripAttachmentSchema.nullable(),
            stock: stockAttachmentSchema.nullable(),
        }),
    })
    .superRefine((capture, ctx) => {
        if (capture.patchVersion === null) {
            return;
        }

        if (capture.weaponId !== null && !getWeaponPatchProfile(capture.patchVersion, capture.weaponId)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['weaponId'],
                message: `weaponId "${capture.weaponId}" nao existe no patch ${capture.patchVersion}`,
            });
        }

        if (capture.optic.opticId !== null && !getOptic(capture.patchVersion, capture.optic.opticId)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['optic', 'opticId'],
                message: `opticId "${capture.optic.opticId}" nao existe no patch ${capture.patchVersion}`,
            });
        }

        if (
            capture.optic.opticId !== null
            && capture.optic.stateId !== null
            && !getOpticState(capture.patchVersion, capture.optic.opticId, capture.optic.stateId)
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['optic', 'stateId'],
                message: `stateId "${capture.optic.stateId}" nao existe para opticId "${capture.optic.opticId}" no patch ${capture.patchVersion}`,
            });
        }

        if (
            capture.attachments.muzzle !== null
            && capture.attachments.muzzle !== 'none'
            && !getAttachmentByLegacyId(capture.patchVersion, capture.attachments.muzzle, 'muzzle')
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['attachments', 'muzzle'],
                message: `muzzle "${capture.attachments.muzzle}" nao existe no patch ${capture.patchVersion}`,
            });
        }

        if (
            capture.attachments.grip !== null
            && capture.attachments.grip !== 'none'
            && !getAttachmentByLegacyId(capture.patchVersion, capture.attachments.grip, 'grip')
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['attachments', 'grip'],
                message: `grip "${capture.attachments.grip}" nao existe no patch ${capture.patchVersion}`,
            });
        }

        if (
            capture.attachments.stock !== null
            && capture.attachments.stock !== 'none'
            && !getAttachmentByLegacyId(capture.patchVersion, capture.attachments.stock, 'stock')
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['attachments', 'stock'],
                message: `stock "${capture.attachments.stock}" nao existe no patch ${capture.patchVersion}`,
            });
        }
    });

export const capturedClipSprayWindowLabelsSchema = z
    .object({
        startSeconds: nullablePositiveNumberSchema,
        endSeconds: nullablePositiveNumberSchema,
    })
    .superRefine((sprayWindow, ctx) => {
        if (
            sprayWindow.startSeconds !== null
            && sprayWindow.endSeconds !== null
            && sprayWindow.endSeconds <= sprayWindow.startSeconds
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['endSeconds'],
                message: 'endSeconds deve ser maior que startSeconds',
            });
        }
    });

export const capturedClipExpectedLabelsSchema = z
    .object({
        expectedDiagnoses: z.array(diagnosisTypeSchema).nullable(),
        expectedCoachMode: coachModeSchema.nullable().optional(),
        expectedCoachPlan: benchmarkCoachPlanExpectationSchema.nullable().optional(),
        expectedTrackingTier: trackingTierSchema.nullable(),
        expectedTruth: benchmarkTruthExpectationSchema.nullable(),
    })
    .superRefine((labels, ctx) => {
        if (
            labels.expectedDiagnoses !== null
            && labels.expectedDiagnoses.length > 0
            && (labels.expectedCoachMode === undefined || labels.expectedCoachMode === null)
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['expectedCoachMode'],
                message: 'expectedCoachMode e obrigatorio quando ha diagnosticos esperados',
            });
        }

        if (
            labels.expectedDiagnoses !== null
            && labels.expectedDiagnoses.length > 0
            && (labels.expectedCoachPlan === undefined || labels.expectedCoachPlan === null)
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['expectedCoachPlan'],
                message: 'expectedCoachPlan e obrigatorio quando ha diagnosticos esperados',
            });
        }
    });

export const capturedClipLabelSchema = z.object({
    clipId: z.string().min(1),
    capture: capturedClipCaptureLabelsSchema,
    sprayWindow: capturedClipSprayWindowLabelsSchema,
    frameLabelsPath: nullableNonEmptyStringSchema,
    labels: capturedClipExpectedLabelsSchema,
    notes: z.string().min(1).optional(),
});

export const capturedClipLabelSetSchema = z.object({
    schemaVersion: z.literal(CAPTURED_CLIP_LABEL_SET_SCHEMA_VERSION),
    labelSetId: z.string().min(1),
    intakeManifestId: z.string().min(1),
    createdAt: z.string().datetime(),
    clips: z.array(capturedClipLabelSchema).min(1),
});

export type CapturedClipLabel = z.infer<typeof capturedClipLabelSchema>;
export type CapturedClipLabelSet = z.infer<typeof capturedClipLabelSetSchema>;

export interface CapturedClipLabelSummary {
    readonly clipId: string;
    readonly readyForGoldenLabels: boolean;
    readonly missingFieldPaths: readonly string[];
}

export interface CapturedClipLabelSetSummary {
    readonly totalClips: number;
    readonly readyClipCount: number;
    readonly clips: readonly CapturedClipLabelSummary[];
}

export const parseCapturedClipLabelSet = (value: unknown): CapturedClipLabelSet =>
    capturedClipLabelSetSchema.parse(value);

const pushIfMissing = (
    missingFieldPaths: string[],
    path: string,
    value: unknown,
): void => {
    if (value === null || value === undefined) {
        missingFieldPaths.push(path);
    }
};

export const summarizeCapturedClipLabel = (clip: CapturedClipLabel): CapturedClipLabelSummary => {
    const missingFieldPaths: string[] = [];

    pushIfMissing(missingFieldPaths, 'capture.patchVersion', clip.capture.patchVersion);
    pushIfMissing(missingFieldPaths, 'capture.weaponId', clip.capture.weaponId);
    pushIfMissing(missingFieldPaths, 'capture.distanceMeters', clip.capture.distanceMeters);
    pushIfMissing(missingFieldPaths, 'capture.stance', clip.capture.stance);
    pushIfMissing(missingFieldPaths, 'capture.optic.opticId', clip.capture.optic.opticId);
    pushIfMissing(missingFieldPaths, 'capture.optic.stateId', clip.capture.optic.stateId);
    pushIfMissing(missingFieldPaths, 'capture.attachments.muzzle', clip.capture.attachments.muzzle);
    pushIfMissing(missingFieldPaths, 'capture.attachments.grip', clip.capture.attachments.grip);
    pushIfMissing(missingFieldPaths, 'capture.attachments.stock', clip.capture.attachments.stock);
    pushIfMissing(missingFieldPaths, 'sprayWindow.startSeconds', clip.sprayWindow.startSeconds);
    pushIfMissing(missingFieldPaths, 'sprayWindow.endSeconds', clip.sprayWindow.endSeconds);
    pushIfMissing(missingFieldPaths, 'frameLabelsPath', clip.frameLabelsPath);
    pushIfMissing(missingFieldPaths, 'labels.expectedDiagnoses', clip.labels.expectedDiagnoses);
    pushIfMissing(missingFieldPaths, 'labels.expectedTrackingTier', clip.labels.expectedTrackingTier);
    pushIfMissing(missingFieldPaths, 'labels.expectedTruth', clip.labels.expectedTruth);

    if (
        clip.labels.expectedDiagnoses !== null
        && clip.labels.expectedDiagnoses.length > 0
        && (clip.labels.expectedCoachMode === null || clip.labels.expectedCoachMode === undefined)
    ) {
        missingFieldPaths.push('labels.expectedCoachMode');
    }

    if (
        clip.labels.expectedDiagnoses !== null
        && clip.labels.expectedDiagnoses.length > 0
        && (clip.labels.expectedCoachPlan === null || clip.labels.expectedCoachPlan === undefined)
    ) {
        missingFieldPaths.push('labels.expectedCoachPlan');
    }

    return {
        clipId: clip.clipId,
        readyForGoldenLabels: missingFieldPaths.length === 0,
        missingFieldPaths,
    };
};

export const summarizeCapturedClipLabelSet = (labelSet: CapturedClipLabelSet): CapturedClipLabelSetSummary => {
    const clips = labelSet.clips.map(summarizeCapturedClipLabel);

    return {
        totalClips: clips.length,
        readyClipCount: clips.filter((clip) => clip.readyForGoldenLabels).length,
        clips,
    };
};

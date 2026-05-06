import { z } from 'zod';

const CAPTURED_CLIP_CONSENT_SCHEMA_VERSION = 1 as const;

const consentStatusSchema = z.enum([
    'intake_received',
    'consent_verified',
    'metadata_complete',
    'technical_screened',
    'label_review',
    'specialist_reviewed',
    'golden_candidate',
    'golden_promoted',
    'rejected',
    'deferred',
    'withdrawn',
]);

const allowedPurposeSchema = z.enum([
    'internal_validation',
    'commercial_benchmark',
    'trainability',
    'qualitative_reference',
]);

const rawClipStorageSchema = z.enum(['private_only', 'internal_reviewer']);
const derivativeScopeSchema = z.enum([
    'metadata_only',
    'metadata_and_report',
    'thumbnail_allowed',
    'frames_allowed',
]);

export const capturedClipConsentWithdrawalSchema = z.object({
    withdrawnAt: z.string().datetime(),
    reason: z.string().min(1),
    quarantineRequired: z.boolean(),
    requiresRebaseline: z.boolean(),
});

export const capturedClipConsentRecordSchema = z
    .object({
        clipId: z.string().min(1),
        contributorRef: z.string().min(1),
        consentCapturedAt: z.string().datetime(),
        consentStatus: consentStatusSchema,
        allowedPurposes: z.array(allowedPurposeSchema).min(1),
        trainabilityAuthorized: z.boolean(),
        rawClipStorage: rawClipStorageSchema,
        derivativeScope: derivativeScopeSchema,
        redistributionAllowed: z.boolean(),
        reviewerRef: z.string().min(1),
        reviewedAt: z.string().datetime(),
        transitionReason: z.string().min(1),
        withdrawal: capturedClipConsentWithdrawalSchema.optional(),
    })
    .superRefine((record, ctx) => {
        if (
            record.consentStatus === 'golden_promoted' &&
            !record.allowedPurposes.includes('commercial_benchmark')
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['allowedPurposes'],
                message: 'golden_promoted exige allowedPurposes com commercial_benchmark',
            });
        }

        if (record.consentStatus === 'golden_promoted' && !record.trainabilityAuthorized) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['trainabilityAuthorized'],
                message: 'golden_promoted exige trainabilityAuthorized=true',
            });
        }

        if (record.consentStatus === 'withdrawn') {
            if (!record.withdrawal) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['withdrawal'],
                    message: 'withdrawn exige withdrawal',
                });
            } else {
                if (!record.withdrawal.quarantineRequired) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ['withdrawal', 'quarantineRequired'],
                        message: 'withdrawn exige quarantineRequired=true',
                    });
                }

                if (!record.withdrawal.requiresRebaseline) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ['withdrawal', 'requiresRebaseline'],
                        message: 'withdrawn exige requiresRebaseline=true',
                    });
                }
            }
        }

        if (
            record.redistributionAllowed &&
            record.derivativeScope !== 'thumbnail_allowed' &&
            record.derivativeScope !== 'frames_allowed'
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['redistributionAllowed'],
                message: 'redistributionAllowed=true exige derivativeScope thumbnail_allowed ou frames_allowed',
            });
        }
    });

export const capturedClipConsentManifestSchema = z.object({
    schemaVersion: z.literal(CAPTURED_CLIP_CONSENT_SCHEMA_VERSION),
    manifestId: z.string().min(1),
    createdAt: z.string().datetime(),
    clips: z.array(capturedClipConsentRecordSchema).min(1),
});

export type CapturedClipConsentWithdrawal = z.infer<typeof capturedClipConsentWithdrawalSchema>;
export type CapturedClipConsentRecord = z.infer<typeof capturedClipConsentRecordSchema>;
export type CapturedClipConsentManifest = z.infer<typeof capturedClipConsentManifestSchema>;
export type CapturedClipConsentStatus = CapturedClipConsentRecord['consentStatus'];
export type CapturedClipAllowedPurpose = CapturedClipConsentRecord['allowedPurposes'][number];

export const parseCapturedClipConsentManifest = (value: unknown): CapturedClipConsentManifest =>
    capturedClipConsentManifestSchema.parse(value);

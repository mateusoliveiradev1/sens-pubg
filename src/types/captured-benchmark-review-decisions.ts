import { z } from 'zod';

const CAPTURED_BENCHMARK_REVIEW_DECISION_SCHEMA_VERSION = 1 as const;

const benchmarkReviewStatusSchema = z.enum(['reviewed', 'golden']);
const approvalStatusSchema = z.enum(['pending', 'approved']);

export const capturedBenchmarkReviewDecisionSchema = z.object({
    clipId: z.string().min(1),
    proposedReviewStatus: benchmarkReviewStatusSchema,
    approvalStatus: approvalStatusSchema,
    approvedReviewStatus: benchmarkReviewStatusSchema.nullable().optional(),
    approvedBy: z.string().min(1).nullable().optional(),
    approvedAt: z.string().datetime().nullable().optional(),
    rationale: z.string().min(1),
    notes: z.string().min(1).optional(),
}).superRefine((decision, ctx) => {
    if (decision.approvalStatus === 'pending') {
        if (decision.approvedReviewStatus !== undefined && decision.approvedReviewStatus !== null) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['approvedReviewStatus'],
                message: 'approvedReviewStatus deve ficar nulo enquanto approvalStatus for pending',
            });
        }

        if (decision.approvedBy !== undefined && decision.approvedBy !== null) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['approvedBy'],
                message: 'approvedBy deve ficar nulo enquanto approvalStatus for pending',
            });
        }

        if (decision.approvedAt !== undefined && decision.approvedAt !== null) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['approvedAt'],
                message: 'approvedAt deve ficar nulo enquanto approvalStatus for pending',
            });
        }
    }

    if (decision.approvalStatus === 'approved') {
        if (decision.approvedReviewStatus === undefined || decision.approvedReviewStatus === null) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['approvedReviewStatus'],
                message: 'approvedReviewStatus e obrigatorio quando approvalStatus for approved',
            });
        }

        if (decision.approvedBy === undefined || decision.approvedBy === null) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['approvedBy'],
                message: 'approvedBy e obrigatorio quando approvalStatus for approved',
            });
        }

        if (decision.approvedAt === undefined || decision.approvedAt === null) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['approvedAt'],
                message: 'approvedAt e obrigatorio quando approvalStatus for approved',
            });
        }
    }
});

export const capturedBenchmarkReviewDecisionSetSchema = z.object({
    schemaVersion: z.literal(CAPTURED_BENCHMARK_REVIEW_DECISION_SCHEMA_VERSION),
    decisionSetId: z.string().min(1),
    intakeManifestId: z.string().min(1),
    labelSetId: z.string().min(1),
    createdAt: z.string().datetime(),
    decisions: z.array(capturedBenchmarkReviewDecisionSchema),
});

export type CapturedBenchmarkReviewDecision = z.infer<typeof capturedBenchmarkReviewDecisionSchema>;
export type CapturedBenchmarkReviewDecisionSet = z.infer<typeof capturedBenchmarkReviewDecisionSetSchema>;

export const parseCapturedBenchmarkReviewDecisionSet = (value: unknown): CapturedBenchmarkReviewDecisionSet =>
    capturedBenchmarkReviewDecisionSetSchema.parse(value);

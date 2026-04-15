import { describe, expect, it } from 'vitest';
import type { CapturedBenchmarkPlan } from './captured-benchmark-plan';
import type { CapturedClipIntakeManifest } from '@/types/captured-clip-intake';
import type { CapturedClipLabelSet } from '@/types/captured-clip-labels';
import { buildCapturedReviewDecisionTemplate } from './captured-review-decisions-template';

const intakeManifest: CapturedClipIntakeManifest = {
    schemaVersion: 1,
    manifestId: 'captured-clips-intake-2026-04-14',
    createdAt: '2026-04-14T18:45:00.000Z',
    clips: [],
};

const labelSet: CapturedClipLabelSet = {
    schemaVersion: 1,
    labelSetId: 'captured-clips-labels-todo-2026-04-14',
    intakeManifestId: 'captured-clips-intake-2026-04-14',
    createdAt: '2026-04-14T19:05:00.000Z',
    clips: [],
};

const plan: CapturedBenchmarkPlan = {
    datasetId: 'captured-benchmark-draft',
    currentStarterGate: {
        passed: false,
        checks: [],
    },
    promotionActions: [
        {
            clipId: 'captured-clip1-2026-04-14',
            currentReviewStatus: 'reviewed',
            targetReviewStatus: 'golden',
            qualityTier: 'candidate-clean',
            reason: 'clip capturado pronto para revisao humana final',
        },
    ],
    captureBlueprints: [],
    projectedStarterGate: {
        passed: true,
        checks: [],
    },
};

describe('captured review decisions template', () => {
    it('creates a pending decision file from promotion candidates without fabricating approval', () => {
        const template = buildCapturedReviewDecisionTemplate({
            decisionSetId: 'captured-review-decisions-todo-2026-04-14',
            createdAt: '2026-04-14T23:10:00.000Z',
            intakeManifest,
            labelSet,
            plan,
        });

        expect(template.intakeManifestId).toBe('captured-clips-intake-2026-04-14');
        expect(template.labelSetId).toBe('captured-clips-labels-todo-2026-04-14');
        expect(template.decisions).toEqual([
            {
                clipId: 'captured-clip1-2026-04-14',
                proposedReviewStatus: 'golden',
                approvalStatus: 'pending',
                approvedReviewStatus: null,
                approvedBy: null,
                approvedAt: null,
                rationale: 'Promocao proposta automaticamente: clip capturado pronto para revisao humana final.',
                notes: 'Preencher approvedBy/aprovedAt e approvedReviewStatus somente depois da revisao humana final do clip.',
            },
        ]);
    });

    it('preserves approved decisions when regenerating the template for the same clip', () => {
        const template = buildCapturedReviewDecisionTemplate({
            decisionSetId: 'captured-review-decisions-todo-2026-04-14',
            createdAt: '2026-04-14T23:10:00.000Z',
            intakeManifest,
            labelSet,
            plan,
            existingDecisionSet: {
                schemaVersion: 1,
                decisionSetId: 'captured-review-decisions-todo-2026-04-14',
                intakeManifestId: 'captured-clips-intake-2026-04-14',
                labelSetId: 'captured-clips-labels-todo-2026-04-14',
                createdAt: '2026-04-14T23:00:00.000Z',
                decisions: [
                    {
                        clipId: 'captured-clip1-2026-04-14',
                        proposedReviewStatus: 'golden',
                        approvalStatus: 'approved',
                        approvedReviewStatus: 'golden',
                        approvedBy: 'codex-auto-review',
                        approvedAt: '2026-04-14T23:45:00.000Z',
                        rationale: 'Promocao proposta automaticamente: clip capturado pronto para revisao humana final.',
                        notes: 'Aprovado em revisao assistida pelo Codex.',
                    },
                ],
            },
        });

        expect(template.decisions).toEqual([
            {
                clipId: 'captured-clip1-2026-04-14',
                proposedReviewStatus: 'golden',
                approvalStatus: 'approved',
                approvedReviewStatus: 'golden',
                approvedBy: 'codex-auto-review',
                approvedAt: '2026-04-14T23:45:00.000Z',
                rationale: 'Promocao proposta automaticamente: clip capturado pronto para revisao humana final.',
                notes: 'Aprovado em revisao assistida pelo Codex.',
            },
        ]);
    });

    it('keeps previously approved decisions even when the current plan no longer asks for promotion', () => {
        const template = buildCapturedReviewDecisionTemplate({
            decisionSetId: 'captured-review-decisions-todo-2026-04-14',
            createdAt: '2026-04-14T23:10:00.000Z',
            intakeManifest,
            labelSet,
            plan: {
                ...plan,
                promotionActions: [],
            },
            existingDecisionSet: {
                schemaVersion: 1,
                decisionSetId: 'captured-review-decisions-todo-2026-04-14',
                intakeManifestId: 'captured-clips-intake-2026-04-14',
                labelSetId: 'captured-clips-labels-todo-2026-04-14',
                createdAt: '2026-04-14T23:00:00.000Z',
                decisions: [
                    {
                        clipId: 'captured-clip1-2026-04-14',
                        proposedReviewStatus: 'golden',
                        approvalStatus: 'approved',
                        approvedReviewStatus: 'golden',
                        approvedBy: 'codex-auto-review',
                        approvedAt: '2026-04-14T23:45:00.000Z',
                        rationale: 'Promocao proposta automaticamente: clip capturado pronto para revisao humana final.',
                        notes: 'Aprovado em revisao assistida pelo Codex.',
                    },
                ],
            },
        });

        expect(template.decisions).toEqual([
            {
                clipId: 'captured-clip1-2026-04-14',
                proposedReviewStatus: 'golden',
                approvalStatus: 'approved',
                approvedReviewStatus: 'golden',
                approvedBy: 'codex-auto-review',
                approvedAt: '2026-04-14T23:45:00.000Z',
                rationale: 'Promocao proposta automaticamente: clip capturado pronto para revisao humana final.',
                notes: 'Aprovado em revisao assistida pelo Codex.',
            },
        ]);
    });
});

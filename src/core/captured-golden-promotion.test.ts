import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCapturedClipIntakeManifest } from '@/types/captured-clip-intake';
import { parseCapturedBenchmarkReviewDecisionSet } from '@/types/captured-benchmark-review-decisions';
import { parseCapturedClipLabelSet } from '@/types/captured-clip-labels';
import { buildCapturedBenchmarkPromotion } from './captured-golden-promotion';

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

describe('captured golden promotion', () => {
    it('promotes the reviewed captured clips into a benchmark dataset draft', () => {
        const intakeManifest = parseCapturedClipIntakeManifest(readJson('tests/fixtures/captured-clips/intake.v1.json'));
        const labelSet = parseCapturedClipLabelSet(readJson('tests/fixtures/captured-clips/labels.todo.v1.json'));

        const promotion = buildCapturedBenchmarkPromotion({
            datasetId: 'captured-benchmark-draft',
            createdAt: '2026-04-14T19:30:00.000Z',
            intakeManifest,
            labelSet,
        });

        expect(promotion.dataset).toBeDefined();
        expect(promotion.promotedClipCount).toBe(intakeManifest.clips.length);
        expect(promotion.goldenClipCount).toBe(0);
        expect(promotion.blockedClips).toEqual([]);
        const clip1 = promotion.dataset?.clips.find((clip) => clip.clipId === 'captured-clip1-2026-04-14');
        const clip2 = promotion.dataset?.clips.find((clip) => clip.clipId === 'captured-clip2-2026-04-14');
        const clip3 = promotion.dataset?.clips.find((clip) => clip.clipId === 'captured-clip3-2026-04-14');
        const clip4 = promotion.dataset?.clips.find((clip) => clip.clipId === 'captured-clip4-2026-04-14');
        const clip5 = promotion.dataset?.clips.find((clip) => clip.clipId === 'captured-clip5-2026-04-16');

        expect(clip1?.capture.weaponId).toBe('aug');
        expect(clip1?.capture.distanceMeters).toBe(100);
        expect(clip1?.quality.reviewProvenance).toEqual({
            source: 'machine-assisted',
        });
        expect(clip1?.sprayWindow).toEqual({
            startSeconds: 11.8,
            endSeconds: 14.8,
        });
        expect(clip1?.labels.expectedDiagnoses).toEqual([]);
        expect(clip2?.capture.distanceMeters).toBe(50);
        expect(clip2?.quality.visibilityTier).toBe('degraded');
        expect(clip3?.capture.weaponId).toBe('aug');
        expect(clip4?.capture.weaponId).toBe('beryl-m762');
        expect(clip4?.labels.expectedDiagnoses).toEqual(['overpull']);
        expect(clip5?.capture.patchVersion).toBe('41.1');
        expect(clip5?.capture.optic).toEqual({
            opticId: '2x',
            stateId: '2x',
        });
        expect(clip5?.capture.attachments).toEqual({
            muzzle: 'muzzle_brake',
            grip: 'tilted',
            stock: 'none',
        });
    });

    it('promotes a fully labeled captured clip into a benchmark dataset draft', () => {
        const intakeManifest = parseCapturedClipIntakeManifest(readJson('tests/fixtures/captured-clips/intake.v1.json'));
        const labelSet = parseCapturedClipLabelSet({
            schemaVersion: 1,
            labelSetId: 'complete-captured-labels',
            intakeManifestId: intakeManifest.manifestId,
            createdAt: '2026-04-14T19:30:00.000Z',
            clips: [
                {
                    clipId: 'captured-clip1-2026-04-14',
                    capture: {
                        patchVersion: '41.1',
                        weaponId: 'beryl-m762',
                        distanceMeters: 50,
                        stance: 'standing',
                        optic: {
                            opticId: 'red-dot-sight',
                            stateId: '1x',
                        },
                        attachments: {
                            muzzle: 'compensator',
                            grip: 'vertical',
                            stock: 'none',
                        },
                    },
                    sprayWindow: {
                        startSeconds: 6.8,
                        endSeconds: 12.4,
                    },
                    frameLabelsPath: 'tests/fixtures/captured-clips/labels/clip1.frames.json',
                    labels: {
                        expectedDiagnoses: ['underpull'],
                        expectedCoachMode: 'standard',
                        expectedTrackingTier: 'clean',
                    },
                },
            ],
        });

        const promotion = buildCapturedBenchmarkPromotion({
            datasetId: 'captured-benchmark-draft',
            createdAt: '2026-04-14T19:30:00.000Z',
            intakeManifest,
            labelSet,
        });

        expect(promotion.blockedClips).toEqual([]);
        expect(promotion.promotedClipCount).toBe(1);
        expect(promotion.goldenClipCount).toBe(0);
        expect(promotion.dataset?.datasetId).toBe('captured-benchmark-draft');
        expect(promotion.dataset?.clips[0]?.media.videoPath).toBe('tests/fixtures/captured-clips/clip1.mp4');
        expect(promotion.dataset?.clips[0]?.media.frameLabelsPath).toBe(
            'tests/fixtures/captured-clips/labels/clip1.frames.json',
        );
        expect(promotion.dataset?.clips[0]?.media.previewImagePath).toBe(
            'tests/fixtures/captured-clips/previews/clip1_center.jpg',
        );
        expect(promotion.dataset?.clips[0]?.sprayWindow).toEqual({
            startSeconds: 6.8,
            endSeconds: 12.4,
        });
        expect(promotion.dataset?.clips[0]?.capture.weaponId).toBe('beryl-m762');
        expect(promotion.dataset?.clips[0]?.quality.sourceType).toBe('captured');
        expect(promotion.dataset?.clips[0]?.quality.reviewStatus).toBe('reviewed');
        expect(promotion.dataset?.clips[0]?.quality.reviewProvenance).toEqual({
            source: 'machine-assisted',
        });
        expect(promotion.dataset?.clips[0]?.quality.visibilityTier).toBe('clean');
    });

    it('keeps pending golden decisions as reviewed until approval is explicit', () => {
        const intakeManifest = parseCapturedClipIntakeManifest(readJson('tests/fixtures/captured-clips/intake.v1.json'));
        const labelSet = parseCapturedClipLabelSet(readJson('tests/fixtures/captured-clips/labels.todo.v1.json'));
        const reviewDecisionSet = parseCapturedBenchmarkReviewDecisionSet({
            schemaVersion: 1,
            decisionSetId: 'captured-review-decisions-todo',
            intakeManifestId: intakeManifest.manifestId,
            labelSetId: labelSet.labelSetId,
            createdAt: '2026-04-14T22:45:00.000Z',
            decisions: [
                {
                    clipId: 'captured-clip1-2026-04-14',
                    proposedReviewStatus: 'golden',
                    approvalStatus: 'pending',
                    approvedReviewStatus: null,
                    approvedReviewProvenance: null,
                    approvedBy: null,
                    approvedAt: null,
                    rationale: 'Candidato limpo aguardando confirmacao humana.',
                },
            ],
        });

        const promotion = buildCapturedBenchmarkPromotion({
            datasetId: 'captured-benchmark-draft',
            createdAt: '2026-04-14T23:00:00.000Z',
            intakeManifest,
            labelSet,
            reviewDecisionSet,
        });

        expect(promotion.goldenClipCount).toBe(0);
        expect(promotion.dataset?.clips[0]?.quality.reviewStatus).toBe('reviewed');
        expect(promotion.dataset?.clips[0]?.quality.reviewProvenance).toEqual({
            source: 'machine-assisted',
        });
    });

    it('promotes a clip to golden only when the decision is explicitly approved', () => {
        const intakeManifest = parseCapturedClipIntakeManifest(readJson('tests/fixtures/captured-clips/intake.v1.json'));
        const labelSet = parseCapturedClipLabelSet(readJson('tests/fixtures/captured-clips/labels.todo.v1.json'));
        const reviewDecisionSet = parseCapturedBenchmarkReviewDecisionSet({
            schemaVersion: 1,
            decisionSetId: 'captured-review-decisions-approved',
            intakeManifestId: intakeManifest.manifestId,
            labelSetId: labelSet.labelSetId,
            createdAt: '2026-04-14T22:45:00.000Z',
            decisions: [
                {
                    clipId: 'captured-clip1-2026-04-14',
                    proposedReviewStatus: 'golden',
                    approvalStatus: 'approved',
                    approvedReviewStatus: 'golden',
                    approvedReviewProvenance: 'specialist-reviewed',
                    approvedBy: 'human-reviewer',
                    approvedAt: '2026-04-14T22:50:00.000Z',
                    rationale: 'Clip limpo confirmado manualmente como golden inicial.',
                },
            ],
        });

        const promotion = buildCapturedBenchmarkPromotion({
            datasetId: 'captured-benchmark-draft',
            createdAt: '2026-04-14T23:00:00.000Z',
            intakeManifest,
            labelSet,
            reviewDecisionSet,
        });

        expect(promotion.goldenClipCount).toBe(1);
        expect(promotion.dataset?.clips[0]?.quality.reviewStatus).toBe('golden');
        expect(promotion.dataset?.clips[0]?.quality.reviewProvenance).toEqual({
            source: 'specialist-reviewed',
            reviewerId: 'human-reviewer',
            reviewedAt: '2026-04-14T22:50:00.000Z',
        });
        expect(promotion.dataset?.clips[1]?.quality.reviewStatus).toBe('reviewed');
    });

    it('keeps the approved promotion provenance when a specialist review for the same clip is still pending', () => {
        const intakeManifest = parseCapturedClipIntakeManifest(readJson('tests/fixtures/captured-clips/intake.v1.json'));
        const labelSet = parseCapturedClipLabelSet(readJson('tests/fixtures/captured-clips/labels.todo.v1.json'));
        const reviewDecisionSet = parseCapturedBenchmarkReviewDecisionSet({
            schemaVersion: 1,
            decisionSetId: 'captured-review-decisions-mixed',
            intakeManifestId: intakeManifest.manifestId,
            labelSetId: labelSet.labelSetId,
            createdAt: '2026-04-14T22:45:00.000Z',
            decisions: [
                {
                    clipId: 'captured-clip1-2026-04-14',
                    proposedReviewStatus: 'golden',
                    approvalStatus: 'approved',
                    approvedReviewStatus: 'golden',
                    approvedReviewProvenance: 'codex-assisted',
                    approvedBy: 'codex-auto-review',
                    approvedAt: '2026-04-14T22:50:00.000Z',
                    rationale: 'Promocao proposta automaticamente: clip limpo confirmado.',
                },
                {
                    clipId: 'captured-clip1-2026-04-14',
                    proposedReviewStatus: 'golden',
                    approvalStatus: 'pending',
                    approvedReviewStatus: null,
                    approvedReviewProvenance: null,
                    approvedBy: null,
                    approvedAt: null,
                    rationale: 'Validacao especialista proposta automaticamente: clip golden ainda nao passou por revisao especialista.',
                    notes: 'Aprovacao pendente deve registrar approvedBy/approvedAt e approvedReviewProvenance=`specialist-reviewed` quando a revisao especialista concluir.',
                },
            ],
        });

        const promotion = buildCapturedBenchmarkPromotion({
            datasetId: 'captured-benchmark-draft',
            createdAt: '2026-04-14T23:00:00.000Z',
            intakeManifest,
            labelSet,
            reviewDecisionSet,
        });

        expect(promotion.goldenClipCount).toBe(1);
        expect(promotion.dataset?.clips[0]?.quality.reviewStatus).toBe('golden');
        expect(promotion.dataset?.clips[0]?.quality.reviewProvenance).toEqual({
            source: 'codex-assisted',
            reviewerId: 'codex-auto-review',
            reviewedAt: '2026-04-14T22:50:00.000Z',
        });
    });

    it('prefers a later specialist-reviewed approval over an older codex-assisted promotion for the same clip', () => {
        const intakeManifest = parseCapturedClipIntakeManifest(readJson('tests/fixtures/captured-clips/intake.v1.json'));
        const labelSet = parseCapturedClipLabelSet(readJson('tests/fixtures/captured-clips/labels.todo.v1.json'));
        const reviewDecisionSet = parseCapturedBenchmarkReviewDecisionSet({
            schemaVersion: 1,
            decisionSetId: 'captured-review-decisions-specialist-upgrade',
            intakeManifestId: intakeManifest.manifestId,
            labelSetId: labelSet.labelSetId,
            createdAt: '2026-04-14T22:45:00.000Z',
            decisions: [
                {
                    clipId: 'captured-clip1-2026-04-14',
                    proposedReviewStatus: 'golden',
                    approvalStatus: 'approved',
                    approvedReviewStatus: 'golden',
                    approvedReviewProvenance: 'codex-assisted',
                    approvedBy: 'codex-auto-review',
                    approvedAt: '2026-04-14T22:50:00.000Z',
                    rationale: 'Promocao proposta automaticamente: clip limpo confirmado.',
                },
                {
                    clipId: 'captured-clip1-2026-04-14',
                    proposedReviewStatus: 'golden',
                    approvalStatus: 'approved',
                    approvedReviewStatus: 'golden',
                    approvedReviewProvenance: 'specialist-reviewed',
                    approvedBy: 'specialist-reviewer',
                    approvedAt: '2026-04-15T10:15:00.000Z',
                    rationale: 'Validacao especialista proposta automaticamente: clip golden revisado por especialista.',
                },
            ],
        });

        const promotion = buildCapturedBenchmarkPromotion({
            datasetId: 'captured-benchmark-draft',
            createdAt: '2026-04-14T23:00:00.000Z',
            intakeManifest,
            labelSet,
            reviewDecisionSet,
        });

        expect(promotion.goldenClipCount).toBe(1);
        expect(promotion.dataset?.clips[0]?.quality.reviewStatus).toBe('golden');
        expect(promotion.dataset?.clips[0]?.quality.reviewProvenance).toEqual({
            source: 'specialist-reviewed',
            reviewerId: 'specialist-reviewer',
            reviewedAt: '2026-04-15T10:15:00.000Z',
        });
    });

    it('blocks labels that do not match any captured intake clip', () => {
        const intakeManifest = parseCapturedClipIntakeManifest(readJson('tests/fixtures/captured-clips/intake.v1.json'));
        const labelSet = parseCapturedClipLabelSet({
            schemaVersion: 1,
            labelSetId: 'orphan-labels',
            intakeManifestId: intakeManifest.manifestId,
            createdAt: '2026-04-14T19:30:00.000Z',
            clips: [
                {
                    clipId: 'missing-intake-clip',
                    capture: {
                        patchVersion: null,
                        weaponId: null,
                        distanceMeters: null,
                        stance: null,
                        optic: {
                            opticId: null,
                            stateId: null,
                        },
                        attachments: {
                            muzzle: null,
                            grip: null,
                            stock: null,
                        },
                    },
                    sprayWindow: {
                        startSeconds: null,
                        endSeconds: null,
                    },
                    frameLabelsPath: null,
                    labels: {
                        expectedDiagnoses: null,
                        expectedCoachMode: null,
                        expectedTrackingTier: null,
                    },
                },
            ],
        });

        const promotion = buildCapturedBenchmarkPromotion({
            datasetId: 'captured-benchmark-draft',
            createdAt: '2026-04-14T19:30:00.000Z',
            intakeManifest,
            labelSet,
        });

        expect(promotion.dataset).toBeUndefined();
        expect(promotion.blockedClips[0]?.reason).toBe('missing-intake');
        expect(promotion.goldenClipCount).toBe(0);
    });
});

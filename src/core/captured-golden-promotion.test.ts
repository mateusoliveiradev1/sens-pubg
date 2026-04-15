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
        expect(promotion.promotedClipCount).toBe(4);
        expect(promotion.goldenClipCount).toBe(0);
        expect(promotion.blockedClips).toEqual([]);
        expect(promotion.dataset?.clips[0]?.clipId).toBe('captured-clip1-2026-04-14');
        expect(promotion.dataset?.clips[0]?.capture.weaponId).toBe('aug');
        expect(promotion.dataset?.clips[0]?.capture.distanceMeters).toBe(100);
        expect(promotion.dataset?.clips[0]?.sprayWindow).toEqual({
            startSeconds: 11.8,
            endSeconds: 14.8,
        });
        expect(promotion.dataset?.clips[0]?.labels.expectedDiagnoses).toEqual([]);
        expect(promotion.dataset?.clips[1]?.clipId).toBe('captured-clip2-2026-04-14');
        expect(promotion.dataset?.clips[1]?.capture.distanceMeters).toBe(50);
        expect(promotion.dataset?.clips[1]?.quality.visibilityTier).toBe('degraded');
        expect(promotion.dataset?.clips[2]?.clipId).toBe('captured-clip3-2026-04-14');
        expect(promotion.dataset?.clips[2]?.capture.weaponId).toBe('aug');
        expect(promotion.dataset?.clips[3]?.clipId).toBe('captured-clip4-2026-04-14');
        expect(promotion.dataset?.clips[3]?.capture.weaponId).toBe('beryl-m762');
        expect(promotion.dataset?.clips[3]?.labels.expectedDiagnoses).toEqual(['overpull']);
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
        expect(promotion.dataset?.clips[1]?.quality.reviewStatus).toBe('reviewed');
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

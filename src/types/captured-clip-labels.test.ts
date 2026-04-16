import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    parseCapturedClipLabelSet,
    summarizeCapturedClipLabelSet,
} from './captured-clip-labels';

const labelsPath = 'tests/fixtures/captured-clips/labels.todo.v1.json';

const readLabels = (): unknown => JSON.parse(readFileSync(labelsPath, 'utf8'));

describe('captured clip labels workflow', () => {
    it('loads the todo labels file and marks the captured corpus as golden-ready', () => {
        const labelSet = parseCapturedClipLabelSet(readLabels());
        const summary = summarizeCapturedClipLabelSet(labelSet);
        const clip5 = summary.clips.find((clip) => clip.clipId === 'captured-clip5-2026-04-16');

        expect(summary.readyClipCount).toBe(summary.clips.length);
        expect(summary.clips.length).toBeGreaterThanOrEqual(5);
        expect(summary.clips[0]?.clipId).toBe('captured-clip1-2026-04-14');
        expect(summary.clips[0]?.readyForGoldenLabels).toBe(true);
        expect(summary.clips[0]?.missingFieldPaths).toEqual([]);
        expect(summary.clips[1]?.clipId).toBe('captured-clip2-2026-04-14');
        expect(summary.clips[1]?.readyForGoldenLabels).toBe(true);
        expect(summary.clips[1]?.missingFieldPaths).toEqual([]);
        expect(summary.clips[2]?.clipId).toBe('captured-clip3-2026-04-14');
        expect(summary.clips[2]?.readyForGoldenLabels).toBe(true);
        expect(summary.clips[2]?.missingFieldPaths).toEqual([]);
        expect(summary.clips[3]?.clipId).toBe('captured-clip4-2026-04-14');
        expect(summary.clips[3]?.readyForGoldenLabels).toBe(true);
        expect(summary.clips[3]?.missingFieldPaths).toEqual([]);
        expect(clip5?.readyForGoldenLabels).toBe(true);
        expect(clip5?.missingFieldPaths).toEqual([]);
    });

    it('marks a fully labeled clip as ready for golden labeling', () => {
        const labelSet = parseCapturedClipLabelSet({
            schemaVersion: 1,
            labelSetId: 'complete-sample',
            intakeManifestId: 'captured-clips-intake-2026-04-14',
            createdAt: '2026-04-14T19:05:00.000Z',
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

        const summary = summarizeCapturedClipLabelSet(labelSet);

        expect(summary.readyClipCount).toBe(1);
        expect(summary.clips[0]?.readyForGoldenLabels).toBe(true);
        expect(summary.clips[0]?.missingFieldPaths).toEqual([]);
    });

    it('rejects label values that do not exist in the selected PUBG patch catalogs', () => {
        expect(() =>
            parseCapturedClipLabelSet({
                schemaVersion: 1,
                labelSetId: 'invalid-catalog-values',
                intakeManifestId: 'captured-clips-intake-2026-04-14',
                createdAt: '2026-04-14T19:05:00.000Z',
                clips: [
                    {
                        clipId: 'captured-clip1-2026-04-14',
                        capture: {
                            patchVersion: '41.1',
                            weaponId: 'unknown-weapon',
                            distanceMeters: 50,
                            stance: 'standing',
                            optic: {
                                opticId: 'unknown-optic',
                                stateId: '1x',
                            },
                            attachments: {
                                muzzle: 'compensator',
                                grip: 'vertical',
                                stock: 'none',
                            },
                        },
                        sprayWindow: {
                            startSeconds: 1,
                            endSeconds: 3,
                        },
                        frameLabelsPath: 'tests/fixtures/captured-clips/labels/clip1.frames.json',
                        labels: {
                            expectedDiagnoses: [],
                            expectedTrackingTier: 'clean',
                        },
                    },
                ],
            }),
        ).toThrow();
    });
});

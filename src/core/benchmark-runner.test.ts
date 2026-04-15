import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runBenchmark } from '../../scripts/run-benchmark';

const datasetPath = fileURLToPath(new URL('../../tests/goldens/benchmark/synthetic-benchmark.v1.json', import.meta.url));
const baselinePath = fileURLToPath(new URL('../../tests/goldens/benchmark/synthetic-benchmark.baseline.json', import.meta.url));

describe('runBenchmark', () => {
    it('runs tracking, diagnostics, and coach benchmarks with baseline regression summary', async () => {
        const report = await runBenchmark({
            datasetPath,
            baselinePath,
        });

        expect(report.passed).toBe(true);
        expect(report.summary.totalClips).toBe(2);
        expect(report.summary.failedClips).toBe(0);
        expect(report.summary.tracking.passed).toBe(2);
        expect(report.summary.diagnostics.passed).toBe(2);
        expect(report.summary.coach.passed).toBe(2);
        expect(report.summary.tracking.confidenceCalibration.sampleCount).toBe(7);
        expect(report.summary.tracking.confidenceCalibration.brierScore).toBeLessThan(0.1);
        expect(report.summary.tracking.confidenceCalibration.expectedCalibrationError).toBeGreaterThan(0);
        expect(report.sourceBreakdown.synthetic?.totalClips).toBe(2);
        expect(report.sourceBreakdown.synthetic?.failedClips).toBe(0);
        expect(report.sourceBreakdown.synthetic?.tracking.confidenceCalibration.expectedCalibrationError).toBeGreaterThan(0);
        expect(report.sourceBreakdown.captured).toBeUndefined();
        expect(report.regression?.isRegression).toBe(false);
        expect(report.clips.map((clip) => clip.clipId).sort()).toEqual([
            'clean-centered-red-411',
            'degraded-underpull-411',
        ]);
    });

    it('replays captured frame labels through the pure pipeline when explicit fixtures are absent', async () => {
        const tempDir = await mkdtemp(path.join(tmpdir(), 'captured-benchmark-'));
        const tempDatasetPath = path.join(tempDir, 'captured-benchmark-draft.json');

        await writeFile(tempDatasetPath, JSON.stringify({
            schemaVersion: 1,
            datasetId: 'captured-benchmark-draft',
            createdAt: '2026-04-14T20:00:00.000Z',
            clips: [
                {
                    clipId: 'captured-clip1-2026-04-14',
                    media: {
                        videoPath: 'tests/fixtures/captured-clips/clip1.mp4',
                        frameLabelsPath: 'tests/fixtures/captured-clips/labels/captured-clip1-2026-04-14.frames.todo.json',
                    },
                    sprayWindow: {
                        startSeconds: 11.8,
                        endSeconds: 14.8,
                    },
                    capture: {
                        patchVersion: '40.1',
                        weaponId: 'aug',
                        distanceMeters: 100,
                        stance: 'standing',
                        optic: {
                            opticId: 'red-dot-sight',
                            stateId: '1x',
                        },
                        attachments: {
                            muzzle: 'muzzle_brake',
                            grip: 'thumb',
                            stock: 'none',
                        },
                    },
                    labels: {
                        expectedDiagnoses: [],
                        expectedTrackingTier: 'clean',
                    },
                    quality: {
                        sourceType: 'captured',
                        reviewStatus: 'reviewed',
                        occlusionLevel: 'light',
                        compressionLevel: 'light',
                        visibilityTier: 'clean',
                    },
                },
                {
                    clipId: 'captured-clip2-2026-04-14',
                    media: {
                        videoPath: 'tests/fixtures/captured-clips/clip2.mp4',
                        frameLabelsPath: 'tests/fixtures/captured-clips/labels/captured-clip2-2026-04-14.frames.todo.json',
                    },
                    sprayWindow: {
                        startSeconds: 11,
                        endSeconds: 14.951,
                    },
                    capture: {
                        patchVersion: '40.1',
                        weaponId: 'aug',
                        distanceMeters: 50,
                        stance: 'standing',
                        optic: {
                            opticId: 'red-dot-sight',
                            stateId: '1x',
                        },
                        attachments: {
                            muzzle: 'muzzle_brake',
                            grip: 'thumb',
                            stock: 'none',
                        },
                    },
                    labels: {
                        expectedDiagnoses: [],
                        expectedTrackingTier: 'degraded',
                    },
                    quality: {
                        sourceType: 'captured',
                        reviewStatus: 'reviewed',
                        occlusionLevel: 'moderate',
                        compressionLevel: 'light',
                        visibilityTier: 'degraded',
                    },
                },
            ],
        }, null, 2));

        const report = await runBenchmark({
            datasetPath: tempDatasetPath,
        });

        expect(report.passed).toBe(true);
        expect(report.summary.totalClips).toBe(2);
        expect(report.summary.failedClips).toBe(0);
        expect(report.summary.tracking.passed).toBe(2);
        expect(report.summary.diagnostics.passed).toBe(2);
        expect(report.summary.coach.passed).toBe(2);
        expect(report.sourceBreakdown.captured?.totalClips).toBe(2);
        expect(report.sourceBreakdown.captured?.failedClips).toBe(0);
        expect(report.summary.tracking.confidenceCalibration.expectedCalibrationError).toBeGreaterThan(0);
        expect(report.sourceBreakdown.captured?.tracking.confidenceCalibration.expectedCalibrationError).toBeGreaterThan(0);

        const cleanClip = report.clips.find((clip) => clip.clipId === 'captured-clip1-2026-04-14');
        const degradedClip = report.clips.find((clip) => clip.clipId === 'captured-clip2-2026-04-14');

        expect(cleanClip?.passed).toBe(true);
        expect(cleanClip?.tracking.passed).toBe(true);
        expect(cleanClip?.tracking.fixtureName).toContain('captured-frame-labels');
        expect(cleanClip?.tracking.actualTier).toBe('clean');
        expect(cleanClip?.tracking.error).toBeUndefined();
        expect(cleanClip?.diagnostics.passed).toBe(true);
        expect(cleanClip?.diagnostics.fixtureName).toContain('captured-pipeline');
        expect(cleanClip?.diagnostics.actualTypes).toEqual([]);
        expect(cleanClip?.diagnostics.error).toBeUndefined();
        expect(cleanClip?.coach.passed).toBe(true);
        expect(cleanClip?.coach.fixtureName).toContain('captured-pipeline');
        expect(cleanClip?.coach.actualMode).toBeUndefined();
        expect(cleanClip?.coach.error).toBeUndefined();

        expect(degradedClip?.passed).toBe(true);
        expect(degradedClip?.tracking.passed).toBe(true);
        expect(degradedClip?.tracking.fixtureName).toContain('captured-frame-labels');
        expect(degradedClip?.tracking.actualTier).toBe('degraded');
        expect(degradedClip?.tracking.error).toBeUndefined();
        expect(degradedClip?.diagnostics.passed).toBe(true);
        expect(degradedClip?.diagnostics.fixtureName).toContain('captured-pipeline');
        expect(degradedClip?.diagnostics.actualTypes).toEqual([]);
        expect(degradedClip?.diagnostics.error).toBeUndefined();
        expect(degradedClip?.coach.passed).toBe(true);
        expect(degradedClip?.coach.fixtureName).toContain('captured-pipeline');
        expect(degradedClip?.coach.actualMode).toBeUndefined();
        expect(degradedClip?.coach.error).toBeUndefined();
    });
});

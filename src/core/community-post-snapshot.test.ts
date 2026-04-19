import { describe, expect, it } from 'vitest';

import type { AnalysisSession } from '@/types/engine';

import { createAnalysisResultFixture } from './coach-test-fixtures';

async function loadCommunityPostSnapshotModule() {
    return import('./community-post-snapshot');
}

function createAnalysisSessionFixture(): AnalysisSession {
    const analysisResult = createAnalysisResultFixture();

    return {
        id: 'analysis-session-1',
        userId: 'user-1',
        weaponId: 'beryl-m762',
        scopeId: 'red-dot',
        patchVersion: '41.1',
        stance: analysisResult.loadout.stance,
        attachments: {
            muzzle: analysisResult.loadout.muzzle,
            grip: analysisResult.loadout.grip,
            stock: analysisResult.loadout.stock,
        },
        distance: 30,
        metrics: analysisResult.metrics,
        diagnoses: analysisResult.diagnoses.map((diagnosis) => diagnosis.type),
        sensitivityApplied: analysisResult.sensitivity.recommended,
        createdAt: new Date('2026-04-18T12:01:00.000Z'),
    };
}

describe('createCommunityPostAnalysisSnapshot', () => {
    it('builds the canonical community snapshot contract from an analysis result and stored session', async () => {
        const analysisResult = createAnalysisResultFixture();
        const session = createAnalysisSessionFixture();
        const { createCommunityPostAnalysisSnapshot } = await loadCommunityPostSnapshotModule();

        const snapshot = createCommunityPostAnalysisSnapshot({
            analysisResult,
            session,
        });

        expect(snapshot).toEqual({
            analysisSessionId: 'analysis-session-1',
            analysisResultId: 'analysis-fixture-base',
            analysisTimestamp: '2026-04-18T12:00:00.000Z',
            analysisResultSchemaVersion: 1,
            patchVersion: '41.1',
            weaponId: 'beryl-m762',
            scopeId: 'red-dot',
            distance: 30,
            stance: 'standing',
            attachmentsSnapshot: {
                muzzle: 'compensator',
                grip: 'vertical',
                stock: 'none',
            },
            metricsSnapshot: analysisResult.metrics,
            diagnosesSnapshot: analysisResult.diagnoses,
            coachingSnapshot: {
                feedback: analysisResult.coaching,
                plan: null,
            },
            sensSnapshot: analysisResult.sensitivity,
            trackingSnapshot: analysisResult.trajectory,
        });
    });

    it('returns a deterministic detached snapshot so publication can persist an immutable copy', async () => {
        const analysisResult = createAnalysisResultFixture();
        const session = createAnalysisSessionFixture();
        const { createCommunityPostAnalysisSnapshot } = await loadCommunityPostSnapshotModule();

        const firstSnapshot = createCommunityPostAnalysisSnapshot({
            analysisResult,
            session,
        });
        const secondSnapshot = createCommunityPostAnalysisSnapshot({
            analysisResult,
            session,
        });

        expect(secondSnapshot).toEqual(firstSnapshot);
        expect(secondSnapshot).not.toBe(firstSnapshot);
        expect(firstSnapshot.attachmentsSnapshot).not.toBe(session.attachments);
        expect(firstSnapshot.metricsSnapshot).not.toBe(analysisResult.metrics);
        expect(firstSnapshot.diagnosesSnapshot).not.toBe(analysisResult.diagnoses);
        expect(firstSnapshot.coachingSnapshot.feedback).not.toBe(analysisResult.coaching);
        expect(firstSnapshot.sensSnapshot).not.toBe(analysisResult.sensitivity);
        expect(firstSnapshot.trackingSnapshot).not.toBe(analysisResult.trajectory);
    });
});

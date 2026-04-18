import { describe, expect, it } from 'vitest';

import {
    analysisResultBase,
    analysisResultWithStrongSensitivity,
} from './coach-test-fixtures';
import {
    buildCoachMemorySnapshot,
    type CoachMemoryHistorySession,
} from './coach-memory';
import type { AnalysisResult, CoachFocusArea, ProfileType, SensitivityAcceptanceOutcome } from '../types/engine';

function compatibleHistorySession(
    currentResult: AnalysisResult,
    fullResult: Record<string, unknown>,
    id: string,
): CoachMemoryHistorySession {
    return {
        id,
        createdAt: new Date('2026-04-17T12:00:00.000Z'),
        patchVersion: currentResult.patchVersion,
        distance: currentResult.analysisContext?.targetDistanceMeters,
        loadout: currentResult.loadout,
        fullResult,
    };
}

function historyWithPrimaryFocus(area: CoachFocusArea, id: string): CoachMemoryHistorySession {
    return compatibleHistorySession(analysisResultBase, {
        coachPlan: {
            primaryFocus: { area },
        },
    }, id);
}

function historyWithSensitivityOutcome(
    testedProfile: ProfileType,
    outcome: SensitivityAcceptanceOutcome,
): CoachMemoryHistorySession {
    return compatibleHistorySession(analysisResultWithStrongSensitivity, {
        coachPlan: {
            primaryFocus: { area: 'sensitivity' },
        },
        sensitivity: {
            recommended: testedProfile,
            acceptanceFeedback: {
                testedProfile,
                outcome,
                recordedAt: '2026-04-17T13:00:00.000Z',
            },
        },
    }, `history-sensitivity-${outcome}`);
}

describe('buildCoachMemorySnapshot', () => {
    it('emits a conflict signal when the current sensitivity profile failed in compatible history', () => {
        const snapshot = buildCoachMemorySnapshot({
            currentResult: analysisResultWithStrongSensitivity,
            historySessions: [
                historyWithSensitivityOutcome('high', 'worse'),
            ],
        });

        expect(snapshot.compatibleSessionCount).toBe(1);
        expect(snapshot.conflictingFocusAreas).toEqual(['sensitivity']);
        expect(snapshot.signals).toEqual(expect.arrayContaining([
            expect.objectContaining({
                source: 'history',
                area: 'sensitivity',
                key: 'history.conflict.sensitivity',
                summary: expect.stringContaining('worse'),
            }),
        ]));
    });

    it('recognizes recurrent aligned primary focuses from compatible sessions', () => {
        const snapshot = buildCoachMemorySnapshot({
            currentResult: analysisResultBase,
            historySessions: [
                historyWithPrimaryFocus('vertical_control', 'history-vertical-1'),
                historyWithPrimaryFocus('vertical_control', 'history-vertical-2'),
            ],
        });

        expect(snapshot.compatibleSessionCount).toBe(2);
        expect(snapshot.alignedFocusAreas).toEqual(['vertical_control']);
        expect(snapshot.recurrentFocuses).toEqual([
            expect.objectContaining({
                area: 'vertical_control',
                count: 2,
                supportRatio: 1,
            }),
        ]);
        expect(snapshot.signals).toEqual(expect.arrayContaining([
            expect.objectContaining({
                source: 'history',
                area: 'vertical_control',
                key: 'history.aligned.vertical_control',
            }),
        ]));
    });

    it('ignores sessions outside the compatible patch, loadout, and distance window', () => {
        const snapshot = buildCoachMemorySnapshot({
            currentResult: analysisResultBase,
            historySessions: [
                {
                    ...historyWithPrimaryFocus('vertical_control', 'history-incompatible'),
                    patchVersion: '40.1',
                    distance: 120,
                    loadout: {
                        ...analysisResultBase.loadout,
                        grip: 'angled',
                    },
                },
            ],
        });

        expect(snapshot.compatibleSessionCount).toBe(0);
        expect(snapshot.signals).toEqual([]);
    });
});

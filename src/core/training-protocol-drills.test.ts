import { describe, expect, it } from 'vitest';

import {
    TRAINING_PROTOCOL_DRILLS,
    TRAINING_PROTOCOL_ENVIRONMENTS,
    adaptTrainingProtocolDoseForContext,
    buildTrainingProtocolContextSnapshot,
    selectTrainingProtocolDrillId,
} from './training-protocol-drills';
import {
    analysisResultBase,
    createAnalysisResultFixture,
} from './coach-test-fixtures';
import type { TrainingProtocolDrillId } from '../types/engine';

const REQUIRED_DRILL_IDS: readonly TrainingProtocolDrillId[] = [
    'capture_guided_recapture',
    'validation_controlled_spray',
    'vertical_recoil_lane',
    'horizontal_tracking_lane',
    'timing_first_ten',
    'consistency_repeatability',
    'sensitivity_one_variable_test',
    'loadout_one_variable_test',
];

describe('training protocol drill catalog', () => {
    it('contains all eight stable complete-protocol drill IDs', () => {
        expect(Object.keys(TRAINING_PROTOCOL_DRILLS).sort()).toEqual([...REQUIRED_DRILL_IDS].sort());
    });

    it('maps coach focus areas to stable drill families', () => {
        expect(selectTrainingProtocolDrillId({
            primaryFocusArea: 'capture_quality',
            tier: 'test_protocol',
        })).toBe('capture_guided_recapture');
        expect(selectTrainingProtocolDrillId({
            primaryFocusArea: 'validation',
            tier: 'test_protocol',
        })).toBe('validation_controlled_spray');
        expect(selectTrainingProtocolDrillId({
            primaryFocusArea: 'vertical_control',
            tier: 'test_protocol',
        })).toBe('vertical_recoil_lane');
        expect(selectTrainingProtocolDrillId({
            primaryFocusArea: 'horizontal_control',
            tier: 'test_protocol',
        })).toBe('horizontal_tracking_lane');
        expect(selectTrainingProtocolDrillId({
            primaryFocusArea: 'timing',
            tier: 'test_protocol',
        })).toBe('timing_first_ten');
        expect(selectTrainingProtocolDrillId({
            primaryFocusArea: 'consistency',
            tier: 'stabilize_block',
        })).toBe('consistency_repeatability');
        expect(selectTrainingProtocolDrillId({
            primaryFocusArea: 'sensitivity',
            tier: 'test_protocol',
        })).toBe('sensitivity_one_variable_test');
        expect(selectTrainingProtocolDrillId({
            primaryFocusArea: 'loadout',
            tier: 'test_protocol',
        })).toBe('loadout_one_variable_test');
        expect(selectTrainingProtocolDrillId({
            primaryFocusArea: 'vertical_control',
            tier: 'capture_again',
        })).toBe('capture_guided_recapture');
    });

    it('adapts hard weapons with more rest or lower volume than a normal AR', () => {
        const berylContext = buildTrainingProtocolContextSnapshot({
            analysisResult: createAnalysisResultFixture({
                trajectory: { weaponId: 'beryl-m762' },
            }),
        });
        const m416Context = buildTrainingProtocolContextSnapshot({
            analysisResult: createAnalysisResultFixture({
                trajectory: { weaponId: 'm416' },
            }),
        });
        const berylDose = adaptTrainingProtocolDoseForContext({
            drillId: 'vertical_recoil_lane',
            tier: 'test_protocol',
            context: berylContext,
        });
        const m416Dose = adaptTrainingProtocolDoseForContext({
            drillId: 'vertical_recoil_lane',
            tier: 'test_protocol',
            context: m416Context,
        });

        expect(berylDose.restBetweenSpraysSeconds).toBeGreaterThan(m416Dose.restBetweenSpraysSeconds);
        expect(berylDose.sprayReps).toBeLessThanOrEqual(m416Dose.sprayReps);
    });

    it('keeps missing distance honest while still returning a usable context snapshot', () => {
        const context = buildTrainingProtocolContextSnapshot({
            analysisResult: createAnalysisResultFixture({
                analysisContext: {
                    targetDistanceMeters: Number.NaN,
                    distanceMode: 'unknown',
                },
                metrics: {
                    targetDistanceMeters: Number.NaN,
                },
            }),
        });

        expect(context.distanceMeters).toBeUndefined();
        expect(context.distanceMode).toBe('unknown');
        expect(context.personalizationLimited).toBe(true);
        expect(context.limitationReasons).toContain('missing_distance');
        expect(context.weaponId).toBe(analysisResultBase.trajectory.weaponId);
    });

    it('keeps UGC and future Spray Lab as catalog options, not executable defaults', () => {
        expect(TRAINING_PROTOCOL_ENVIRONMENTS.ugc_range.requiredDefault).toBe(false);
        expect(TRAINING_PROTOCOL_ENVIRONMENTS.future_spray_lab.requiredDefault).toBe(false);
        expect(
            Object.values(TRAINING_PROTOCOL_DRILLS).every((drill) => (
                drill.environment === 'training_mode'
                || drill.environment === 'aim_sound_lab'
            )),
        ).toBe(true);
    });
});

import { describe, expect, it } from 'vitest';

import { buildCoachPlan } from './coach-plan-builder';
import { createAnalysisResultFixture } from './coach-test-fixtures';
import {
    SPRAY_LAB_LANES,
    buildSprayLabLaneContextKey,
    listSprayLabLanePresets,
    selectSprayLabLaneForProtocol,
} from './spray-lab-lanes';
import type {
    CompleteTrainingProtocol,
    TrainingProtocolDrillId,
} from '../types/engine';

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

function protocolFixture(): CompleteTrainingProtocol {
    const result = createAnalysisResultFixture({
        trajectory: { weaponId: 'beryl-m762' },
        analysisContext: {
            targetDistanceMeters: 50,
            distanceMode: 'exact',
            optic: {
                scopeId: '3x',
                opticId: '3x',
                opticStateId: '3x',
                opticName: '3x Scope',
                opticStateName: '3x',
                availableStateIds: ['3x'],
                isDynamicOptic: false,
            },
        },
    });
    const protocol = buildCoachPlan({ analysisResult: result }).completeProtocol;

    if (!protocol) {
        throw new Error('Expected complete protocol fixture');
    }

    return protocol;
}

describe('Spray Lab lane catalog', () => {
    it('contains at least one lane for each complete-protocol drill family', () => {
        for (const drillId of REQUIRED_DRILL_IDS) {
            expect(listSprayLabLanePresets({ drillId }).length).toBeGreaterThanOrEqual(1);
        }

        expect(new Set(SPRAY_LAB_LANES.map((lane) => lane.drillId))).toEqual(new Set(REQUIRED_DRILL_IDS));
    });

    it('lets protocol context override generic lane labels', () => {
        const protocol = protocolFixture();
        const lane = selectSprayLabLaneForProtocol(protocol);

        expect(lane.drillId).toBe(protocol.drillId);
        expect(lane.label).toContain('Beryl M762');
        expect(lane.label).toContain('3x Scope');
        expect(lane.label).toContain('50m');
        expect(lane.label).not.toBe(listSprayLabLanePresets({ drillId: protocol.drillId })[0]?.label);
    });

    it('builds a strict contextual key without collapsing different contexts', () => {
        const protocol = protocolFixture();
        const key = buildSprayLabLaneContextKey(protocol.context);
        const changedContext = {
            ...protocol.context,
            distanceMeters: 60,
        };

        expect(key).toContain('weapon:beryl-m762');
        expect(key).toContain('optic:3x');
        expect(key).toContain('distance:50m');
        expect(buildSprayLabLaneContextKey(changedContext)).not.toBe(key);
    });

    it('keeps limited support as a warning instead of a technical promise', () => {
        const protocol = protocolFixture();
        const limitedProtocol: CompleteTrainingProtocol = {
            ...protocol,
            context: {
                ...protocol.context,
                supportStatus: 'technical_limited',
                limitedSupportReason: 'Suporte limitado para calibracao fina desta arma.',
                personalizationLimited: true,
                limitationReasons: ['limited_weapon_support'],
            },
        };
        const lane = selectSprayLabLaneForProtocol(limitedProtocol);
        const notes = lane.supportNotes.join(' ');

        expect(lane.supportLevel).toBe('limited');
        expect(notes).toContain('Suporte limitado');
        expect(notes).not.toMatch(/garantia|perfeito|calibracao final/i);
    });
});

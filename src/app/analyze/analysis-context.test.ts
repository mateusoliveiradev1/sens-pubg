import { describe, expect, it } from 'vitest';
import { createAnalysisContext } from './analysis-context';

describe('createAnalysisContext', () => {
    it('resolves a legacy scope selection into explicit optic state and target distance', () => {
        const context = createAnalysisContext({
            patchVersion: '41.1',
            scopeId: 'red-dot',
            distanceMeters: 35,
        });

        expect(context.targetDistanceMeters).toBe(35);
        expect(context.distanceMode).toBe('estimated');
        expect(context.distanceNote).toContain('estimativa');
        expect(context.optic).toEqual(expect.objectContaining({
            scopeId: 'red-dot',
            opticId: 'red-dot-sight',
            opticStateId: '1x',
            opticName: 'Red Dot Sight',
            opticStateName: '1x',
            isDynamicOptic: false,
        }));
    });

    it('marks dynamic optics as ambiguous when a single static state is assumed', () => {
        const context = createAnalysisContext({
            patchVersion: '41.1',
            scopeId: 'hybrid-scope',
            distanceMeters: 60,
        });

        expect(context.optic).toEqual(expect.objectContaining({
            opticId: 'hybrid-scope',
            opticStateId: '1x',
            opticName: 'Hybrid Scope',
            opticStateName: '1x',
            isDynamicOptic: true,
            availableStateIds: ['1x', '4x'],
        }));
        expect(context.optic.ambiguityNote).toContain('estado padrao');
    });

    it('uses a neutral reference note when distance is unknown', () => {
        const context = createAnalysisContext({
            patchVersion: '41.1',
            scopeId: 'red-dot',
            distanceMeters: 30,
            distanceMode: 'unknown',
        });

        expect(context.distanceMode).toBe('unknown');
        expect(context.distanceNote).toContain('referencia neutra');
        expect(context.targetDistanceMeters).toBe(30);
    });
});

import { describe, expect, it } from 'vitest';
import {
    PROFILE_WIZARD_SCOPE_ORDER,
    buildHybridScopeHintText,
    buildProfileWizardScopeSens,
    getHybridScopeEquivalentStates,
} from './profile-wizard-scopes';

describe('profile wizard scope controls', () => {
    it('normalizes current patch scope sliders, including 15x', () => {
        const normalized = buildProfileWizardScopeSens({
            '1x': 42,
            'legacy-custom': 77,
        });

        expect(PROFILE_WIZARD_SCOPE_ORDER).toEqual(['red-dot', '2x', '3x', '4x', '6x', '8x', '15x']);
        expect(Object.keys(normalized)).toEqual([
            'red-dot',
            '2x',
            '3x',
            '4x',
            '6x',
            '8x',
            '15x',
            'legacy-custom',
        ]);
        expect(normalized['red-dot']).toBe(42);
        expect(normalized['1x']).toBeUndefined();
        expect(normalized['15x']).toBe(50);
        expect(normalized['legacy-custom']).toBe(77);
    });

    it('explains Hybrid Scope through equivalent 1x and 4x slider states', () => {
        const equivalents = getHybridScopeEquivalentStates();

        expect(equivalents.map((state) => state.sliderKey)).toEqual(['1x', '4x']);
        expect(equivalents.map((state) => state.legacyScopeId)).toEqual(['red-dot', '4x']);
        expect(buildHybridScopeHintText()).toContain('Red Dot Sight (1x)');
        expect(buildHybridScopeHintText()).toContain('4x ACOG (4x)');
    });
});

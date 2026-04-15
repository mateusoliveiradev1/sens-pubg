import { describe, expect, it } from 'vitest';
import { CURRENT_PUBG_PATCH_VERSION } from './patch';
import {
    getOptic,
    getOpticCatalog,
    getOpticState,
    listLegacyScopes,
    resolveOpticCatalogVersion,
} from './optic-catalog';

describe('optic catalog', () => {
    it('includes hybrid-scope and 15x state in patch 41.1', () => {
        const catalog = getOpticCatalog(CURRENT_PUBG_PATCH_VERSION);
        const opticIds = catalog.optics.map((optic) => optic.id);

        expect(opticIds).toContain('hybrid-scope');
        expect(opticIds).toContain('15x');

        const hybrid = getOptic(CURRENT_PUBG_PATCH_VERSION, 'hybrid-scope');
        expect(hybrid?.defaultStateId).toBe('1x');
        expect(hybrid?.states.map((state) => state.id)).toEqual(['1x', '4x']);

        const scope15x = getOpticState(CURRENT_PUBG_PATCH_VERSION, '15x');
        expect(scope15x?.id).toBe('15x');
        expect(scope15x?.magnification).toBe(15);
    });

    it('keeps canted-sight in 36.1 but removes it by 41.1', () => {
        const patch361Ids = getOpticCatalog('36.1').optics.map((optic) => optic.id);
        const patch411Ids = getOpticCatalog('41.1').optics.map((optic) => optic.id);

        expect(patch361Ids).toContain('canted-sight');
        expect(patch361Ids).not.toContain('hybrid-scope');
        expect(patch411Ids).not.toContain('canted-sight');
    });

    it('resolves unknown patch versions to the nearest supported snapshot', () => {
        expect(resolveOpticCatalogVersion('36.9')).toBe('36.1');
        expect(resolveOpticCatalogVersion('40.2')).toBe('37.1');
        expect(resolveOpticCatalogVersion('41.2')).toBe('41.1');
    });

    it('preserves the legacy scope list used by the current UI', () => {
        const legacyScopes = listLegacyScopes(CURRENT_PUBG_PATCH_VERSION).map((scope) => scope.id);

        expect(legacyScopes).toContain('hip');
        expect(legacyScopes).toContain('15x');
        expect(legacyScopes).not.toContain('hybrid-scope');
        expect(legacyScopes).not.toContain('canted-sight');
    });
});

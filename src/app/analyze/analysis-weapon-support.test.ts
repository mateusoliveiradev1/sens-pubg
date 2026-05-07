import { describe, expect, it } from 'vitest';

import {
    resolvePersistedAnalysisWeaponId,
    resolvePreferredAnalysisWeaponId,
    summarizeAnalysisWeaponSupport,
} from './analysis-weapon-support';

describe('analysis weapon support', () => {
    const dbWeapons = [
        { id: 'db-1', name: 'QBZ', category: 'AR' },
        { id: 'db-2', name: 'Mini14', category: 'DMR' },
        { id: 'db-3', name: 'Beryl M762', category: 'AR' },
    ] as const;

    it('separates supported analysis weapons from unsupported database-only entries', () => {
        const summary = summarizeAnalysisWeaponSupport(dbWeapons);

        expect(summary.supported.map((entry) => ({
            dbId: entry.dbWeapon.id,
            technicalId: entry.technicalWeapon.id,
        }))).toEqual([
            { dbId: 'db-2', technicalId: 'mini14' },
            { dbId: 'db-3', technicalId: 'beryl-m762' },
        ]);
        expect(summary.unsupported.map((entry) => entry.dbWeapon.name)).toEqual(['QBZ']);
        expect(summary.unsupported[0]?.supportStatus.label).toBe('removida');
    });

    it('prefers Beryl as the default supported weapon when available', () => {
        const summary = summarizeAnalysisWeaponSupport(dbWeapons);

        expect(resolvePreferredAnalysisWeaponId(summary.supported)).toBe('db-3');
    });

    it('returns the technical weapon id that should be persisted for history and community flows', () => {
        const summary = summarizeAnalysisWeaponSupport(dbWeapons);

        expect(resolvePersistedAnalysisWeaponId(summary.supported, 'db-3')).toBe('beryl-m762');
        expect(resolvePersistedAnalysisWeaponId(summary.supported, 'db-2')).toBe('mini14');
        expect(resolvePersistedAnalysisWeaponId(summary.supported, 'db-1')).toBeUndefined();
    });

    it('keeps visual support status separate from technical analysis selection', () => {
        const summary = summarizeAnalysisWeaponSupport([
            { id: 'db-visual', name: 'K2', category: 'AR' },
            { id: 'db-supported', name: 'M416', category: 'AR' },
        ]);

        expect(summary.supported[0]?.supportStatus.label).toBe('suporte completo');
        expect(summary.unsupported[0]).toMatchObject({
            dbWeapon: { name: 'K2' },
            supportStatus: { label: 'suporte visual' },
        });
    });
});

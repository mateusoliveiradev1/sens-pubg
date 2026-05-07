import { describe, expect, it } from 'vitest';

import { resolveWeaponSupportStatus } from './weapon-support-status';

describe('weapon support status', () => {
    it('reports full support only when visual and technical analysis support both exist', () => {
        expect(resolveWeaponSupportStatus('Beryl M762')).toMatchObject({
            kind: 'full',
            label: 'suporte completo',
            technicalWeaponId: 'beryl-m762',
        });
    });

    it('reports visual support for authored seed weapons without technical analysis profiles', () => {
        expect(resolveWeaponSupportStatus('K2')).toMatchObject({
            kind: 'visual',
            label: 'suporte visual',
        });
        expect(resolveWeaponSupportStatus('Mk14')).toMatchObject({
            kind: 'visual',
            label: 'suporte visual',
        });
    });

    it('keeps explicit lifecycle statuses visible when the patch catalog marks them', () => {
        expect(resolveWeaponSupportStatus('QBZ')).toMatchObject({
            kind: 'removed',
            label: 'removida',
        });
        expect(resolveWeaponSupportStatus('QBU')).toMatchObject({
            kind: 'deprecated',
            label: 'deprecated',
        });
    });

    it('can downgrade a technically known weapon when calibration caveats are active', () => {
        expect(resolveWeaponSupportStatus({
            weaponName: 'M416',
            calibrationLimited: true,
        })).toMatchObject({
            kind: 'technical_limited',
            label: 'suporte tecnico limitado',
            technicalWeaponId: 'm416',
        });
    });
});

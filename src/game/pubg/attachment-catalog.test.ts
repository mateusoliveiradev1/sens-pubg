import { describe, expect, it } from 'vitest';
import {
    getAttachment,
    getAttachmentCatalog,
    listAttachmentsBySlot,
    resolveAttachmentCatalogVersion,
} from './attachment-catalog';

describe('attachment catalog', () => {
    it('tracks the 41.1 grip ecosystem with tilted grip and angled foregrip removal', () => {
        const gripIds = listAttachmentsBySlot('41.1', 'grip').map((attachment) => attachment.id);

        expect(gripIds).toContain('tilted-grip');
        expect(gripIds).toContain('angled-foregrip');

        const tiltedGrip = getAttachment('41.1', 'tilted-grip');
        expect(tiltedGrip?.availability.worldSpawn).toBe(true);
        expect(tiltedGrip?.effects.verticalRecoilControlPct).toBe(12);
        expect(tiltedGrip?.effects.horizontalRecoilControlPct).toBe(6);
        expect(tiltedGrip?.effects.cameraShakeControlPct).toBe(25);

        const angledForegrip = getAttachment('41.1', 'angled-foregrip');
        expect(angledForegrip?.availability.worldSpawn).toBe(false);

        const halfGrip = getAttachment('41.1', 'half-grip');
        expect(halfGrip?.effects.horizontalRecoilControlPct).toBe(16);
    });

    it('keeps angled foregrip world-spawned before 41.1', () => {
        const angledForegrip = getAttachment('36.1', 'angled-foregrip');

        expect(angledForegrip?.availability.worldSpawn).toBe(true);
        expect(angledForegrip?.effects.horizontalRecoilControlPct).toBe(25);
    });

    it('tracks heavy stock from 19.2 with slot, availability, and utility penalties', () => {
        const heavyStock = getAttachment('19.2', 'heavy-stock');

        expect(heavyStock?.slot).toBe('stock');
        expect(heavyStock?.availability.worldSpawn).toBe(true);
        expect(heavyStock?.effects.verticalRecoilControlPct).toBe(5);
        expect(heavyStock?.effects.horizontalRecoilControlPct).toBe(5);
        expect(heavyStock?.effects.recoilRecoveryPct).toBe(5);
        expect(heavyStock?.effects.adsSpeedPct).toBe(-10);
        expect(heavyStock?.effects.hipFireAccuracyPct).toBe(-10);
    });

    it('tracks muzzle brake rollout and later balance passes', () => {
        const muzzleBrake311 = getAttachment('31.1', 'muzzle-brake');
        const muzzleBrake321 = getAttachment('32.1', 'muzzle-brake');
        const muzzleBrake361 = getAttachment('36.1', 'muzzle-brake');

        expect(muzzleBrake311?.effects.verticalRecoilControlPct).toBe(10);
        expect(muzzleBrake311?.effects.horizontalRecoilControlPct).toBe(10);
        expect(muzzleBrake311?.effects.cameraShakeControlPct).toBe(50);

        expect(muzzleBrake321?.effects.verticalRecoilControlPct).toBe(8);
        expect(muzzleBrake321?.effects.horizontalRecoilControlPct).toBe(8);
        expect(muzzleBrake321?.effects.cameraShakeControlPct).toBe(35);

        expect(muzzleBrake361?.effects.verticalRecoilControlPct).toBe(10);
        expect(muzzleBrake361?.effects.horizontalRecoilControlPct).toBe(8);
        expect(muzzleBrake361?.effects.cameraShakeControlPct).toBe(35);
    });

    it('resolves unknown patch versions to the nearest supported snapshot', () => {
        expect(resolveAttachmentCatalogVersion('20.9')).toBe('20.1');
        expect(resolveAttachmentCatalogVersion('36.9')).toBe('36.1');
        expect(resolveAttachmentCatalogVersion('40.2')).toBe('36.1');
        expect(resolveAttachmentCatalogVersion('41.2')).toBe('41.1');
    });

    it('returns slot-filtered snapshots for the resolved patch version', () => {
        const catalog = getAttachmentCatalog('40.2');
        const slots = new Set(catalog.attachments.map((attachment) => attachment.slot));
        const muzzleIds = listAttachmentsBySlot('40.2', 'muzzle').map((attachment) => attachment.id);

        expect(catalog.patchVersion).toBe('36.1');
        expect(slots).toEqual(new Set(['muzzle', 'grip', 'stock']));
        expect(muzzleIds).toContain('compensator');
        expect(muzzleIds).toContain('muzzle-brake');
    });
});

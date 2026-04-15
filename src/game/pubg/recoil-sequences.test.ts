import { describe, expect, it } from 'vitest';
import { CURRENT_PUBG_PATCH_VERSION } from './patch';
import {
    getExpectedRecoilAtShot,
    getExpectedRecoilSequence,
} from './recoil-sequences';
import { getWeapon } from './weapon-data';

describe('recoil sequences', () => {
    it('returns a shot-indexed expected recoil profile for a weapon and patch', () => {
        const weapon = getWeapon('m416');
        expect(weapon).toBeDefined();

        const sequence = getExpectedRecoilSequence({
            weaponId: 'm416',
            patchVersion: CURRENT_PUBG_PATCH_VERSION,
            shotCount: 5,
        });

        expect(sequence.weaponId).toBe('m416');
        expect(sequence.patchVersion).toBe(CURRENT_PUBG_PATCH_VERSION);
        expect(sequence.shots).toHaveLength(5);
        expect(sequence.shots.map((shot) => shot.shotIndex)).toEqual([0, 1, 2, 3, 4]);
        expect(sequence.shots.map((shot) => shot.timestampMs)).toEqual([
            0,
            weapon!.msPerShot,
            weapon!.msPerShot * 2,
            weapon!.msPerShot * 3,
            weapon!.msPerShot * 4,
        ]);
        expect(sequence.shots.map((shot) => shot.recoil)).toEqual(
            weapon!.recoilPattern.slice(0, 5)
        );
        expect(sequence.shots[4]?.cumulative).toEqual({
            yaw: 0.04,
            pitch: 2.17,
        });
        expect(getExpectedRecoilAtShot(sequence, 3)?.recoil).toEqual(
            weapon!.recoilPattern[3]
        );
    });
});

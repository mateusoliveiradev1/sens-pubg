/**
 * Tests: PUBG Game Data
 * Valida weapon database e scope calculations.
 */

import { describe, it, expect } from 'vitest';
import {
    getWeapon,
    WEAPON_LIST,
    SCOPE_LIST,
    calculateCmPer360,
    sensFromCmPer360,
    calculateEffectiveSensitivity,
    getJitterThreshold,
} from '@/game/pubg';

describe('Weapon Database', () => {
    it('should have at least 14 weapons', () => {
        expect(WEAPON_LIST.length).toBeGreaterThanOrEqual(14);
    });

    it('should find M416 by id', () => {
        const m416 = getWeapon('m416');
        expect(m416).toBeDefined();
        expect(m416!.name).toBe('M416');
        expect(m416!.category).toBe('ar');
    });

    it('should return undefined for unknown weapon', () => {
        expect(getWeapon('potato_gun')).toBeUndefined();
    });

    it('every weapon should have a non-empty recoil pattern', () => {
        for (const weapon of WEAPON_LIST) {
            expect(weapon.recoilPattern.length).toBeGreaterThan(0);
        }
    });

    it('every weapon should have valid fire rate', () => {
        for (const weapon of WEAPON_LIST) {
            expect(weapon.fireRateRPM).toBeGreaterThan(0);
            expect(weapon.fireRateRPM).toBeLessThan(2000); // reasonable RPM
        }
    });
});

describe('Scope Data', () => {
    it('should have at least 7 scopes', () => {
        expect(SCOPE_LIST.length).toBeGreaterThanOrEqual(7);
    });

    it('hip fire should have 1x magnification', () => {
        const hip = SCOPE_LIST.find(s => s.id === 'hip');
        expect(hip).toBeDefined();
        expect(hip!.magnification).toBe(1);
    });
});

describe('Sensitivity Calculations', () => {
    it('should calculate cm/360° correctly', () => {
        // At 800 DPI, 50 sens → known value
        const cm = calculateCmPer360(800, 50);
        expect(cm).toBeGreaterThan(0);
        expect(cm).toBeLessThan(200); // reasonable range
    });

    it('should be inverse: higher sens = lower cm/360°', () => {
        const lowSens = calculateCmPer360(800, 30);
        const highSens = calculateCmPer360(800, 70);
        expect(lowSens).toBeGreaterThan(highSens);
    });

    it('should round-trip cm/360° → sens → cm/360°', () => {
        const originalCm = 35;
        const sens = sensFromCmPer360(800, originalCm);
        const reconstructedCm = calculateCmPer360(800, sens);
        expect(reconstructedCm).toBeCloseTo(originalCm, 0);
    });
});

describe('Jitter Thresholds', () => {
    it('AR threshold should be >= SMG (AR recoil is stronger)', () => {
        const arThreshold = getJitterThreshold('ar');
        const smgThreshold = getJitterThreshold('smg');
        expect(arThreshold).toBeGreaterThanOrEqual(smgThreshold);
    });
});

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
    internalFromCmPer360,
    getJitterThreshold,
    sliderToInternal,
} from '.';

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
        const hip = SCOPE_LIST.find((s: { id: string }) => s.id === 'hip');
        expect(hip).toBeDefined();
        expect(hip!.magnification).toBe(1);
    });
});

describe('Sensitivity Calculations', () => {
    it('should calculate cm/360° correctly', () => {
        // At 800 DPI, 50 sens (internal 1.0) → known ground truth ~22.86
        const cm = calculateCmPer360(800, sliderToInternal(50));
        expect(cm).toBeCloseTo(22.86, 1);
    });

    it('should calculate 1x scope (Red Dot) correctly', () => {
        // 1x multiplier is 0.777
        const internal = sliderToInternal(50) * 0.777;
        const cm = calculateCmPer360(800, internal);
        expect(cm).toBeCloseTo(29.4, 1);
    });

    it('should be inverse: higher sens = lower cm/360°', () => {
        const lowSens = calculateCmPer360(800, sliderToInternal(30));
        const highSens = calculateCmPer360(800, sliderToInternal(70));
        expect(lowSens).toBeGreaterThan(highSens);
    });

    it('should round-trip cm/360° → internal multiplier → cm/360°', () => {
        const originalCm = 35;
        const internal = internalFromCmPer360(800, originalCm);
        const reconstructedCm = calculateCmPer360(800, internal);
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

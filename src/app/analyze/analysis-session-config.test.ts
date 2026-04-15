import { describe, expect, it } from 'vitest';

import type {
    WeaponProfileCanonical,
    WeaponProfileLegacyMultipliers,
} from '@/db/schema';
import type {
    GripAttachment,
    MuzzleAttachment,
    StockAttachment,
} from '@/types/engine';

import {
    calculateExpectedSprayDurationSeconds,
    resolveSprayProjectionConfig,
    resolveWorkerAttachmentMultipliers,
} from './analysis-session-config';

const buildSelections = (
    muzzle: MuzzleAttachment,
    grip: GripAttachment,
    stock: StockAttachment
) => ({ muzzle, grip, stock });

describe('analysis session config', () => {
    it('combines canonical attachment multipliers for the worker context', () => {
        const canonicalProfile: WeaponProfileCanonical = {
            schemaVersion: 1,
            sourcePatchVersion: '35.2',
            baseStats: {
                verticalRecoil: 1.15,
                horizontalRecoil: 1.1,
                fireRateMs: 86,
            },
            supportedSlots: ['muzzle', 'grip', 'stock'],
            attachmentProfiles: {
                compensator: {
                    slot: 'muzzle',
                    multipliers: {
                        verticalRecoil: 0.9,
                    },
                },
                'half-grip': {
                    slot: 'grip',
                    multipliers: {
                        verticalRecoil: 0.95,
                        horizontalRecoil: 0.85,
                    },
                },
                'heavy-stock': {
                    slot: 'stock',
                    multipliers: {
                        verticalRecoil: 0.92,
                    },
                },
            },
        };

        const multipliers = resolveWorkerAttachmentMultipliers(
            {
                canonicalProfile,
                multipliers: {},
            },
            buildSelections('compensator', 'half', 'heavy')
        );

        expect(multipliers.vertical).toBeCloseTo(0.9 * 0.95 * 0.92);
        expect(multipliers.horizontal).toBeCloseTo(0.85);
    });

    it('falls back to the legacy multiplier shape when canonical data is unavailable', () => {
        const legacyMultipliers: WeaponProfileLegacyMultipliers = {
            muzzle_brake: 0.88,
            heavy_stock: 0.9,
            half_grip: {
                vertical: 0.95,
                horizontal: 0.85,
            },
        };

        const multipliers = resolveWorkerAttachmentMultipliers(
            {
                canonicalProfile: undefined,
                multipliers: legacyMultipliers,
            },
            buildSelections('muzzle_brake', 'half', 'heavy')
        );

        expect(multipliers.vertical).toBeCloseTo(0.88 * 0.95 * 0.9);
        expect(multipliers.horizontal).toBeCloseTo(0.85);
    });

    it('resolves the tilted grip from both canonical and legacy attachment metadata', () => {
        const canonicalProfile: WeaponProfileCanonical = {
            schemaVersion: 1,
            sourcePatchVersion: '41.1',
            baseStats: {
                verticalRecoil: 1.12,
                horizontalRecoil: 1.06,
                fireRateMs: 86,
            },
            supportedSlots: ['muzzle', 'grip', 'stock'],
            attachmentProfiles: {
                'tilted-grip': {
                    slot: 'grip',
                    multipliers: {
                        verticalRecoil: 0.88,
                        horizontalRecoil: 0.94,
                    },
                },
            },
        };

        const canonicalMultipliers = resolveWorkerAttachmentMultipliers(
            {
                canonicalProfile,
                multipliers: {},
            },
            buildSelections('none', 'tilted', 'none')
        );

        const legacyMultipliers = resolveWorkerAttachmentMultipliers(
            {
                canonicalProfile: undefined,
                multipliers: {
                    tilted_grip: {
                        vertical: 0.88,
                        horizontal: 0.94,
                    },
                },
            },
            buildSelections('none', 'tilted', 'none')
        );

        expect(canonicalMultipliers).toEqual({
            vertical: 0.88,
            horizontal: 0.94,
        });
        expect(legacyMultipliers).toEqual({
            vertical: 0.88,
            horizontal: 0.94,
        });
    });

    it('derives the extraction window from the selected weapon profile', () => {
        const durationSeconds = calculateExpectedSprayDurationSeconds({
            msPerShot: 55,
            magazineSize: 25,
            recoilPattern: Array.from({ length: 25 }, () => ({ yaw: 0, pitch: 0 })),
        });

        expect(durationSeconds).toBeCloseTo(1.875);
    });

    it('derives projection config from the real video size and optic state', () => {
        const projection = resolveSprayProjectionConfig({
            widthPx: 2560,
            heightPx: 1440,
            baseHorizontalFovDegrees: 103,
            patchVersion: '41.1',
            opticId: 'hybrid-scope',
            opticStateId: '4x',
        });

        expect(projection).toEqual({
            widthPx: 2560,
            heightPx: 1440,
            horizontalFovDegrees: 25.75,
        });
    });
});

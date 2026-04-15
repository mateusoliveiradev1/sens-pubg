import { describe, expect, it } from 'vitest';
import type { PlayerProfile } from '@/db/schema';
import { isProfileReadyForAnalysis, parseMonitorResolution, resolveAnalysisResolutionY } from './analysis-profile';

function buildProfile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
    return {
        id: 'profile-id',
        userId: 'user-id',
        mouseModel: 'Mouse X',
        mouseSensor: 'PixArt PAW3395',
        mouseDpi: 800,
        mousePollingRate: 1000,
        mouseWeight: 60,
        mouseLod: 1,
        mousepadModel: 'Pad X',
        mousepadWidth: 45,
        mousepadHeight: 40,
        mousepadType: 'control',
        mousepadMaterial: 'cloth',
        gripStyle: 'claw',
        playStyle: 'hybrid',
        monitorResolution: '1920x1080',
        monitorRefreshRate: 240,
        monitorPanel: 'ips',
        generalSens: 35,
        adsSens: 30,
        scopeSens: { '1x': 30, '2x': 30, '3x': 30, '4x': 30, '6x': 30, '8x': 30 },
        fov: 90,
        verticalMultiplier: 1,
        mouseAcceleration: false,
        armLength: 'medium',
        deskSpace: 60,
        bio: null,
        twitter: null,
        twitch: null,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        updatedAt: new Date('2026-04-14T00:00:00.000Z'),
        ...overrides,
    };
}

describe('analysis profile guards', () => {
    it('accepts profiles that provide the required analysis context', () => {
        expect(isProfileReadyForAnalysis(buildProfile())).toBe(true);
    });

    it('rejects profiles with malformed monitor resolution', () => {
        expect(isProfileReadyForAnalysis(buildProfile({ monitorResolution: '1080p' }))).toBe(false);
    });

    it('rejects profiles without a valid DPI', () => {
        expect(isProfileReadyForAnalysis(buildProfile({ mouseDpi: 0 }))).toBe(false);
    });

    it('parses monitor resolution dimensions safely', () => {
        expect(parseMonitorResolution('2560x1440')).toEqual({ width: 2560, height: 1440 });
    });

    it('falls back to 1080p when monitor resolution is malformed', () => {
        expect(resolveAnalysisResolutionY(buildProfile({ monitorResolution: 'broken' }))).toBe(1080);
    });
});

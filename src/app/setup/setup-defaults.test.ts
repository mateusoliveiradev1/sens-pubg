import { describe, expect, it } from 'vitest';
import { buildSetupWizardInitialData } from './setup-defaults';
import type { PlayerProfile, User } from '@/db/schema';

function createLegacyUser(overrides: Partial<User> = {}): User {
    return {
        id: 'user-1',
        name: 'Player',
        email: 'player@example.com',
        emailVerified: null,
        image: null,
        language: 'pt-BR',
        discordId: null,
        role: 'user',
        fov: 92,
        resolution: '1728x1080',
        mouseDpi: 1600,
        sensGeneral: 43,
        sens1x: 38,
        sens3x: 36,
        sens4x: 34,
        createdAt: new Date('2026-05-08T00:00:00.000Z'),
        updatedAt: new Date('2026-05-08T00:00:00.000Z'),
        ...overrides,
    };
}

function createProfile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
    return {
        id: 'profile-1',
        userId: 'user-1',
        mouseModel: 'Razer Viper V3 Pro',
        mouseSensor: 'Focus Pro 30K',
        mouseDpi: 800,
        mousePollingRate: 4000,
        mouseWeight: 54,
        mouseLod: 0.8,
        mousepadModel: 'Zowie G-SR-SE',
        mousepadWidth: 47,
        mousepadHeight: 39,
        mousepadType: 'control',
        mousepadMaterial: 'cloth',
        gripStyle: 'fingertip',
        playStyle: 'wrist',
        monitorResolution: '2560x1440',
        monitorRefreshRate: 240,
        monitorPanel: 'tn',
        generalSens: 39,
        adsSens: 37,
        scopeSens: {
            'red-dot': 36,
            '2x': 35,
            '3x': 34,
            '4x': 33,
            '6x': 32,
            '8x': 31,
            '15x': 30,
        },
        fov: 103,
        verticalMultiplier: 1.12,
        mouseAcceleration: true,
        armLength: 'short',
        deskSpace: 55,
        bio: 'Spray learner',
        twitter: null,
        twitch: 'https://twitch.tv/player',
        createdAt: new Date('2026-05-08T00:00:00.000Z'),
        updatedAt: new Date('2026-05-08T00:00:00.000Z'),
        ...overrides,
    };
}

describe('setup wizard defaults', () => {
    it('turns legacy user setup values into a complete onboarding draft for new users', () => {
        const defaults = buildSetupWizardInitialData({ user: createLegacyUser() });

        expect(defaults).toMatchObject({
            mouse: {
                dpi: 1600,
                pollingRate: 1000,
            },
            mousepad: {
                widthCm: 45,
                heightCm: 40,
                type: 'control',
            },
            gripStyle: 'claw',
            playStyle: 'hybrid',
            monitor: {
                resolution: '1728x1080',
                refreshRate: 144,
            },
            pubgSettings: {
                generalSens: 43,
                adsSens: 38,
                fov: 92,
                verticalMultiplier: 1,
            },
            physical: {
                deskSpaceCm: 60,
            },
        });
        expect(defaults.pubgSettings.scopeSens).toMatchObject({
            'red-dot': 38,
            '3x': 36,
            '4x': 34,
            '15x': 34,
        });
    });

    it('preserves existing player profile fields so the new onboarding does not reset saved setup', () => {
        const defaults = buildSetupWizardInitialData({
            user: createLegacyUser(),
            profile: createProfile(),
        });

        expect(defaults).toMatchObject({
            mouse: {
                model: 'Razer Viper V3 Pro',
                dpi: 800,
                pollingRate: 4000,
            },
            mousepad: {
                model: 'Zowie G-SR-SE',
                widthCm: 47,
                heightCm: 39,
            },
            gripStyle: 'fingertip',
            playStyle: 'wrist',
            monitor: {
                resolution: '2560x1440',
                refreshRate: 240,
                panelType: 'tn',
            },
            pubgSettings: {
                generalSens: 39,
                adsSens: 37,
                fov: 103,
                verticalMultiplier: 1.12,
                mouseAcceleration: true,
            },
            physical: {
                armLength: 'short',
                deskSpaceCm: 55,
            },
        });
        expect(defaults.pubgSettings.scopeSens['15x']).toBe(30);
    });
});

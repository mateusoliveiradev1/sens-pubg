import { describe, expect, it } from 'vitest';
import {
    buildPlayerProfilePersistenceData,
    buildUserSetupPersistenceData,
} from './player-profile-persistence';
import type { PlayerProfileInput } from '@/types/schemas';

function createProfileInput(overrides: Partial<PlayerProfileInput> = {}): PlayerProfileInput {
    return {
        mouse: {
            model: 'Logitech G Pro X Superlight',
            sensor: 'HERO 25K',
            dpi: 800,
            pollingRate: 1000,
            weightGrams: 63,
            liftOffDistance: 1,
        },
        mousepad: {
            model: 'Artisan Hien',
            widthCm: 49,
            heightCm: 42,
            type: 'hybrid',
            material: 'cloth',
        },
        gripStyle: 'claw',
        playStyle: 'hybrid',
        monitor: {
            resolution: '1920x1080',
            refreshRate: 240,
            panelType: 'ips',
        },
        pubgSettings: {
            generalSens: 41,
            adsSens: 38,
            scopeSens: {
                '1x': 37,
                '3x': 39,
                '4x': 36,
                '6x': 35,
            },
            fov: 95,
            verticalMultiplier: 1.08,
            mouseAcceleration: false,
        },
        physical: {
            armLength: 'medium',
            deskSpaceCm: 70,
        },
        identity: {
            bio: '  ',
            twitter: null,
            twitch: 'https://twitch.tv/senspubg',
        },
        ...overrides,
    };
}

describe('player profile persistence mapping', () => {
    it('maps complete onboarding data into the durable player profile contract', () => {
        const data = buildPlayerProfilePersistenceData('user-1', createProfileInput());

        expect(data).toMatchObject({
            userId: 'user-1',
            mouseDpi: 800,
            mousepadModel: 'Artisan Hien',
            mousepadWidth: 49,
            mousepadHeight: 42,
            gripStyle: 'claw',
            playStyle: 'hybrid',
            monitorResolution: '1920x1080',
            generalSens: 41,
            adsSens: 38,
            fov: 95,
            verticalMultiplier: 1.08,
            deskSpace: 70,
            bio: null,
            twitch: 'https://twitch.tv/senspubg',
        });
        expect(data.scopeSens).toMatchObject({
            'red-dot': 37,
            '3x': 39,
            '4x': 36,
            '6x': 35,
            '8x': 50,
            '15x': 50,
        });
    });

    it('keeps legacy user setup columns synchronized for older consumers', () => {
        const data = buildUserSetupPersistenceData(createProfileInput());

        expect(data).toMatchObject({
            fov: 95,
            resolution: '1920x1080',
            mouseDpi: 800,
            sensGeneral: 41,
            sens1x: 37,
            sens3x: 39,
            sens4x: 36,
        });
    });
});

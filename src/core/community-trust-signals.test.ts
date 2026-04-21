import { describe, expect, it } from 'vitest';

import {
    buildCreatorTrustSignals,
    buildPostTrustSignals,
    buildProfileTrustSignals,
    countPublicSetupFields,
} from './community-trust-signals';

const unsupportedAuthorityClaims = /pro player|verified skill|best|melhor|rank|skill/i;

const publicSetup = {
    aimSetup: {
        mouseModel: 'Logitech G Pro X Superlight 2',
        mouseSensor: 'Hero 2',
        mouseDpi: 800,
        mousePollingRate: 2000,
    },
    surfaceGrip: {
        mousepadModel: 'Artisan Zero XSoft',
        mousepadType: 'control',
        gripStyle: 'claw',
        playStyle: 'arm',
    },
    pubgCore: {
        generalSens: 41.5,
        adsSens: 36,
        verticalMultiplier: 1.05,
        fov: 95,
    },
};

describe('community trust signals', () => {
    it('builds factual profile signals for creator status and public setup', () => {
        const signals = buildProfileTrustSignals({
            creatorProgramStatus: 'approved',
            publicSetup,
            copyCount: 4,
            saveCount: 3,
        });

        expect(signals).toEqual([
            {
                key: 'creator-approved',
                label: 'Creator aprovado',
                reason: 'Status publico aprovado no programa de creators.',
                count: null,
            },
            {
                key: 'setup-public',
                label: 'Setup publico',
                reason: '12 campos publicos de setup liberados no perfil.',
                count: 12,
            },
            {
                key: 'copied-preset',
                label: 'Presets copiados',
                reason: '4 presets copiados por leitores publicos.',
                count: 4,
            },
            {
                key: 'saved-drill',
                label: 'Drills salvos',
                reason: '3 drills salvos por leitores publicos.',
                count: 3,
            },
        ]);
        expect(JSON.stringify(signals)).not.toMatch(unsupportedAuthorityClaims);
    });

    it('does not invent profile trust signals when public facts are missing', () => {
        const signals = buildProfileTrustSignals({
            creatorProgramStatus: 'waitlist',
            publicSetup: null,
            copyCount: 0,
            saveCount: 0,
        });

        expect(signals).toEqual([
            {
                key: 'creator-waitlist',
                label: 'Creator em avaliacao',
                reason: 'Status publico em avaliacao no programa de creators.',
                count: null,
            },
        ]);
        expect(JSON.stringify(signals)).not.toContain('Perfil completo');
    });

    it('builds post signals from active patch, copied presets and saved drills only for public published posts', () => {
        const signals = buildPostTrustSignals({
            status: 'published',
            visibility: 'public',
            publishedAt: new Date('2026-04-19T12:00:00.000Z'),
            primaryPatchVersion: '36.1',
            copyCount: 2,
            saveCount: 1,
        });

        expect(signals).toEqual([
            {
                key: 'active-patch',
                label: 'Patch ativo',
                reason: 'Post publico marcado como Patch 36.1.',
                count: null,
            },
            {
                key: 'copied-preset',
                label: 'Presets copiados',
                reason: '2 presets copiados por leitores publicos.',
                count: 2,
            },
            {
                key: 'saved-drill',
                label: 'Drill salvo',
                reason: '1 drill salvo por leitores publicos.',
                count: 1,
            },
        ]);
        expect(JSON.stringify(signals)).not.toMatch(unsupportedAuthorityClaims);

        expect(buildPostTrustSignals({
            status: 'draft',
            visibility: 'public',
            publishedAt: null,
            primaryPatchVersion: '36.1',
            copyCount: 99,
            saveCount: 99,
        })).toEqual([]);
    });

    it('builds creator highlight signals from public activity without unsupported skill labels', () => {
        const signals = buildCreatorTrustSignals({
            creatorProgramStatus: 'approved',
            publicPostCount: 4,
            followerCount: 18,
            copyCount: 11,
        });

        expect(signals).toEqual([
            {
                key: 'creator-approved',
                label: 'Creator aprovado',
                reason: 'Status publico aprovado no programa de creators.',
                count: null,
            },
            {
                key: 'public-activity',
                label: 'Atividade publica',
                reason: '4 posts publicos e 18 seguidores',
                count: 22,
            },
            {
                key: 'copied-preset',
                label: 'Presets copiados',
                reason: '11 presets copiados por leitores publicos.',
                count: 11,
            },
        ]);
        expect(JSON.stringify(signals)).not.toMatch(unsupportedAuthorityClaims);
    });

    it('counts only allowlisted setup values', () => {
        expect(countPublicSetupFields({
            aimSetup: {
                mouseModel: 'Razer Viper V3 Pro',
                mouseSensor: '',
                mouseDpi: 400,
                privateMonitor: undefined,
            },
            surfaceGrip: {
                mousepadModel: null,
                gripStyle: 'claw',
            },
            pubgCore: {
                generalSens: 47,
                adsSens: null,
            },
        })).toBe(4);
    });
});

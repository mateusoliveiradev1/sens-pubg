import { describe, expect, it } from 'vitest';

import {
    buildCommunitySprayMasteryJourney,
    type CommunitySprayMasterySourceAnalysis,
    type CommunitySprayMasterySourceEvent,
} from './community-spray-mastery';

function createAnalysis(
    overrides: Partial<CommunitySprayMasterySourceAnalysis> & {
        readonly id: string;
        readonly weaponId: string;
        readonly patchVersion: string;
        readonly createdAt: Date;
    },
): CommunitySprayMasterySourceAnalysis {
    return {
        id: overrides.id,
        weaponId: overrides.weaponId,
        patchVersion: overrides.patchVersion,
        sprayScore: overrides.sprayScore ?? 0,
        stabilityScore: overrides.stabilityScore ?? 0,
        diagnoses: overrides.diagnoses ?? [],
        fullResult: overrides.fullResult ?? null,
        createdAt: overrides.createdAt,
    };
}

function createEvent(
    overrides: Partial<CommunitySprayMasterySourceEvent> & {
        readonly actorUserId: string;
        readonly eventType: CommunitySprayMasterySourceEvent['eventType'];
    },
): CommunitySprayMasterySourceEvent {
    return {
        actorUserId: overrides.actorUserId,
        beneficiaryUserId: overrides.beneficiaryUserId ?? null,
        eventType: overrides.eventType,
        effectiveXp: overrides.effectiveXp ?? 20,
    };
}

describe('buildCommunitySprayMasteryJourney', () => {
    it('returns a calm zero-state when there is not enough repeated spray evidence yet', () => {
        const journey = buildCommunitySprayMasteryJourney({
            userId: 'user-1',
            analyses: [
                createAnalysis({
                    id: 'analysis-1',
                    weaponId: 'beryl-m762',
                    patchVersion: '36.1',
                    sprayScore: 63,
                    diagnoses: ['horizontal_drift'],
                    createdAt: new Date('2026-04-19T12:00:00.000Z'),
                }),
            ],
            events: [
                createEvent({
                    actorUserId: 'user-1',
                    eventType: 'publish_post',
                }),
            ],
            now: new Date('2026-04-20T12:00:00.000Z'),
        });

        expect(journey).toMatchObject({
            state: 'zero_state',
            stageLabel: 'Sem leitura firme',
            title: 'Repita Beryl M762 antes de trocar o foco',
            nextMilestone: {
                title: 'Abrir um foco explicavel',
            },
            nextAction: {
                eventType: 'streak_participation',
                title: 'Voltar para Beryl M762',
            },
            socialReinforcement: null,
        });
        expect(journey.summary).toContain('Ainda falta repetir o mesmo recorte');
        expect(journey.summary).not.toContain('Nivel');
    });

    it('grounds the main journey in repeated analysis evidence before any social response', () => {
        const journey = buildCommunitySprayMasteryJourney({
            userId: 'user-1',
            analyses: [
                createAnalysis({
                    id: 'analysis-1',
                    weaponId: 'beryl-m762',
                    patchVersion: '36.1',
                    sprayScore: 66,
                    diagnoses: ['horizontal_drift'],
                    fullResult: {
                        coachPlan: {
                            primaryFocus: {
                                area: 'horizontal_control',
                            },
                        },
                    },
                    createdAt: new Date('2026-04-19T12:00:00.000Z'),
                }),
                createAnalysis({
                    id: 'analysis-2',
                    weaponId: 'beryl-m762',
                    patchVersion: '36.1',
                    sprayScore: 70,
                    diagnoses: ['horizontal_drift'],
                    createdAt: new Date('2026-04-18T12:00:00.000Z'),
                }),
                createAnalysis({
                    id: 'analysis-3',
                    weaponId: 'ace32',
                    patchVersion: '36.1',
                    sprayScore: 61,
                    diagnoses: ['overpull'],
                    createdAt: new Date('2026-04-10T12:00:00.000Z'),
                }),
            ],
            now: new Date('2026-04-20T12:00:00.000Z'),
        });

        expect(journey).toMatchObject({
            state: 'active',
            stageLabel: 'Foco repetido',
            title: 'Beryl M762',
            nextAction: {
                eventType: 'streak_participation',
                title: 'Voltar para Beryl M762',
            },
        });
        expect(journey.facts).toEqual([
            {
                label: 'Blocos no foco',
                value: '2',
            },
            {
                label: 'Score recente',
                value: '68/100',
            },
            {
                label: 'Gap dominante',
                value: 'Horizontal Drift',
            },
        ]);
        expect(journey.summary).toContain('como seu foco principal');
        expect(journey.summary).not.toContain('engajamento');
    });

    it('lets social activity reinforce the journey only after strong mastery evidence exists', () => {
        const journey = buildCommunitySprayMasteryJourney({
            userId: 'user-1',
            analyses: [
                createAnalysis({
                    id: 'analysis-1',
                    weaponId: 'beryl-m762',
                    patchVersion: '36.1',
                    sprayScore: 82,
                    diagnoses: ['horizontal_drift'],
                    createdAt: new Date('2026-04-19T12:00:00.000Z'),
                }),
                createAnalysis({
                    id: 'analysis-2',
                    weaponId: 'beryl-m762',
                    patchVersion: '36.1',
                    sprayScore: 84,
                    diagnoses: ['horizontal_drift'],
                    createdAt: new Date('2026-04-18T12:00:00.000Z'),
                }),
                createAnalysis({
                    id: 'analysis-3',
                    weaponId: 'beryl-m762',
                    patchVersion: '36.1',
                    sprayScore: 80,
                    diagnoses: ['horizontal_drift'],
                    createdAt: new Date('2026-04-17T12:00:00.000Z'),
                }),
                createAnalysis({
                    id: 'analysis-4',
                    weaponId: 'beryl-m762',
                    patchVersion: '36.1',
                    sprayScore: 85,
                    diagnoses: ['horizontal_drift'],
                    createdAt: new Date('2026-04-16T12:00:00.000Z'),
                }),
                createAnalysis({
                    id: 'analysis-5',
                    weaponId: 'beryl-m762',
                    patchVersion: '36.1',
                    sprayScore: 83,
                    diagnoses: ['horizontal_drift'],
                    createdAt: new Date('2026-04-15T12:00:00.000Z'),
                }),
                createAnalysis({
                    id: 'analysis-6',
                    weaponId: 'beryl-m762',
                    patchVersion: '36.1',
                    sprayScore: 81,
                    diagnoses: ['horizontal_drift'],
                    createdAt: new Date('2026-04-14T12:00:00.000Z'),
                }),
            ],
            events: [
                createEvent({
                    actorUserId: 'user-2',
                    beneficiaryUserId: 'user-1',
                    eventType: 'receive_unique_copy',
                }),
                createEvent({
                    actorUserId: 'user-3',
                    beneficiaryUserId: 'user-1',
                    eventType: 'receive_unique_save',
                }),
            ],
            now: new Date('2026-04-20T12:00:00.000Z'),
        });

        expect(journey).toMatchObject({
            state: 'active',
            stageLabel: 'Refino ativo',
            nextAction: {
                eventType: 'publish_post',
                title: 'Publicar essa leitura',
            },
            socialReinforcement: {
                title: 'Comunidade respondeu',
            },
        });
        expect(journey.socialReinforcement?.description).toContain('1 copia e 1 save');
        expect(journey.socialReinforcement?.description).toContain('progresso principal continua vindo da proxima analise');
    });
});

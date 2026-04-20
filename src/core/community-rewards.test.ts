import { describe, expect, it } from 'vitest';

import {
    buildCommunityPublicRewardSummaries,
    type CommunityRewardRecordSource,
} from './community-rewards';

function createReward(
    overrides: Partial<CommunityRewardRecordSource> & {
        readonly id: string;
        readonly ownerType: CommunityRewardRecordSource['ownerType'];
        readonly rewardKind: CommunityRewardRecordSource['rewardKind'];
        readonly label: string;
        readonly earnedAt: Date;
    },
): CommunityRewardRecordSource {
    return {
        id: overrides.id,
        ownerType: overrides.ownerType,
        rewardKind: overrides.rewardKind,
        label: overrides.label,
        description: overrides.description ?? null,
        displayState: overrides.displayState ?? 'hidden',
        earnedAt: overrides.earnedAt,
        isPublicSafe: overrides.isPublicSafe ?? false,
        publicPayload: overrides.publicPayload ?? {},
        squadId: overrides.squadId ?? null,
        status: overrides.status ?? 'earned',
        userId: overrides.userId ?? null,
    };
}

describe('community rewards core', () => {
    it('exposes only public-safe visible rewards with factual labels and equipped ordering', () => {
        const rewards = [
            createReward({
                id: 'reward-title',
                ownerType: 'user',
                rewardKind: 'title',
                label: 'Ritmo util',
                displayState: 'equipped',
                isPublicSafe: true,
                earnedAt: new Date('2026-04-22T12:00:00.000Z'),
                userId: 'user-1',
                publicPayload: {
                    shortLabel: 'Ritmo',
                    factualContext: 'Titulo publico liberado por contribuicoes uteis desta temporada.',
                },
            }),
            createReward({
                id: 'reward-badge',
                ownerType: 'user',
                rewardKind: 'badge',
                label: 'Operador consistente',
                description: 'Badge earned',
                displayState: 'visible',
                isPublicSafe: true,
                earnedAt: new Date('2026-04-21T12:00:00.000Z'),
                userId: 'user-1',
                publicPayload: {
                    label: 'Badge de consistencia',
                    iconKey: 'badge-consistency',
                },
            }),
        ] satisfies readonly CommunityRewardRecordSource[];

        const result = buildCommunityPublicRewardSummaries({
            rewards,
            ownerType: 'user',
            userId: 'user-1',
        });

        expect(result).toEqual([
            {
                id: 'reward-title',
                rewardKind: 'title',
                label: 'Ritmo util',
                shortLabel: 'Ritmo',
                description: null,
                factualContext: 'Titulo publico liberado por contribuicoes uteis desta temporada.',
                iconKey: null,
                displayState: 'equipped',
                isEquipped: true,
                earnedAt: new Date('2026-04-22T12:00:00.000Z'),
            },
            {
                id: 'reward-badge',
                rewardKind: 'badge',
                label: 'Badge de consistencia',
                shortLabel: null,
                description: null,
                factualContext: 'Badge comunitario baseado em contribuicoes elegiveis registradas pelo sistema.',
                iconKey: 'badge-consistency',
                displayState: 'visible',
                isEquipped: false,
                earnedAt: new Date('2026-04-21T12:00:00.000Z'),
            },
        ]);
    });

    it('never falls back to private reward copy when public payload omits the description', () => {
        const [result] = buildCommunityPublicRewardSummaries({
            ownerType: 'user',
            userId: 'user-1',
            rewards: [
                createReward({
                    id: 'reward-private-copy',
                    ownerType: 'user',
                    rewardKind: 'badge',
                    label: 'Operador oculto',
                    description: 'Descricao interna que nao deve vazar',
                    displayState: 'visible',
                    isPublicSafe: true,
                    earnedAt: new Date('2026-04-23T12:00:00.000Z'),
                    userId: 'user-1',
                    publicPayload: {
                        label: 'Badge publico',
                        factualContext: 'Badge publico e factual.',
                    },
                }),
            ],
        });

        expect(result).toEqual({
            id: 'reward-private-copy',
            rewardKind: 'badge',
            label: 'Badge publico',
            shortLabel: null,
            description: null,
            factualContext: 'Badge publico e factual.',
            iconKey: null,
            displayState: 'visible',
            isEquipped: false,
            earnedAt: new Date('2026-04-23T12:00:00.000Z'),
        });
    });

    it('keeps hidden, revoked, or non-public-safe rewards out of public summaries', () => {
        const result = buildCommunityPublicRewardSummaries({
            ownerType: 'squad',
            squadId: 'squad-1',
            rewards: [
                createReward({
                    id: 'reward-hidden',
                    ownerType: 'squad',
                    rewardKind: 'squad_mark',
                    label: 'Squad invisivel',
                    displayState: 'hidden',
                    isPublicSafe: true,
                    earnedAt: new Date('2026-04-22T12:00:00.000Z'),
                    squadId: 'squad-1',
                }),
                createReward({
                    id: 'reward-revoked',
                    ownerType: 'squad',
                    rewardKind: 'squad_mark',
                    label: 'Squad revogado',
                    displayState: 'visible',
                    isPublicSafe: true,
                    status: 'revoked',
                    earnedAt: new Date('2026-04-22T12:30:00.000Z'),
                    squadId: 'squad-1',
                }),
                createReward({
                    id: 'reward-private',
                    ownerType: 'squad',
                    rewardKind: 'squad_mark',
                    label: 'Squad privado',
                    displayState: 'visible',
                    isPublicSafe: false,
                    earnedAt: new Date('2026-04-22T13:00:00.000Z'),
                    squadId: 'squad-1',
                }),
            ],
        });

        expect(result).toEqual([]);
    });
});

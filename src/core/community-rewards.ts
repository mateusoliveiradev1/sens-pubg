import type { CommunityRewardRecordRow } from '@/db/schema';
import { isCommunityRewardKindPublicSafe } from './community-progression-policy';

export type CommunityRewardRecordSource = Pick<
    CommunityRewardRecordRow,
    | 'description'
    | 'displayState'
    | 'earnedAt'
    | 'id'
    | 'isPublicSafe'
    | 'label'
    | 'ownerType'
    | 'publicPayload'
    | 'rewardKind'
    | 'squadId'
    | 'status'
    | 'userId'
>;

export interface BuildCommunityPublicRewardSummariesInput {
    readonly rewards: readonly CommunityRewardRecordSource[];
    readonly ownerType: CommunityRewardRecordSource['ownerType'];
    readonly userId?: string | null;
    readonly squadId?: string | null;
}

export interface CommunityPublicRewardSummary {
    readonly id: string;
    readonly rewardKind: CommunityRewardRecordSource['rewardKind'];
    readonly label: string;
    readonly shortLabel: string | null;
    readonly description: string | null;
    readonly factualContext: string;
    readonly iconKey: string | null;
    readonly displayState: CommunityRewardRecordSource['displayState'];
    readonly isEquipped: boolean;
    readonly earnedAt: Date;
}

export function buildCommunityPublicRewardSummaries(
    input: BuildCommunityPublicRewardSummariesInput,
): readonly CommunityPublicRewardSummary[] {
    return input.rewards
        .filter((reward) => reward.ownerType === input.ownerType)
        .filter((reward) =>
            input.ownerType === 'user'
                ? reward.userId === input.userId
                : reward.squadId === input.squadId,
        )
        .filter((reward) => reward.status === 'earned')
        .filter((reward) => reward.isPublicSafe)
        .filter((reward) => isCommunityRewardKindPublicSafe(reward.rewardKind))
        .filter((reward) => reward.displayState !== 'hidden')
        .sort(comparePublicRewards)
        .map((reward) => ({
            id: reward.id,
            rewardKind: reward.rewardKind,
            label: normalizePublicLabel(
                reward.publicPayload.label,
                reward.label,
            ),
            shortLabel: normalizeOptionalText(reward.publicPayload.shortLabel),
            description: normalizeOptionalText(reward.publicPayload.description),
            factualContext: normalizePublicLabel(
                reward.publicPayload.factualContext,
                getDefaultRewardFactualContext(reward.rewardKind),
            ),
            iconKey: normalizeOptionalText(reward.publicPayload.iconKey),
            displayState: reward.displayState,
            isEquipped: reward.displayState === 'equipped',
            earnedAt: cloneDate(reward.earnedAt),
        }));
}

function comparePublicRewards(
    left: CommunityRewardRecordSource,
    right: CommunityRewardRecordSource,
): number {
    if (left.displayState === 'equipped' && right.displayState !== 'equipped') {
        return -1;
    }

    if (left.displayState !== 'equipped' && right.displayState === 'equipped') {
        return 1;
    }

    const earnedAtDelta = right.earnedAt.getTime() - left.earnedAt.getTime();

    if (earnedAtDelta !== 0) {
        return earnedAtDelta;
    }

    return left.label.localeCompare(right.label, 'pt-BR');
}

function getDefaultRewardFactualContext(
    rewardKind: CommunityRewardRecordSource['rewardKind'],
): string {
    switch (rewardKind) {
        case 'badge':
            return 'Badge comunitario baseado em contribuicoes elegiveis registradas pelo sistema.';

        case 'title':
            return 'Titulo publico opcional com significado factual dentro da comunidade.';

        case 'season_mark':
            return 'Marco de temporada concedido por participacao elegivel e nao por skill medida.';

        case 'squad_mark':
            return 'Marca factual de squad concedida por meta coletiva concluida no periodo.';
    }
}

function normalizePublicLabel(
    ...values: readonly (string | null | undefined)[]
): string {
    for (const value of values) {
        const normalizedValue = value?.trim();

        if (normalizedValue) {
            return normalizedValue;
        }
    }

    return 'Reconhecimento comunitario';
}

function normalizeOptionalText(
    ...values: readonly (string | null | undefined)[]
): string | null {
    for (const value of values) {
        const normalizedValue = value?.trim();

        if (normalizedValue) {
            return normalizedValue;
        }
    }

    return null;
}

function cloneDate(date: Date): Date {
    return new Date(date.getTime());
}

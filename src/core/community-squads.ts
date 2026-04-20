import type {
    CommunitySquadRow,
    CommunitySquadGoalState,
    CommunitySquadInviteRow,
    CommunitySquadMembershipRow,
} from '@/db/schema';
import type { CommunityProgressionEventType } from '@/types/community';
import {
    getCommunityProgressionRule,
    type CommunityProgressionHistoryEvent,
    type CommunityProgressionNextAction,
} from './community-progression';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

export const DEFAULT_COMMUNITY_SQUAD_MEMBER_LIMIT = 4;
export const MAX_COMMUNITY_SQUAD_MEMBER_LIMIT = 8;
export const DEFAULT_COMMUNITY_SQUAD_INVITE_WINDOW_DAYS = 7;
export const DEFAULT_COMMUNITY_SQUAD_GOAL_TARGET_COUNT = 3;
export const DEFAULT_COMMUNITY_SQUAD_GOAL_EVENT_TYPES = [
    'publish_post',
    'comment_with_context',
] as const satisfies readonly CommunityProgressionEventType[];

export type CommunitySquadInviteSource = Pick<
    CommunitySquadInviteRow,
    | 'acceptedAt'
    | 'acceptedByUserId'
    | 'createdAt'
    | 'createdByUserId'
    | 'expiresAt'
    | 'id'
    | 'inviteCode'
    | 'invitedUserId'
    | 'revokedAt'
    | 'squadId'
    | 'status'
    | 'updatedAt'
>;

export type CommunitySquadMembershipSource = Pick<
    CommunitySquadMembershipRow,
    | 'isPubliclyVisible'
    | 'joinedAt'
    | 'leftAt'
    | 'role'
    | 'squadId'
    | 'status'
    | 'updatedAt'
    | 'userId'
>;

export interface BuildCommunitySquadGoalProgressInput {
    readonly squadId: string;
    readonly memberUserIds: readonly string[];
    readonly activeGoal: CommunitySquadGoalState | null;
    readonly events: readonly CommunityProgressionHistoryEvent[];
    readonly now?: Date;
}

export interface CommunitySquadGoalProgressSnapshot {
    readonly goalKey: string | null;
    readonly title: string;
    readonly description: string | null;
    readonly targetCount: number;
    readonly currentCount: number;
    readonly remainingCount: number;
    readonly completionRatio: number;
    readonly state: 'zero_state' | 'in_progress' | 'complete';
    readonly contributorCount: number;
    readonly contributingUserIds: readonly string[];
    readonly eligibleEventTypes: readonly CommunityProgressionEventType[];
    readonly nextAction: CommunityProgressionNextAction | null;
    readonly headline: string;
    readonly summary: string;
    readonly windowStartedAt: Date | null;
    readonly windowEndsAt: Date | null;
    readonly persistedGoal: CommunitySquadGoalState | null;
}

export type CommunityPublicSquadIdentitySource = Pick<
    CommunitySquadRow,
    'description' | 'id' | 'name' | 'slug' | 'visibility'
>;

export interface CommunityPublicSquadIdentity {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly description: string | null;
}

export interface ResolveCommunitySquadInviteValidityInput {
    readonly invite: CommunitySquadInviteSource | null;
    readonly viewerUserId?: string | null;
    readonly now?: Date;
}

export interface CommunitySquadInviteValidity {
    readonly isUsable: boolean;
    readonly reason:
        | 'accepted'
        | 'expired'
        | 'invalid'
        | 'revoked'
        | 'viewer_mismatch';
    readonly error: string;
}

export function normalizeCommunitySquadName(value: string): string {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
        throw new Error('community squad name must be a non-empty string.');
    }

    return normalizedValue;
}

export function normalizeCommunitySquadSlugSegment(value: string): string {
    const normalizedValue = value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-')
        .slice(0, 48)
        .replace(/-+$/g, '');

    return normalizedValue.length > 0 ? normalizedValue : 'squad';
}

export function buildCommunitySquadSlug(input: {
    readonly name: string;
    readonly ownerUserId: string;
}): string {
    const name = normalizeCommunitySquadName(input.name);
    const ownerIdSuffix = input.ownerUserId.replace(/-/g, '').slice(0, 8) || 'owner';

    return `${normalizeCommunitySquadSlugSegment(name)}-${ownerIdSuffix}`;
}

export function normalizeCommunitySquadMemberLimit(value?: number | null): number {
    const normalizedValue = Number.isFinite(value)
        ? Math.trunc(value as number)
        : DEFAULT_COMMUNITY_SQUAD_MEMBER_LIMIT;

    return Math.min(
        Math.max(normalizedValue, 2),
        MAX_COMMUNITY_SQUAD_MEMBER_LIMIT,
    );
}

export function resolveDefaultCommunitySquadGoal(input: {
    readonly now?: Date;
    readonly targetCount?: number;
    readonly eligibleEventTypes?: readonly CommunityProgressionEventType[];
} = {}): CommunitySquadGoalState {
    const now = cloneDate(input.now ?? new Date());
    const windowStartedAt = startOfUtcWeek(now);
    const windowEndsAt = endOfUtcWeek(windowStartedAt);
    const eligibleEventTypes = normalizeEligibleEventTypes(
        input.eligibleEventTypes ?? DEFAULT_COMMUNITY_SQUAD_GOAL_EVENT_TYPES,
    );

    return {
        goalKey: `weekly-squad-rhythm:${windowStartedAt.toISOString()}`,
        title: 'Ritmo semanal do squad',
        description: 'Publiquem analises uteis ou comentarios com contexto para manter o squad ativo sem depender de spam.',
        targetCount: normalizePositiveInteger(
            input.targetCount ?? DEFAULT_COMMUNITY_SQUAD_GOAL_TARGET_COUNT,
            DEFAULT_COMMUNITY_SQUAD_GOAL_TARGET_COUNT,
        ),
        currentCount: 0,
        eligibleEventTypes,
        windowStartedAt: windowStartedAt.toISOString(),
        windowEndsAt: windowEndsAt.toISOString(),
    };
}

export function buildCommunitySquadGoalProgressSnapshot(
    input: BuildCommunitySquadGoalProgressInput,
): CommunitySquadGoalProgressSnapshot {
    const memberUserIds = new Set(
        input.memberUserIds
            .map((userId) => userId.trim())
            .filter(Boolean),
    );

    if (!input.activeGoal) {
        return {
            goalKey: null,
            title: 'Objetivo do squad indisponivel',
            description: null,
            targetCount: 0,
            currentCount: 0,
            remainingCount: 0,
            completionRatio: 0,
            state: 'zero_state',
            contributorCount: 0,
            contributingUserIds: [],
            eligibleEventTypes: [],
            nextAction: null,
            headline: 'Definam um ritual leve para o squad',
            summary: 'Ativem um objetivo semanal simples para transformar pertencimento em rotina, sem abrir espaco para ruido.',
            windowStartedAt: null,
            windowEndsAt: null,
            persistedGoal: null,
        };
    }

    const eligibleEventTypes = normalizeEligibleEventTypes(
        input.activeGoal.eligibleEventTypes,
    );
    const targetCount = normalizePositiveInteger(
        input.activeGoal.targetCount,
        DEFAULT_COMMUNITY_SQUAD_GOAL_TARGET_COUNT,
    );
    const windowStartedAt = parseOptionalDate(input.activeGoal.windowStartedAt);
    const windowEndsAt = parseOptionalDate(input.activeGoal.windowEndsAt);
    const contributions = dedupeCommunitySquadGoalEvents(
        input.events.filter((event) => {
            if (event.squadId !== input.squadId) {
                return false;
            }

            if (!memberUserIds.has(event.actorUserId)) {
                return false;
            }

            if (!eligibleEventTypes.includes(event.eventType)) {
                return false;
            }

            if (event.effectiveXp <= 0) {
                return false;
            }

            if (windowStartedAt && event.occurredAt.getTime() < windowStartedAt.getTime()) {
                return false;
            }

            if (windowEndsAt && event.occurredAt.getTime() > windowEndsAt.getTime()) {
                return false;
            }

            return true;
        }),
    );
    const currentCount = Math.min(contributions.length, targetCount);
    const remainingCount = Math.max(targetCount - currentCount, 0);
    const completionRatio = targetCount === 0 ? 1 : clampRatio(currentCount / targetCount);
    const contributingUserIds = [...new Set(contributions.map((event) => event.actorUserId))];
    const nextAction = currentCount >= targetCount
        ? null
        : createCommunitySquadGoalNextAction(eligibleEventTypes);

    let state: CommunitySquadGoalProgressSnapshot['state'] = 'in_progress';
    let headline = `${currentCount}/${targetCount} acoes do squad`;
    let summary = `${contributingUserIds.length} membro(s) ja contribuiram para este objetivo compartilhado.`;

    if (currentCount === 0) {
        state = 'zero_state';
        headline = 'Objetivo do squad pronto para comecar';
        summary = 'Nenhuma contribuicao elegivel ainda. Um post publico ou comentario com contexto ja abre o placar compartilhado.';
    } else if (currentCount >= targetCount) {
        state = 'complete';
        headline = 'Objetivo do squad concluido';
        summary = `${contributingUserIds.length} membro(s) fecharam a meta desta janela com contribuicoes elegiveis.`;
    }

    return {
        goalKey: input.activeGoal.goalKey,
        title: input.activeGoal.title,
        description: input.activeGoal.description ?? null,
        targetCount,
        currentCount,
        remainingCount,
        completionRatio,
        state,
        contributorCount: contributingUserIds.length,
        contributingUserIds,
        eligibleEventTypes,
        nextAction,
        headline,
        summary,
        windowStartedAt,
        windowEndsAt,
        persistedGoal: {
            ...input.activeGoal,
            targetCount,
            currentCount,
            eligibleEventTypes,
            ...(windowStartedAt ? { windowStartedAt: windowStartedAt.toISOString() } : {}),
            ...(windowEndsAt ? { windowEndsAt: windowEndsAt.toISOString() } : {}),
        },
    };
}

export function buildCommunityPublicSquadIdentity(
    squad: CommunityPublicSquadIdentitySource | null,
): CommunityPublicSquadIdentity | null {
    if (!squad || squad.visibility !== 'public') {
        return null;
    }

    return {
        id: squad.id,
        name: squad.name,
        slug: squad.slug,
        description: normalizePublicOptionalText(squad.description),
    };
}

export function countActiveCommunitySquadMembers(
    memberships: readonly CommunitySquadMembershipSource[],
): number {
    return memberships.filter((membership) => membership.status === 'active').length;
}

export function resolveCommunitySquadInviteValidity(
    input: ResolveCommunitySquadInviteValidityInput,
): CommunitySquadInviteValidity {
    const invite = input.invite;
    const now = cloneDate(input.now ?? new Date());
    const viewerUserId = input.viewerUserId?.trim() ?? null;

    if (!invite) {
        return {
            isUsable: false,
            reason: 'invalid',
            error: 'Convite invalido.',
        };
    }

    if (invite.status === 'accepted') {
        return {
            isUsable: false,
            reason: 'accepted',
            error: 'Este convite ja foi usado.',
        };
    }

    if (invite.status === 'revoked') {
        return {
            isUsable: false,
            reason: 'revoked',
            error: 'Este convite foi revogado.',
        };
    }

    if (invite.status === 'expired' || invite.expiresAt.getTime() < now.getTime()) {
        return {
            isUsable: false,
            reason: 'expired',
            error: 'Este convite expirou.',
        };
    }

    if (invite.invitedUserId && viewerUserId && invite.invitedUserId !== viewerUserId) {
        return {
            isUsable: false,
            reason: 'viewer_mismatch',
            error: 'Este convite pertence a outro operador.',
        };
    }

    return {
        isUsable: true,
        reason: 'invalid',
        error: '',
    };
}

function createCommunitySquadGoalNextAction(
    eligibleEventTypes: readonly CommunityProgressionEventType[],
): CommunityProgressionNextAction | null {
    for (const eventType of eligibleEventTypes) {
        const rule = getCommunityProgressionRule(eventType);

        if (!rule.nextActionHint) {
            continue;
        }

        return {
            eventType,
            title: rule.nextActionHint.title,
            description: rule.nextActionHint.description,
        };
    }

    return null;
}

function dedupeCommunitySquadGoalEvents(
    events: readonly CommunityProgressionHistoryEvent[],
): readonly CommunityProgressionHistoryEvent[] {
    const seenEventIds = new Set<string>();
    const dedupedEvents: CommunityProgressionHistoryEvent[] = [];

    for (const event of events.slice().sort((left, right) =>
        left.occurredAt.getTime() - right.occurredAt.getTime(),
    )) {
        if (seenEventIds.has(event.idempotencyKey)) {
            continue;
        }

        seenEventIds.add(event.idempotencyKey);
        dedupedEvents.push(event);
    }

    return dedupedEvents;
}

function normalizeEligibleEventTypes(
    eventTypes: readonly CommunityProgressionEventType[],
): readonly CommunityProgressionEventType[] {
    return [...new Set(eventTypes)];
}

function parseOptionalDate(value?: string | null): Date | null {
    if (!value) {
        return null;
    }

    const parsedDate = new Date(value);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function startOfUtcDay(date: Date): Date {
    return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
}

function startOfUtcWeek(date: Date): Date {
    const utcDay = date.getUTCDay();
    const diffToMonday = utcDay === 0 ? -6 : 1 - utcDay;

    return startOfUtcDay(
        new Date(
            Date.UTC(
                date.getUTCFullYear(),
                date.getUTCMonth(),
                date.getUTCDate() + diffToMonday,
            ),
        ),
    );
}

function endOfUtcWeek(date: Date): Date {
    return new Date(date.getTime() + WEEK_MS - 1);
}

function normalizePositiveInteger(value: number, fallbackValue: number): number {
    if (!Number.isFinite(value)) {
        return fallbackValue;
    }

    return Math.max(Math.trunc(value), 1);
}

function clampRatio(value: number): number {
    return Math.min(Math.max(value, 0), 1);
}

function cloneDate(date: Date): Date {
    return new Date(date.getTime());
}

function normalizePublicOptionalText(value?: string | null): string | null {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
}

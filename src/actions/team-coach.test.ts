import { describe, expect, it } from 'vitest';

interface TeamCoachActionsModule {
    readonly createTeamCoachWorkspace?: unknown;
    readonly acceptTeamCoachInvite?: unknown;
    readonly revokeTeamCoachInvite?: unknown;
    readonly shareAnalysisWithTeamCoach?: unknown;
    readonly revokeTeamCoachShare?: unknown;
    readonly writeTeamCoachNote?: unknown;
    readonly updateTeamCoachReviewStatus?: unknown;
    readonly createTeamCoachReviewPacket?: unknown;
    readonly revokeTeamCoachPacketLink?: unknown;
}

async function loadTeamCoachActions(): Promise<Required<TeamCoachActionsModule>> {
    const modulePath = './team-coach';

    let teamCoachActions: TeamCoachActionsModule;
    try {
        teamCoachActions = await import(modulePath) as TeamCoachActionsModule;
    } catch (error) {
        throw new Error(
            [
                'Missing Team Coach action module at src/actions/team-coach.ts.',
                'Expected server actions for workspace create, invite accept/revoke, share/revoke, notes, review status, packets, and links.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }

    return teamCoachActions as Required<TeamCoachActionsModule>;
}

describe('Team Coach action contract', () => {
    it('exports server-owned lifecycle actions for workspaces, invites, shares, notes, statuses, packets, and links', async () => {
        const actions = await loadTeamCoachActions();

        expect(typeof actions.createTeamCoachWorkspace).toBe('function');
        expect(typeof actions.acceptTeamCoachInvite).toBe('function');
        expect(typeof actions.revokeTeamCoachInvite).toBe('function');
        expect(typeof actions.shareAnalysisWithTeamCoach).toBe('function');
        expect(typeof actions.revokeTeamCoachShare).toBe('function');
        expect(typeof actions.writeTeamCoachNote).toBe('function');
        expect(typeof actions.updateTeamCoachReviewStatus).toBe('function');
        expect(typeof actions.createTeamCoachReviewPacket).toBe('function');
        expect(typeof actions.revokeTeamCoachPacketLink).toBe('function');
    });
});

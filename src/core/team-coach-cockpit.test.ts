import { describe, expect, it } from 'vitest';

interface TeamCoachCockpitModule {
    readonly createTeamCoachCockpitViewModel?: (input: Record<string, unknown>) => Record<string, unknown>;
}

async function loadTeamCoachCockpit(): Promise<Required<TeamCoachCockpitModule>> {
    const modulePath = './team-coach-cockpit';

    let teamCoachCockpit: TeamCoachCockpitModule;
    try {
        teamCoachCockpit = await import(modulePath) as TeamCoachCockpitModule;
    } catch (error) {
        throw new Error(
            [
                'Missing Team Coach cockpit module at src/core/team-coach-cockpit.ts.',
                'Expected roster triage, blocker lanes, validation status, next actions, and dossier summaries without global rankings.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }

    expect(typeof teamCoachCockpit.createTeamCoachCockpitViewModel).toBe('function');

    return teamCoachCockpit as Required<TeamCoachCockpitModule>;
}

describe('Team Coach cockpit contract', () => {
    it('groups players into review, validation, repair, blocked, and stable lanes without global ranking', async () => {
        const { createTeamCoachCockpitViewModel } = await loadTeamCoachCockpit();

        const viewModel = createTeamCoachCockpitViewModel({
            players: [
                { id: 'p1', reviewStatus: 'needs_review', validationState: 'pending', blockers: [] },
                { id: 'p2', reviewStatus: 'validation_requested', validationState: 'requested', blockers: [] },
                { id: 'p3', reviewStatus: 'repair_requested', validationState: 'blocked', blockers: ['coverage_low'] },
                { id: 'p4', reviewStatus: 'reviewed', validationState: 'validated', blockers: [] },
            ],
        });
        const serialized = JSON.stringify(viewModel).toLowerCase();

        expect(serialized).toContain('needs_review');
        expect(serialized).toContain('validation');
        expect(serialized).toContain('repair');
        expect(serialized).toContain('coverage_low');
        expect(serialized).not.toContain('global rank');
        expect(serialized).not.toContain('certification');
    });
});

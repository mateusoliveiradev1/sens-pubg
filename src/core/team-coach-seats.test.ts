import { describe, expect, it } from 'vitest';

interface TeamCoachSeatsModule {
    readonly TEAM_COACH_SEAT_POLICY?: {
        readonly pendingPlayerInvitesReserveSeats: boolean;
    };
    readonly buildTeamCoachSeatSummary?: (input: Record<string, unknown>) => Record<string, unknown>;
    readonly resolveTeamCoachSeatAdmission?: (input: Record<string, unknown>) => Record<string, unknown>;
}

async function loadTeamCoachSeats(): Promise<Required<TeamCoachSeatsModule>> {
    const modulePath = './team-coach-seats';

    let seatsModule: TeamCoachSeatsModule;
    try {
        seatsModule = await import(modulePath) as TeamCoachSeatsModule;
    } catch (error) {
        throw new Error(
            [
                'Missing Team Coach seat helper module at src/core/team-coach-seats.ts.',
                'Expected pure helpers for server-owned seat summary and seat-limit admission.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }

    expect(typeof seatsModule.buildTeamCoachSeatSummary).toBe('function');
    expect(typeof seatsModule.resolveTeamCoachSeatAdmission).toBe('function');
    expect(seatsModule.TEAM_COACH_SEAT_POLICY).toMatchObject({
        pendingPlayerInvitesReserveSeats: true,
    });

    return seatsModule as Required<TeamCoachSeatsModule>;
}

const now = new Date('2026-05-11T12:00:00.000Z');
const future = new Date('2026-05-18T12:00:00.000Z');
const past = new Date('2026-05-10T12:00:00.000Z');

describe('Team Coach seat accounting', () => {
    it('summarizes occupied, invited, active, suspended, revoked, pending, and available seats from persisted rows', async () => {
        const { buildTeamCoachSeatSummary } = await loadTeamCoachSeats();

        const summary = buildTeamCoachSeatSummary({
            seatLimit: 4,
            now,
            memberships: [
                { userId: 'player-1', role: 'player', status: 'active', seatState: 'occupied' },
                { userId: 'player-2', role: 'player', status: 'active', seatState: 'occupied' },
                { userId: 'player-3', role: 'player', status: 'suspended', seatState: 'blocked' },
                { userId: 'player-4', role: 'player', status: 'removed', seatState: 'available' },
            ],
            invites: [
                { id: 'invite-1', intendedRole: 'player', status: 'pending', expiresAt: future },
                { id: 'invite-2', intendedRole: 'player', status: 'accepted', expiresAt: future },
                { id: 'invite-3', intendedRole: 'player', status: 'revoked', expiresAt: future },
                { id: 'invite-4', intendedRole: 'player', status: 'pending', expiresAt: past },
            ],
        });

        expect(summary).toMatchObject({
            seatLimit: 4,
            occupiedSeats: 2,
            invitedSeats: 1,
            pendingInvites: 1,
            activeMembers: 2,
            suspendedMembers: 1,
            revokedMembers: 1,
            availableSeats: 1,
            seatPolicy: {
                pendingPlayerInvitesReserveSeats: true,
            },
        });
    });

    it('makes pending player invite reservation policy explicit and configurable', async () => {
        const { buildTeamCoachSeatSummary } = await loadTeamCoachSeats();

        const reserved = buildTeamCoachSeatSummary({
            seatLimit: 2,
            now,
            memberships: [{ userId: 'player-1', role: 'player', status: 'active', seatState: 'occupied' }],
            invites: [{ id: 'invite-1', intendedRole: 'player', status: 'pending', expiresAt: future }],
        });
        const notReserved = buildTeamCoachSeatSummary({
            seatLimit: 2,
            now,
            memberships: [{ userId: 'player-1', role: 'player', status: 'active', seatState: 'occupied' }],
            invites: [{ id: 'invite-1', intendedRole: 'player', status: 'pending', expiresAt: future }],
            policy: { pendingPlayerInvitesReserveSeats: false },
        });

        expect(reserved).toMatchObject({
            invitedSeats: 1,
            availableSeats: 0,
        });
        expect(notReserved).toMatchObject({
            invitedSeats: 0,
            availableSeats: 1,
        });
    });

    it('returns the stable seat_limit_reached denial reason when persisted seats and pending invites fill the limit', async () => {
        const { resolveTeamCoachSeatAdmission } = await loadTeamCoachSeats();

        const admission = resolveTeamCoachSeatAdmission({
            seatLimit: 3,
            now,
            memberships: [
                { userId: 'player-1', role: 'player', status: 'active', seatState: 'occupied' },
                { userId: 'player-2', role: 'player', status: 'active', seatState: 'occupied' },
            ],
            invites: [{ id: 'invite-1', intendedRole: 'player', status: 'pending', expiresAt: future }],
        });

        expect(admission).toMatchObject({
            canAdmit: false,
            denialReason: 'seat_limit_reached',
            summary: {
                occupiedSeats: 2,
                invitedSeats: 1,
                availableSeats: 0,
            },
        });
    });

    it('admits when server-owned persisted rows leave at least one available seat', async () => {
        const { resolveTeamCoachSeatAdmission } = await loadTeamCoachSeats();

        const admission = resolveTeamCoachSeatAdmission({
            seatLimit: 4,
            now,
            memberships: [
                { userId: 'player-1', role: 'player', status: 'active', seatState: 'occupied' },
                { userId: 'player-2', role: 'player', status: 'active', seatState: 'occupied' },
            ],
            invites: [{ id: 'invite-1', intendedRole: 'player', status: 'pending', expiresAt: future }],
        });

        expect(admission).toMatchObject({
            canAdmit: true,
            denialReason: null,
            summary: {
                availableSeats: 1,
            },
        });
    });

    it('ignores client roster counts and derives availability only from persisted membership and invite state', async () => {
        const { buildTeamCoachSeatSummary } = await loadTeamCoachSeats();

        const summary = buildTeamCoachSeatSummary({
            seatLimit: 2,
            now,
            memberships: [],
            invites: [],
            clientRosterCount: 99,
        });

        expect(summary).toMatchObject({
            occupiedSeats: 0,
            invitedSeats: 0,
            availableSeats: 2,
        });
    });
});

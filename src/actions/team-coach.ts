'use server';

import type {
    AcceptTeamCoachInviteInput,
    RevokeTeamCoachInviteInput,
} from '@/actions/team-coach-invites';
import type {
    CreateTeamCoachReviewPacketInput,
    RevokeTeamCoachReportShareInput,
    ShareTeamCoachReportSourceInput,
    TeamCoachPacketLinkActionInput,
} from '@/actions/team-coach-reports';
import type {
    CreateTeamCoachReviewNoteInput,
    UpdateTeamCoachReviewStatusInput,
} from '@/actions/team-coach-review';
import type { CreateTeamCoachWorkspaceInput } from '@/actions/team-coach-workspaces';

export async function createTeamCoachWorkspace(input: CreateTeamCoachWorkspaceInput) {
    const actions = await import('@/actions/team-coach-workspaces');

    return actions.createTeamCoachWorkspace(input);
}

export async function acceptTeamCoachInvite(input: AcceptTeamCoachInviteInput) {
    const actions = await import('@/actions/team-coach-invites');

    return actions.acceptTeamCoachInvite(input);
}

export async function revokeTeamCoachInvite(input: RevokeTeamCoachInviteInput) {
    const actions = await import('@/actions/team-coach-invites');

    return actions.revokeTeamCoachInvite(input);
}

export async function shareAnalysisWithTeamCoach(input: ShareTeamCoachReportSourceInput) {
    const actions = await import('@/actions/team-coach-reports');

    return actions.shareTeamCoachReportSource(input);
}

export async function revokeTeamCoachShare(input: RevokeTeamCoachReportShareInput) {
    const actions = await import('@/actions/team-coach-reports');

    return actions.revokeTeamCoachReportShare(input);
}

export async function writeTeamCoachNote(input: CreateTeamCoachReviewNoteInput) {
    const actions = await import('@/actions/team-coach-review');

    return actions.createTeamCoachReviewNote(input);
}

export async function updateTeamCoachReviewStatus(input: UpdateTeamCoachReviewStatusInput) {
    const actions = await import('@/actions/team-coach-review');

    return actions.updateTeamCoachReviewStatus(input);
}

export async function createTeamCoachReviewPacket(input: CreateTeamCoachReviewPacketInput) {
    const actions = await import('@/actions/team-coach-reports');

    return actions.createTeamCoachReviewPacket(input);
}

export async function revokeTeamCoachPacketLink(input: TeamCoachPacketLinkActionInput) {
    const actions = await import('@/actions/team-coach-reports');

    return actions.revokeTeamCoachPacketLink(input);
}

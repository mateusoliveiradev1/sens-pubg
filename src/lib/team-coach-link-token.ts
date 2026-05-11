import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import type { TeamCoachPrivateLinkStatus } from '@/types/team-coach';

export type TeamCoachPacketLinkVerificationReason =
    | 'active'
    | 'missing_token'
    | 'mismatch'
    | 'revoked'
    | 'expired'
    | 'disabled';

export interface TeamCoachPacketLinkTokenVerifier {
    readonly tokenVerifierHash: string;
    readonly tokenVerifierPrefix: string;
}

export interface VerifyTeamCoachPacketLinkTokenInput {
    readonly token: string | null | undefined;
    readonly tokenVerifierHash: string;
    readonly status: TeamCoachPrivateLinkStatus;
    readonly expiresAt?: Date | string | null;
    readonly now?: Date;
}

export interface TeamCoachPacketLinkTokenVerification {
    readonly active: boolean;
    readonly reason: TeamCoachPacketLinkVerificationReason;
}

const TOKEN_BYTE_LENGTH = 32;
const TOKEN_VERIFIER_DOMAIN = 'sens-pubg.team-coach.packet-link.v1';
const TOKEN_VERIFIER_PREFIX_LENGTH = 16;

function normalizeDate(value: Date | string | null | undefined): Date | null {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isFinite(date.getTime()) ? date : null;
}

function hashTeamCoachPacketLinkToken(token: string): string {
    return createHash('sha256')
        .update(TOKEN_VERIFIER_DOMAIN)
        .update(':')
        .update(token)
        .digest('base64url');
}

function constantTimeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'utf8');
    const rightBuffer = Buffer.from(right, 'utf8');

    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function generateTeamCoachPacketLinkToken(): string {
    return randomBytes(TOKEN_BYTE_LENGTH).toString('base64url');
}

export function createTeamCoachPacketLinkTokenVerifier(
    token: string,
): TeamCoachPacketLinkTokenVerifier {
    const tokenVerifierHash = hashTeamCoachPacketLinkToken(token);

    return {
        tokenVerifierHash,
        tokenVerifierPrefix: tokenVerifierHash.slice(0, TOKEN_VERIFIER_PREFIX_LENGTH),
    };
}

export function isTeamCoachPacketLinkUsable(input: {
    readonly status: TeamCoachPrivateLinkStatus;
    readonly expiresAt?: Date | string | null;
    readonly now?: Date;
}): boolean {
    if (input.status !== 'active') {
        return false;
    }

    const expiresAt = normalizeDate(input.expiresAt);

    return !expiresAt || expiresAt.getTime() > (input.now ?? new Date()).getTime();
}

export function verifyTeamCoachPacketLinkToken(
    input: VerifyTeamCoachPacketLinkTokenInput,
): TeamCoachPacketLinkTokenVerification {
    if (!input.token) {
        return {
            active: false,
            reason: 'missing_token',
        };
    }

    if (input.status === 'revoked') {
        return {
            active: false,
            reason: 'revoked',
        };
    }

    if (input.status === 'disabled') {
        return {
            active: false,
            reason: 'disabled',
        };
    }

    if (input.status === 'expired' || !isTeamCoachPacketLinkUsable({
        status: input.status,
        ...(input.expiresAt === undefined ? {} : { expiresAt: input.expiresAt }),
        ...(input.now === undefined ? {} : { now: input.now }),
    })) {
        return {
            active: false,
            reason: 'expired',
        };
    }

    const expectedHash = createTeamCoachPacketLinkTokenVerifier(input.token).tokenVerifierHash;

    if (!constantTimeEqual(expectedHash, input.tokenVerifierHash)) {
        return {
            active: false,
            reason: 'mismatch',
        };
    }

    return {
        active: true,
        reason: 'active',
    };
}

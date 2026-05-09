import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import type { SocialProPrivateLinkStatus } from '@/types/social-pro';

export type SocialProLinkVerificationReason =
    | 'active'
    | 'missing_token'
    | 'mismatch'
    | 'revoked'
    | 'expired';

export interface SocialProLinkTokenVerifier {
    readonly tokenVerifierHash: string;
    readonly tokenVerifierPrefix: string;
}

export interface VerifySocialProLinkTokenInput {
    readonly token: string | null | undefined;
    readonly tokenVerifierHash: string;
    readonly status: SocialProPrivateLinkStatus;
    readonly expiresAt?: Date | string | null;
    readonly now?: Date;
}

export interface SocialProLinkTokenVerification {
    readonly active: boolean;
    readonly reason: SocialProLinkVerificationReason;
}

const TOKEN_BYTE_LENGTH = 32;
const TOKEN_VERIFIER_DOMAIN = 'sens-pubg.social-pro.private-link.v1';
const TOKEN_VERIFIER_PREFIX_LENGTH = 16;

function normalizeDate(value: Date | string | null | undefined): Date | null {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isFinite(date.getTime()) ? date : null;
}

function hashSocialProLinkToken(token: string): string {
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

export function generateSocialProLinkToken(): string {
    return randomBytes(TOKEN_BYTE_LENGTH).toString('base64url');
}

export function createSocialProLinkTokenVerifier(token: string): SocialProLinkTokenVerifier {
    const tokenVerifierHash = hashSocialProLinkToken(token);

    return {
        tokenVerifierHash,
        tokenVerifierPrefix: tokenVerifierHash.slice(0, TOKEN_VERIFIER_PREFIX_LENGTH),
    };
}

export function isSocialProLinkUsable(input: {
    readonly status: SocialProPrivateLinkStatus;
    readonly expiresAt?: Date | string | null;
    readonly now?: Date;
}): boolean {
    if (input.status !== 'active') {
        return false;
    }

    const expiresAt = normalizeDate(input.expiresAt);

    return !expiresAt || expiresAt.getTime() > (input.now ?? new Date()).getTime();
}

export function verifySocialProLinkToken(
    input: VerifySocialProLinkTokenInput,
): SocialProLinkTokenVerification {
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

    if (!isSocialProLinkUsable({
        status: input.status,
        ...(input.expiresAt === undefined ? {} : { expiresAt: input.expiresAt }),
        ...(input.now === undefined ? {} : { now: input.now }),
    })) {
        return {
            active: false,
            reason: 'expired',
        };
    }

    const expectedHash = createSocialProLinkTokenVerifier(input.token).tokenVerifierHash;

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

import { describe, expect, it } from 'vitest';

interface TeamCoachLinkTokenModule {
    readonly generateTeamCoachPacketLinkToken?: () => string;
    readonly createTeamCoachPacketLinkTokenVerifier?: (token: string) => {
        readonly tokenVerifierHash: string;
        readonly tokenVerifierPrefix: string;
    };
    readonly verifyTeamCoachPacketLinkToken?: (input: {
        readonly token?: string | null;
        readonly tokenVerifierHash: string;
        readonly status: 'active' | 'revoked' | 'expired' | 'disabled';
        readonly expiresAt?: Date | string | null;
        readonly now?: Date;
    }) => {
        readonly active: boolean;
        readonly reason: string;
    };
    readonly isTeamCoachPacketLinkUsable?: (input: {
        readonly status: 'active' | 'revoked' | 'expired' | 'disabled';
        readonly expiresAt?: Date | string | null;
        readonly now?: Date;
    }) => boolean;
}

async function loadTeamCoachLinkToken(): Promise<Required<TeamCoachLinkTokenModule>> {
    const modulePath = './team-coach-link-token';

    let linkToken: TeamCoachLinkTokenModule;
    try {
        linkToken = await import(modulePath) as TeamCoachLinkTokenModule;
    } catch (error) {
        throw new Error(
            [
                'Missing Team Coach packet link token helper at src/lib/team-coach-link-token.ts.',
                'Expected high-entropy token generation plus hash/prefix verifier storage.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }

    expect(typeof linkToken.generateTeamCoachPacketLinkToken).toBe('function');
    expect(typeof linkToken.createTeamCoachPacketLinkTokenVerifier).toBe('function');
    expect(typeof linkToken.verifyTeamCoachPacketLinkToken).toBe('function');
    expect(typeof linkToken.isTeamCoachPacketLinkUsable).toBe('function');

    return linkToken as Required<TeamCoachLinkTokenModule>;
}

describe('Team Coach packet link tokens', () => {
    it('generates high-entropy opaque tokens and stores only verifier hash/prefix values', async () => {
        const {
            createTeamCoachPacketLinkTokenVerifier,
            generateTeamCoachPacketLinkToken,
        } = await loadTeamCoachLinkToken();

        const tokens = Array.from({ length: 16 }, () => generateTeamCoachPacketLinkToken());
        const uniqueTokens = new Set(tokens);

        expect(uniqueTokens.size).toBe(tokens.length);
        for (const token of tokens) {
            expect(token.length).toBeGreaterThanOrEqual(40);
            const verifier = createTeamCoachPacketLinkTokenVerifier(token);
            expect(verifier.tokenVerifierHash).not.toBe(token);
            expect(verifier.tokenVerifierHash).not.toContain(token);
            expect(verifier.tokenVerifierPrefix).toBe(verifier.tokenVerifierHash.slice(0, 16));
        }
    });

    it('verifies active tokens and rejects mismatch, missing, revoked, expired, and disabled states', async () => {
        const {
            createTeamCoachPacketLinkTokenVerifier,
            generateTeamCoachPacketLinkToken,
            isTeamCoachPacketLinkUsable,
            verifyTeamCoachPacketLinkToken,
        } = await loadTeamCoachLinkToken();
        const now = new Date('2026-05-11T02:00:00.000Z');
        const token = generateTeamCoachPacketLinkToken();
        const verifier = createTeamCoachPacketLinkTokenVerifier(token);

        expect(isTeamCoachPacketLinkUsable({
            status: 'active',
            expiresAt: '2026-05-12T02:00:00.000Z',
            now,
        })).toBe(true);
        expect(verifyTeamCoachPacketLinkToken({
            token,
            tokenVerifierHash: verifier.tokenVerifierHash,
            status: 'active',
            expiresAt: '2026-05-12T02:00:00.000Z',
            now,
        })).toEqual({ active: true, reason: 'active' });
        expect(verifyTeamCoachPacketLinkToken({
            token: `${token}wrong`,
            tokenVerifierHash: verifier.tokenVerifierHash,
            status: 'active',
            now,
        })).toEqual({ active: false, reason: 'mismatch' });
        expect(verifyTeamCoachPacketLinkToken({
            token: null,
            tokenVerifierHash: verifier.tokenVerifierHash,
            status: 'active',
            now,
        })).toEqual({ active: false, reason: 'missing_token' });
        expect(verifyTeamCoachPacketLinkToken({
            token,
            tokenVerifierHash: verifier.tokenVerifierHash,
            status: 'revoked',
            now,
        })).toEqual({ active: false, reason: 'revoked' });
        expect(verifyTeamCoachPacketLinkToken({
            token,
            tokenVerifierHash: verifier.tokenVerifierHash,
            status: 'disabled',
            now,
        })).toEqual({ active: false, reason: 'disabled' });
        expect(verifyTeamCoachPacketLinkToken({
            token,
            tokenVerifierHash: verifier.tokenVerifierHash,
            status: 'active',
            expiresAt: '2026-05-10T02:00:00.000Z',
            now,
        })).toEqual({ active: false, reason: 'expired' });
        expect(verifyTeamCoachPacketLinkToken({
            token,
            tokenVerifierHash: verifier.tokenVerifierHash,
            status: 'expired',
            now,
        })).toEqual({ active: false, reason: 'expired' });
    });
});

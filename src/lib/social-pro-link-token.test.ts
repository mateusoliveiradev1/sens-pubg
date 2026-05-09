import { describe, expect, it } from 'vitest';

import {
    createSocialProLinkTokenVerifier,
    generateSocialProLinkToken,
    isSocialProLinkUsable,
    verifySocialProLinkToken,
} from './social-pro-link-token';

const now = new Date('2026-05-09T12:00:00.000Z');

describe('Social Pro private link tokens', () => {
    it('generates high-entropy opaque URL tokens with stable non-raw verifiers', () => {
        const firstToken = generateSocialProLinkToken();
        const secondToken = generateSocialProLinkToken();
        const firstVerifier = createSocialProLinkTokenVerifier(firstToken);
        const repeatedVerifier = createSocialProLinkTokenVerifier(firstToken);

        expect(firstToken).toMatch(/^[A-Za-z0-9_-]{43,}$/);
        expect(secondToken).toMatch(/^[A-Za-z0-9_-]{43,}$/);
        expect(firstToken).not.toBe(secondToken);
        expect(firstVerifier.tokenVerifierHash).toBe(repeatedVerifier.tokenVerifierHash);
        expect(firstVerifier.tokenVerifierHash).not.toContain(firstToken);
        expect(firstVerifier.tokenVerifierPrefix).not.toContain(firstToken.slice(0, 8));
    });

    it('verifies active links without accepting raw-token storage', () => {
        const token = generateSocialProLinkToken();
        const verifier = createSocialProLinkTokenVerifier(token);

        expect(verifySocialProLinkToken({
            token,
            tokenVerifierHash: verifier.tokenVerifierHash,
            status: 'active',
            now,
        })).toMatchObject({
            active: true,
            reason: 'active',
        });

        expect(verifySocialProLinkToken({
            token,
            tokenVerifierHash: token,
            status: 'active',
            now,
        })).toMatchObject({
            active: false,
            reason: 'mismatch',
        });
    });

    it('rejects revoked and expired links as inactive', () => {
        const token = generateSocialProLinkToken();
        const verifier = createSocialProLinkTokenVerifier(token);

        expect(verifySocialProLinkToken({
            token,
            tokenVerifierHash: verifier.tokenVerifierHash,
            status: 'revoked',
            now,
        })).toMatchObject({
            active: false,
            reason: 'revoked',
        });
        expect(verifySocialProLinkToken({
            token,
            tokenVerifierHash: verifier.tokenVerifierHash,
            status: 'active',
            expiresAt: new Date('2026-05-09T11:59:59.999Z'),
            now,
        })).toMatchObject({
            active: false,
            reason: 'expired',
        });
        expect(isSocialProLinkUsable({
            status: 'expired',
            expiresAt: new Date('2026-06-01T00:00:00.000Z'),
            now,
        })).toBe(false);
    });

    it('supports regeneration by creating a new token and verifier while the old hash stays different', () => {
        const oldToken = generateSocialProLinkToken();
        const newToken = generateSocialProLinkToken();
        const oldVerifier = createSocialProLinkTokenVerifier(oldToken);
        const newVerifier = createSocialProLinkTokenVerifier(newToken);

        expect(newToken).not.toBe(oldToken);
        expect(newVerifier.tokenVerifierHash).not.toBe(oldVerifier.tokenVerifierHash);
        expect(verifySocialProLinkToken({
            token: oldToken,
            tokenVerifierHash: newVerifier.tokenVerifierHash,
            status: 'active',
            now,
        })).toMatchObject({
            active: false,
            reason: 'mismatch',
        });
        expect(verifySocialProLinkToken({
            token: newToken,
            tokenVerifierHash: newVerifier.tokenVerifierHash,
            status: 'active',
            now,
        })).toMatchObject({
            active: true,
            reason: 'active',
        });
    });
});

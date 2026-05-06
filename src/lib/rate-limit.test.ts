import { beforeEach, describe, expect, it } from 'vitest';

import {
    checkBillingActionRateLimit,
    resetRateLimitStoreForTests,
} from './rate-limit';

describe('billing action rate limits', () => {
    beforeEach(() => {
        resetRateLimitStoreForTests();
    });

    it('limits checkout attempts per authenticated user', () => {
        const attempts = Array.from({ length: 6 }, () => checkBillingActionRateLimit({
            action: 'billing.checkout.start',
            userId: 'user-1',
        }));

        expect(attempts.slice(0, 5).every((attempt) => attempt.success)).toBe(true);
        expect(attempts[5]).toMatchObject({
            success: false,
            remaining: 0,
        });
    });

    it('falls back to client identifier when a user id is not available', () => {
        const first = checkBillingActionRateLimit({
            action: 'billing.portal.open',
            clientId: '203.0.113.10',
        });
        const otherClient = checkBillingActionRateLimit({
            action: 'billing.portal.open',
            clientId: '203.0.113.11',
        });

        expect(first.success).toBe(true);
        expect(otherClient.success).toBe(true);
        expect(first.remaining).toBe(9);
        expect(otherClient.remaining).toBe(9);
    });
});

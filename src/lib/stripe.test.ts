import { describe, expect, it, vi } from 'vitest';

import {
    STRIPE_API_VERSION,
    constructStripeWebhookEvent,
    createStripeClient,
} from './stripe';

describe('Stripe server wrapper', () => {
    it('pins the SDK to the latest API version supported by the installed stripe package', () => {
        expect(STRIPE_API_VERSION).toBe('2026-04-22.dahlia');
    });

    it('requires a server secret key before constructing a client', () => {
        expect(() => createStripeClient({ secretKey: '' })).toThrow('STRIPE_SECRET_KEY');
    });

    it('constructs a Stripe client with an injected test secret', () => {
        const stripe = createStripeClient({ secretKey: 'sk_test_123' });

        expect(stripe.checkout.sessions.create).toEqual(expect.any(Function));
        expect(stripe.webhooks.constructEvent).toEqual(expect.any(Function));
    });

    it('delegates webhook verification to the official Stripe verifier', () => {
        const constructEvent = vi.fn(() => ({ id: 'evt_1', type: 'checkout.session.completed' }));

        const event = constructStripeWebhookEvent({
            stripe: {
                webhooks: {
                    constructEvent,
                },
            },
            rawBody: '{"id":"evt_1"}',
            signature: 'sig',
            webhookSecret: 'whsec_test',
        });

        expect(event).toMatchObject({ id: 'evt_1' });
        expect(constructEvent).toHaveBeenCalledWith('{"id":"evt_1"}', 'sig', 'whsec_test');
    });
});

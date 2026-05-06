import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

import { handleStripeWebhookRequest } from './route';

function request(body: string, signature?: string): Request {
    return new Request('https://sens.pubg.test/api/stripe/webhook', {
        method: 'POST',
        headers: signature ? { 'stripe-signature': signature } : {},
        body,
    });
}

describe('Stripe webhook route', () => {
    it('rejects requests without a Stripe signature header', async () => {
        const fulfill = vi.fn();
        const response = await handleStripeWebhookRequest(
            request('{"id":"evt_1"}'),
            {
                constructEvent: vi.fn(),
                fulfill,
            },
        );

        expect(response.status).toBe(400);
        expect(fulfill).not.toHaveBeenCalled();
    });

    it('rejects invalid signatures before fulfillment sees parsed JSON', async () => {
        const fulfill = vi.fn();
        const constructEvent = vi.fn(() => {
            throw new Error('bad signature');
        });

        const response = await handleStripeWebhookRequest(
            request('{"id":"evt_1"}', 'bad-signature'),
            {
                constructEvent,
                fulfill,
            },
        );

        expect(response.status).toBe(400);
        expect(constructEvent).toHaveBeenCalledWith({
            rawBody: '{"id":"evt_1"}',
            signature: 'bad-signature',
        });
        expect(fulfill).not.toHaveBeenCalled();
    });

    it('passes only a verified raw-body event to fulfillment', async () => {
        const event = {
            id: 'evt_1',
            type: 'checkout.session.completed',
            livemode: false,
            data: { object: { id: 'cs_1' } },
        } as Stripe.Event;
        const fulfill = vi.fn(async () => ({
            status: 'processed' as const,
            stripeEventId: 'evt_1',
            message: 'ok',
        }));

        const response = await handleStripeWebhookRequest(
            request('{"id":"evt_1"}', 'valid-signature'),
            {
                constructEvent: vi.fn(() => event),
                fulfill,
            },
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(fulfill).toHaveBeenCalledWith(event);
        expect(body).toMatchObject({
            received: true,
            status: 'processed',
        });
    });
});

import Stripe from 'stripe';

export const STRIPE_API_VERSION = '2026-04-22.dahlia';

export type StripeClient = Stripe;

export interface CreateStripeClientInput {
    readonly secretKey?: string | null;
}

export function createStripeClient(input: CreateStripeClientInput = {}): StripeClient {
    const secretKey = input.secretKey ?? process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY is required for Stripe server operations');
    }

    return new Stripe(secretKey, {
        apiVersion: STRIPE_API_VERSION,
        appInfo: {
            name: 'Sens PUBG',
            version: '0.1.0',
        },
        typescript: true,
    });
}

export function getStripeWebhookSecret(): string {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        throw new Error('STRIPE_WEBHOOK_SECRET is required for Stripe webhook verification');
    }

    return process.env.STRIPE_WEBHOOK_SECRET;
}

export function constructStripeWebhookEvent(input: {
    readonly stripe: Pick<StripeClient, 'webhooks'>;
    readonly rawBody: string;
    readonly signature: string;
    readonly webhookSecret: string;
}): Stripe.Event {
    return input.stripe.webhooks.constructEvent(
        input.rawBody,
        input.signature,
        input.webhookSecret,
    );
}

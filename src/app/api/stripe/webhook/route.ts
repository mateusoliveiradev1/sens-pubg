import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import {
    constructStripeWebhookEvent,
    createStripeClient,
    getStripeWebhookSecret,
} from '@/lib/stripe';
import {
    fulfillStripeEvent,
    type FulfillmentResult,
} from '@/server/billing/stripe-fulfillment';

export interface StripeWebhookHandlerDeps {
    readonly constructEvent: (input: {
        readonly rawBody: string;
        readonly signature: string;
    }) => Stripe.Event;
    readonly fulfill: (event: Stripe.Event) => Promise<FulfillmentResult>;
}

function createStripeWebhookHandlerDeps(): StripeWebhookHandlerDeps {
    const stripe = createStripeClient();
    const webhookSecret = getStripeWebhookSecret();

    return {
        constructEvent(input) {
            return constructStripeWebhookEvent({
                stripe,
                rawBody: input.rawBody,
                signature: input.signature,
                webhookSecret,
            });
        },
        fulfill: fulfillStripeEvent,
    };
}

export async function handleStripeWebhookRequest(
    request: Request,
    deps: StripeWebhookHandlerDeps,
): Promise<Response> {
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
        return NextResponse.json({ error: 'Missing Stripe-Signature header' }, { status: 400 });
    }

    const rawBody = await request.text();
    let event: Stripe.Event;

    try {
        event = deps.constructEvent({ rawBody, signature });
    } catch {
        return NextResponse.json({ error: 'Invalid Stripe webhook signature' }, { status: 400 });
    }

    const result = await deps.fulfill(event);

    return NextResponse.json({
        received: true,
        status: result.status,
        message: result.message,
    });
}

export async function POST(request: Request): Promise<Response> {
    return handleStripeWebhookRequest(request, createStripeWebhookHandlerDeps());
}

import {
    createStripeWebhookHandlerDeps,
    handleStripeWebhookRequest,
} from '@/server/billing/stripe-webhook-handler';

export async function POST(request: Request): Promise<Response> {
    return handleStripeWebhookRequest(request, createStripeWebhookHandlerDeps());
}

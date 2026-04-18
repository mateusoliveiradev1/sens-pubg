import 'server-only';

import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
    buildCoachInput,
    buildCoachInstructions,
    CoachBatchSchema,
} from '@/core/coach-llm-contract';
import { env } from '@/env';
import type { CoachLlmClient } from '@/core/coach-llm-adapter';

const GROQ_OPENAI_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_GROQ_COACH_MODEL = 'openai/gpt-oss-20b';

let cachedClient: OpenAI | null = null;

function getGroqClient(): OpenAI {
    if (!cachedClient) {
        cachedClient = new OpenAI({
            apiKey: env.GROQ_API_KEY,
            baseURL: GROQ_OPENAI_BASE_URL,
        });
    }

    return cachedClient;
}

function resolveCoachModel(): string {
    return env.GROQ_COACH_MODEL ?? DEFAULT_GROQ_COACH_MODEL;
}

export function createGroqCoachClient(): CoachLlmClient | undefined {
    if (!env.GROQ_API_KEY) {
        return undefined;
    }

    return {
        async generate(payload, coachPlan) {
            if (payload.length === 0 && !coachPlan) {
                return { items: [] };
            }

            const response = await getGroqClient().responses.create({
                model: resolveCoachModel(),
                instructions: buildCoachInstructions(),
                input: buildCoachInput(payload, coachPlan),
                max_output_tokens: Math.max(1200, payload.length * 260 + (coachPlan ? 900 : 0)),
                text: {
                    format: zodTextFormat(CoachBatchSchema, 'coach_feedback_batch'),
                },
            });

            if (!response.output_text?.trim()) {
                return null;
            }

            const parsed = CoachBatchSchema.safeParse(JSON.parse(response.output_text));
            if (!parsed.success) {
                return null;
            }

            return parsed.data;
        },
    };
}

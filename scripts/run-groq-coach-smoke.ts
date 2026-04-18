import { config as loadDotenv } from 'dotenv';

import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
    buildCoachInput,
    buildCoachInstructions,
    CoachBatchSchema,
} from '../src/core/coach-llm-contract';

const GROQ_OPENAI_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_GROQ_COACH_MODEL = 'openai/gpt-oss-20b';

loadDotenv({
    path: ['.env.local', '.env'],
    override: false,
    quiet: true,
});

async function main() {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    const model = process.env.GROQ_COACH_MODEL?.trim() || DEFAULT_GROQ_COACH_MODEL;

    if (!apiKey) {
        console.error('Missing GROQ_API_KEY in environment or .env.local.');
        process.exitCode = 1;
        return;
    }

    const client = new OpenAI({
        apiKey,
        baseURL: GROQ_OPENAI_BASE_URL,
    });

    const payload = [
        {
            mode: 'standard',
            problem: 'O spray abre acima do alvo nos primeiros tiros.',
            evidence: {
                diagnosisType: 'underpull',
                severity: 3,
                confidence: 0.91,
                coverage: 0.94,
                angularErrorDegrees: 0.8,
                linearErrorCm: 28,
                linearErrorSeverity: 3,
                patchVersion: '41.1',
                attachmentCatalogVersion: '41.1',
                targetDistanceMeters: 30,
                weaponName: 'Beryl M762',
                weaponCategory: 'AR',
                stance: 'standing',
            },
            confidence: 0.91,
            likelyCause: 'O pulldown entrou tarde no inicio do spray.',
            adjustment: 'Comece a compensacao vertical um pouco antes do segundo tiro.',
            drill: 'Repita sprays curtos de 10 tiros focando no inicio da puxada.',
            verifyNextClip: 'Veja se o primeiro terco do spray fica mais centralizado.',
        },
    ] as const;
    const coachPlan = {
        tier: 'test_protocol',
        sessionSummary: 'Validar pulldown inicial antes de aplicar qualquer mudanca permanente.',
        primaryFocus: {
            id: 'vertical-control',
            area: 'vertical_control',
            title: 'Controle vertical',
            whyNow: 'O primeiro terco do spray esta subindo e precisa de confirmacao.',
            priorityScore: 0.81,
            severity: 0.8,
            confidence: 0.91,
            coverage: 0.94,
            dependencies: [],
            blockedBy: [],
            signals: [],
        },
        secondaryFocuses: [],
        actionProtocols: [
            {
                id: 'vertical-control-drill-protocol',
                kind: 'drill',
                instruction: 'Repita sprays curtos de 10 tiros focando no inicio da puxada.',
                expectedEffect: 'Confirma se antecipar o pulldown reduz o erro vertical.',
                risk: 'low',
                applyWhen: 'Use quando o eixo vertical for o foco principal.',
                avoidWhen: 'Evite mudar sensibilidade no mesmo bloco.',
            },
        ],
        nextBlock: {
            title: 'Bloco curto de controle vertical',
            durationMinutes: 12,
            steps: ['Run 3 comparable sprays focused on vertical control.'],
            checks: [
                {
                    label: 'vertical control validation',
                    target: 'lower sustained vertical error',
                    minimumCoverage: 0.9,
                    minimumConfidence: 0.86,
                    successCondition: 'Success when vertical control improves.',
                    failCondition: 'Fail if evidence falls below threshold.',
                },
            ],
        },
        stopConditions: ['Stop if capture quality drops.'],
        adaptationWindowDays: 2,
        llmRewriteAllowed: false,
    } as const;

    const response = await client.responses.create({
        model,
        instructions: buildCoachInstructions(),
        input: buildCoachInput(payload, coachPlan),
        max_output_tokens: 1200,
        text: {
            format: zodTextFormat(CoachBatchSchema, 'coach_feedback_batch'),
        },
    });

    if (!response.output_text?.trim()) {
        throw new Error('Groq returned an empty output.');
    }

    const parsed = CoachBatchSchema.parse(JSON.parse(response.output_text));

    console.log(`Groq model: ${model}`);
    console.log(JSON.stringify(parsed, null, 2));
}

main().catch((error) => {
    console.error('Groq smoke failed.');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});

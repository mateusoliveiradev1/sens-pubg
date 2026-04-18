import type { CoachEvidence, CoachFeedback, CoachMode, CoachPlan } from '@/types/engine';

export interface CoachLlmPayloadItem {
    readonly mode: CoachMode;
    readonly problem: string;
    readonly evidence: CoachEvidence;
    readonly confidence: number;
    readonly likelyCause: string;
    readonly adjustment: string;
    readonly drill: string;
    readonly verifyNextClip: string;
}

export interface CoachLlmTextOutput {
    readonly problem: string;
    readonly likelyCause: string;
    readonly adjustment: string;
    readonly drill: string;
    readonly verifyNextClip: string;
}

export interface CoachLlmPlanProtocolOutput {
    readonly id: string;
    readonly instruction: string;
}

export interface CoachLlmPlanOutput {
    readonly sessionSummary: string;
    readonly primaryFocusWhyNow: string;
    readonly actionProtocols: readonly CoachLlmPlanProtocolOutput[];
    readonly nextBlockTitle: string;
}

export interface CoachLlmBatchOutput {
    readonly items: readonly CoachLlmTextOutput[];
    readonly coachPlan?: CoachLlmPlanOutput;
}

export interface CoachLlmClient {
    generate(
        payload: readonly CoachLlmPayloadItem[],
        coachPlan?: CoachPlan
    ): Promise<unknown>;
}

export interface AdaptCoachResultInput {
    readonly coaching: readonly CoachFeedback[];
    readonly coachPlan?: CoachPlan;
}

export interface AdaptCoachResultOutput {
    readonly coaching: readonly CoachFeedback[];
    readonly coachPlan?: CoachPlan;
}

const TEXT_OUTPUT_KEYS = [
    'problem',
    'likelyCause',
    'adjustment',
    'drill',
    'verifyNextClip',
] as const;

const PLAN_OUTPUT_KEYS = [
    'sessionSummary',
    'primaryFocusWhyNow',
    'actionProtocols',
    'nextBlockTitle',
] as const;

const PLAN_PROTOCOL_OUTPUT_KEYS = [
    'id',
    'instruction',
] as const;

export function buildCoachLlmPayload(
    feedback: readonly CoachFeedback[]
): readonly CoachLlmPayloadItem[] {
    return feedback.map((item) => ({
        mode: item.mode,
        problem: item.problem,
        evidence: item.evidence,
        confidence: item.confidence,
        likelyCause: item.likelyCause,
        adjustment: item.adjustment,
        drill: item.drill,
        verifyNextClip: item.verifyNextClip,
    }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(
    value: Record<string, unknown>,
    expectedKeys: readonly string[]
): boolean {
    const keys = Object.keys(value);

    return keys.length === expectedKeys.length
        && expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function isValidTextOutput(value: unknown): value is CoachLlmTextOutput {
    if (!isRecord(value)) {
        return false;
    }

    return hasExactKeys(value, TEXT_OUTPUT_KEYS)
        && TEXT_OUTPUT_KEYS.every((key) => typeof value[key] === 'string');
}

function parseTextOutputs(
    value: unknown,
    expectedLength: number
): readonly CoachLlmTextOutput[] | null {
    if (!Array.isArray(value) || value.length !== expectedLength) {
        return null;
    }

    if (!value.every(isValidTextOutput)) {
        return null;
    }

    return value;
}

function isValidPlanProtocolOutput(value: unknown): value is CoachLlmPlanProtocolOutput {
    if (!isRecord(value)) {
        return false;
    }

    return hasExactKeys(value, PLAN_PROTOCOL_OUTPUT_KEYS)
        && PLAN_PROTOCOL_OUTPUT_KEYS.every((key) => typeof value[key] === 'string');
}

function isValidPlanOutput(value: unknown): value is CoachLlmPlanOutput {
    if (!isRecord(value) || !hasExactKeys(value, PLAN_OUTPUT_KEYS)) {
        return false;
    }

    return typeof value.sessionSummary === 'string'
        && typeof value.primaryFocusWhyNow === 'string'
        && Array.isArray(value.actionProtocols)
        && value.actionProtocols.every(isValidPlanProtocolOutput)
        && typeof value.nextBlockTitle === 'string';
}

function parseBatchOutput(
    value: unknown,
    expectedLength: number
): CoachLlmBatchOutput | null {
    if (Array.isArray(value)) {
        const items = parseTextOutputs(value, expectedLength);
        return items ? { items } : null;
    }

    if (!isRecord(value)) {
        return null;
    }

    const expectedKeys = Object.prototype.hasOwnProperty.call(value, 'coachPlan')
        ? ['items', 'coachPlan']
        : ['items'];
    if (!hasExactKeys(value, expectedKeys)) {
        return null;
    }

    const items = parseTextOutputs(value.items, expectedLength);
    if (!items) {
        return null;
    }

    if (!Object.prototype.hasOwnProperty.call(value, 'coachPlan')) {
        return { items };
    }

    if (!isValidPlanOutput(value.coachPlan)) {
        return null;
    }

    return {
        items,
        coachPlan: value.coachPlan,
    };
}

function applyTextOutput(
    feedback: CoachFeedback,
    output: CoachLlmTextOutput
): CoachFeedback {
    return {
        ...feedback,
        problem: output.problem,
        likelyCause: output.likelyCause,
        adjustment: output.adjustment,
        drill: output.drill,
        verifyNextClip: output.verifyNextClip,
        whatIsWrong: output.problem,
        whyItHappens: output.likelyCause,
        whatToAdjust: output.adjustment,
        howToTest: output.drill,
    };
}

function applyPlanOutput(
    coachPlan: CoachPlan,
    output: CoachLlmPlanOutput
): CoachPlan | null {
    const protocolIds = new Set(coachPlan.actionProtocols.map((protocol) => protocol.id));
    const instructionByProtocolId = new Map<string, string>();

    for (const protocol of output.actionProtocols) {
        if (!protocolIds.has(protocol.id) || instructionByProtocolId.has(protocol.id)) {
            return null;
        }

        instructionByProtocolId.set(protocol.id, protocol.instruction);
    }

    return {
        ...coachPlan,
        sessionSummary: output.sessionSummary,
        primaryFocus: {
            ...coachPlan.primaryFocus,
            whyNow: output.primaryFocusWhyNow,
        },
        actionProtocols: coachPlan.actionProtocols.map((protocol) => ({
            ...protocol,
            instruction: instructionByProtocolId.get(protocol.id) ?? protocol.instruction,
        })),
        nextBlock: {
            ...coachPlan.nextBlock,
            title: output.nextBlockTitle,
        },
    };
}

function deterministicResult(input: AdaptCoachResultInput): AdaptCoachResultOutput {
    return input.coachPlan
        ? { coaching: input.coaching, coachPlan: input.coachPlan }
        : { coaching: input.coaching };
}

export async function adaptCoachResultWithOptionalLlm(
    input: AdaptCoachResultInput,
    client?: CoachLlmClient
): Promise<AdaptCoachResultOutput> {
    if (!client) {
        return deterministicResult(input);
    }

    try {
        const payload = buildCoachLlmPayload(input.coaching);
        const rawOutput = await client.generate(payload, input.coachPlan);
        const parsedOutput = parseBatchOutput(rawOutput, input.coaching.length);
        if (!parsedOutput) {
            return deterministicResult(input);
        }

        let coachPlan = input.coachPlan;
        if (input.coachPlan && parsedOutput.coachPlan) {
            const adaptedPlan = applyPlanOutput(input.coachPlan, parsedOutput.coachPlan);
            if (!adaptedPlan) {
                return deterministicResult(input);
            }

            coachPlan = adaptedPlan;
        }

        const coaching = input.coaching.map((feedback, index) =>
            applyTextOutput(feedback, parsedOutput.items[index]!)
        );

        return coachPlan ? { coaching, coachPlan } : { coaching };
    } catch {
        return deterministicResult(input);
    }
}

export async function adaptCoachWithOptionalLlm(
    deterministicFeedback: readonly CoachFeedback[],
    client?: CoachLlmClient
): Promise<readonly CoachFeedback[]> {
    const result = await adaptCoachResultWithOptionalLlm(
        { coaching: deterministicFeedback },
        client
    );

    return result.coaching;
}

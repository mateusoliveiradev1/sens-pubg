import type { CoachEvidence, CoachFeedback, CoachMode } from '@/types/engine';

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

export interface CoachLlmClient {
    generate(payload: readonly CoachLlmPayloadItem[]): Promise<unknown>;
}

const TEXT_OUTPUT_KEYS = [
    'problem',
    'likelyCause',
    'adjustment',
    'drill',
    'verifyNextClip',
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

function isValidTextOutput(value: unknown): value is CoachLlmTextOutput {
    if (!isRecord(value)) {
        return false;
    }

    const keys = Object.keys(value);
    if (keys.length !== TEXT_OUTPUT_KEYS.length) {
        return false;
    }

    return TEXT_OUTPUT_KEYS.every((key) => typeof value[key] === 'string');
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

export async function adaptCoachWithOptionalLlm(
    deterministicFeedback: readonly CoachFeedback[],
    client?: CoachLlmClient
): Promise<readonly CoachFeedback[]> {
    if (!client) {
        return deterministicFeedback;
    }

    try {
        const payload = buildCoachLlmPayload(deterministicFeedback);
        const rawOutput = await client.generate(payload);
        const parsedOutput = parseTextOutputs(rawOutput, deterministicFeedback.length);
        if (!parsedOutput) {
            return deterministicFeedback;
        }

        return deterministicFeedback.map((feedback, index) =>
            applyTextOutput(feedback, parsedOutput[index]!)
        );
    } catch {
        return deterministicFeedback;
    }
}

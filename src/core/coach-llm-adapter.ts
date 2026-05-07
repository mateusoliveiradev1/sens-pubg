import type {
    CoachEvidence,
    CoachFeedback,
    CoachMode,
    CoachPlan,
    CompleteTrainingProtocol,
} from '@/types/engine';
import type { CoachImmutableFactsInput } from './coach-llm-contract';

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

export interface CoachLlmCompleteProtocolPreparationOutput {
    readonly id: string;
    readonly label: string;
}

export interface CoachLlmCompleteProtocolOutput {
    readonly id: string;
    readonly title?: string;
    readonly summary?: string;
    readonly executionSteps?: readonly string[];
    readonly preparation?: readonly CoachLlmCompleteProtocolPreparationOutput[];
}

export interface CoachLlmPlanOutput {
    readonly sessionSummary: string;
    readonly primaryFocusWhyNow: string;
    readonly actionProtocols: readonly CoachLlmPlanProtocolOutput[];
    readonly nextBlockTitle: string;
    readonly completeProtocol?: CoachLlmCompleteProtocolOutput;
}

export interface CoachLlmBatchOutput {
    readonly items: readonly CoachLlmTextOutput[];
    readonly coachPlan?: CoachLlmPlanOutput;
}

export interface CoachLlmClient {
    generate(
        payload: readonly CoachLlmPayloadItem[],
        coachPlan?: CoachPlan,
        immutableFacts?: CoachImmutableFactsInput
    ): Promise<unknown>;
}

export interface AdaptCoachResultInput {
    readonly coaching: readonly CoachFeedback[];
    readonly coachPlan?: CoachPlan;
    readonly immutableFacts?: CoachImmutableFactsInput;
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

const PLAN_OUTPUT_REQUIRED_KEYS = [
    'sessionSummary',
    'primaryFocusWhyNow',
    'actionProtocols',
    'nextBlockTitle',
] as const;

const PLAN_OUTPUT_OPTIONAL_KEYS = [
    'completeProtocol',
] as const;

const PLAN_PROTOCOL_OUTPUT_KEYS = [
    'id',
    'instruction',
] as const;

const COMPLETE_PROTOCOL_OUTPUT_REQUIRED_KEYS = [
    'id',
] as const;

const COMPLETE_PROTOCOL_OUTPUT_OPTIONAL_KEYS = [
    'title',
    'summary',
    'executionSteps',
    'preparation',
] as const;

const COMPLETE_PROTOCOL_PREPARATION_OUTPUT_KEYS = [
    'id',
    'label',
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

function hasRequiredAndOptionalKeys(
    value: Record<string, unknown>,
    requiredKeys: readonly string[],
    optionalKeys: readonly string[],
): boolean {
    const keys = Object.keys(value);
    const expected = new Set([...requiredKeys, ...optionalKeys]);

    return requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
        && keys.every((key) => expected.has(key));
}

function isValidTextOutput(value: unknown): value is CoachLlmTextOutput {
    if (!isRecord(value)) {
        return false;
    }

    return hasExactKeys(value, TEXT_OUTPUT_KEYS)
        && TEXT_OUTPUT_KEYS.every((key) => (
            typeof value[key] === 'string'
            && !containsBlockedCoachCopy(value[key])
        ));
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
        && PLAN_PROTOCOL_OUTPUT_KEYS.every((key) => typeof value[key] === 'string')
        && !containsBlockedCoachCopy(value.instruction as string);
}

function isValidCompleteProtocolPreparationOutput(
    value: unknown,
): value is CoachLlmCompleteProtocolPreparationOutput {
    if (!isRecord(value)) {
        return false;
    }

    return hasExactKeys(value, COMPLETE_PROTOCOL_PREPARATION_OUTPUT_KEYS)
        && typeof value.id === 'string'
        && typeof value.label === 'string'
        && !containsBlockedCoachCopy(value.label);
}

function hasOnlySafeOptionalTextFields(
    value: Record<string, unknown>,
    textKeys: readonly string[],
): boolean {
    return textKeys.every((key) => (
        !Object.prototype.hasOwnProperty.call(value, key)
        || (
            typeof value[key] === 'string'
            && !containsBlockedCoachCopy(value[key] as string)
        )
    ));
}

function isValidCompleteProtocolOutput(value: unknown): value is CoachLlmCompleteProtocolOutput {
    if (!isRecord(value)) {
        return false;
    }

    if (!hasRequiredAndOptionalKeys(
        value,
        COMPLETE_PROTOCOL_OUTPUT_REQUIRED_KEYS,
        COMPLETE_PROTOCOL_OUTPUT_OPTIONAL_KEYS,
    )) {
        return false;
    }

    if (typeof value.id !== 'string') {
        return false;
    }

    if (!hasOnlySafeOptionalTextFields(value, ['title', 'summary'])) {
        return false;
    }

    if (
        Object.prototype.hasOwnProperty.call(value, 'executionSteps')
        && (
            !Array.isArray(value.executionSteps)
            || !value.executionSteps.every((step) => (
                typeof step === 'string'
                && !containsBlockedCoachCopy(step)
            ))
        )
    ) {
        return false;
    }

    if (
        Object.prototype.hasOwnProperty.call(value, 'preparation')
        && (
            !Array.isArray(value.preparation)
            || !value.preparation.every(isValidCompleteProtocolPreparationOutput)
        )
    ) {
        return false;
    }

    return true;
}

function isValidPlanOutput(value: unknown): value is CoachLlmPlanOutput {
    if (
        !isRecord(value)
        || !hasRequiredAndOptionalKeys(value, PLAN_OUTPUT_REQUIRED_KEYS, PLAN_OUTPUT_OPTIONAL_KEYS)
    ) {
        return false;
    }

    return typeof value.sessionSummary === 'string'
        && typeof value.primaryFocusWhyNow === 'string'
        && Array.isArray(value.actionProtocols)
        && value.actionProtocols.every(isValidPlanProtocolOutput)
        && typeof value.nextBlockTitle === 'string'
        && !containsBlockedCoachCopy(value.sessionSummary)
        && !containsBlockedCoachCopy(value.primaryFocusWhyNow)
        && !containsBlockedCoachCopy(value.nextBlockTitle)
        && (
            !Object.prototype.hasOwnProperty.call(value, 'completeProtocol')
            || isValidCompleteProtocolOutput(value.completeProtocol)
        );
}

function containsBlockedCoachCopy(value: string): boolean {
    const normalized = value.toLowerCase();

    return [
        'short test block',
        'short vertical',
        'short horizontal',
        'clean capture',
        'stabilization block',
        'apply and validate',
        'success when',
        'fail if',
        'threshold',
        'setup',
        'drift',
        'grip',
        'keep weapon',
        'use the next clip',
        'loadout',
        'capture quality',
        'vertical control',
        'horizontal control',
        'sensitivity profile',
        'sensibilidade perfeita',
        'perfeito',
        'perfeita',
        'garantid',
        'subir de rank',
        'rank garantido',
        'veredito final',
        'veredito definitivo',
        'ajuste definitivo garantido',
        'provou melhora',
        'melhora comprovada',
        'sem precisar validar',
        'sem validacao',
        'diagnostico medico',
        'diagnóstico medico',
        'diagnóstico médico',
        'tratamento',
        'cura',
        'lesao diagnosticada',
        'lesão diagnosticada',
        'continue com dor',
        'dor e falha de mira',
        '3 series',
        '3 séries',
        'carga',
        'progressao de musculacao',
        'progressão de musculação',
        'treino de antebraco pesado',
        'treino de antebraço pesado',
    ].some((marker) => normalized.includes(marker));
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

function applyCompleteProtocolOutput(
    completeProtocol: CompleteTrainingProtocol,
    output: CoachLlmCompleteProtocolOutput,
): CompleteTrainingProtocol | null {
    if (output.id !== completeProtocol.id) {
        return null;
    }

    if (
        output.executionSteps
        && output.executionSteps.length !== completeProtocol.executionSteps.length
    ) {
        return null;
    }

    if (output.preparation) {
        if (output.preparation.length !== completeProtocol.preparation.length) {
            return null;
        }

        for (let index = 0; index < output.preparation.length; index++) {
            if (output.preparation[index]!.id !== completeProtocol.preparation[index]!.id) {
                return null;
            }
        }
    }

    return {
        ...completeProtocol,
        ...(output.title ? { title: output.title } : {}),
        ...(output.summary ? { summary: output.summary } : {}),
        ...(output.executionSteps ? { executionSteps: output.executionSteps } : {}),
        ...(output.preparation ? {
            preparation: completeProtocol.preparation.map((item, index) => ({
                ...item,
                label: output.preparation![index]!.label,
            })),
        } : {}),
    };
}

function applyPlanOutput(
    coachPlan: CoachPlan,
    output: CoachLlmPlanOutput
): CoachPlan | null {
    if (output.actionProtocols.length !== coachPlan.actionProtocols.length) {
        return null;
    }

    let completeProtocol = coachPlan.completeProtocol;
    if (output.completeProtocol) {
        if (!coachPlan.completeProtocol) {
            return null;
        }

        const adaptedCompleteProtocol = applyCompleteProtocolOutput(
            coachPlan.completeProtocol,
            output.completeProtocol,
        );
        if (!adaptedCompleteProtocol) {
            return null;
        }

        completeProtocol = adaptedCompleteProtocol;
    }

    const instructionByProtocolId = new Map<string, string>();

    for (let index = 0; index < output.actionProtocols.length; index++) {
        const protocol = output.actionProtocols[index]!;
        const expectedProtocol = coachPlan.actionProtocols[index]!;
        if (protocol.id !== expectedProtocol.id || instructionByProtocolId.has(protocol.id)) {
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
        ...(completeProtocol ? { completeProtocol } : {}),
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
        const rawOutput = await client.generate(payload, input.coachPlan, input.immutableFacts);
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

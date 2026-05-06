import type {
    CoachFocusArea,
    CoachOutcomeConflict,
    CoachOutcomeEvidenceStrength,
    CoachProtocolOutcome,
    CoachProtocolOutcomeReasonCode,
    CoachProtocolOutcomeStatus,
    PrecisionTrendLabel,
    PrecisionTrendSummary,
} from '../types/engine';

export const COACH_OUTCOME_NOTE_MAX_LENGTH = 500;

export interface NormalizeCoachProtocolOutcomeInput {
    readonly sessionId: unknown;
    readonly coachPlanId: unknown;
    readonly protocolId: unknown;
    readonly focusArea: unknown;
    readonly status: unknown;
    readonly reasonCodes?: unknown;
    readonly note?: unknown;
    readonly revisionOfOutcomeId?: unknown;
}

export interface NormalizedCoachProtocolOutcomeInput {
    readonly sessionId: string;
    readonly coachPlanId: string;
    readonly protocolId: string;
    readonly focusArea: CoachFocusArea;
    readonly status: CoachProtocolOutcomeStatus;
    readonly reasonCodes: readonly CoachProtocolOutcomeReasonCode[];
    readonly note?: string;
    readonly revisionOfOutcomeId?: string;
}

export type NormalizeCoachProtocolOutcomeResult =
    | {
        readonly ok: true;
        readonly value: NormalizedCoachProtocolOutcomeInput;
    }
    | {
        readonly ok: false;
        readonly errors: readonly string[];
    };

export interface ResolveCoachOutcomeEvidenceInput {
    readonly status: CoachProtocolOutcomeStatus;
    readonly reasonCodes?: readonly CoachProtocolOutcomeReasonCode[];
    readonly precisionTrend?: Pick<PrecisionTrendSummary, 'label' | 'evidenceLevel'> | null;
}

export interface CoachOutcomeEvidenceResolution {
    readonly evidenceStrength: CoachOutcomeEvidenceStrength;
    readonly countsAsTechnicalEvidence: boolean;
    readonly pendingClosure: boolean;
    readonly needsCompatibleValidation: boolean;
    readonly invalidBecauseOfExecutionOrCapture: boolean;
    readonly summary: string;
}

export interface DetectCoachOutcomePrecisionConflictInput {
    readonly outcomeId: string;
    readonly status: CoachProtocolOutcomeStatus;
    readonly precisionTrend?: Pick<PrecisionTrendSummary, 'label' | 'nextValidationHint'> | null;
}

export interface CoachOutcomeMemorySummary {
    readonly outcomeId: string;
    readonly protocolId: string;
    readonly focusArea: CoachFocusArea;
    readonly status: CoachProtocolOutcomeStatus;
    readonly evidenceStrength: CoachOutcomeEvidenceStrength;
    readonly countsAsTechnicalEvidence: boolean;
    readonly pendingClosure: boolean;
    readonly needsCompatibleValidation: boolean;
    readonly failureMode: 'none' | 'neutral' | 'protocol' | 'execution_or_capture' | 'conflict';
    readonly summary: string;
}

const COACH_PROTOCOL_OUTCOME_STATUSES = new Set<CoachProtocolOutcomeStatus>([
    'started',
    'completed',
    'improved',
    'unchanged',
    'worse',
    'invalid_capture',
]);

const COACH_PROTOCOL_OUTCOME_REASON_CODES = new Set<CoachProtocolOutcomeReasonCode>([
    'capture_quality',
    'incompatible_context',
    'poor_execution',
    'variable_changed',
    'confusing_protocol',
    'fatigue_or_pain',
    'other',
]);

const COACH_FOCUS_AREAS = new Set<CoachFocusArea>([
    'capture_quality',
    'vertical_control',
    'horizontal_control',
    'timing',
    'consistency',
    'sensitivity',
    'loadout',
    'validation',
]);

const EXECUTION_OR_CAPTURE_REASON_CODES = new Set<CoachProtocolOutcomeReasonCode>([
    'capture_quality',
    'incompatible_context',
    'poor_execution',
    'variable_changed',
    'fatigue_or_pain',
]);

export function isCoachProtocolOutcomeStatus(value: unknown): value is CoachProtocolOutcomeStatus {
    return typeof value === 'string' && COACH_PROTOCOL_OUTCOME_STATUSES.has(value as CoachProtocolOutcomeStatus);
}

export function isCoachProtocolOutcomeReasonCode(value: unknown): value is CoachProtocolOutcomeReasonCode {
    return typeof value === 'string' && COACH_PROTOCOL_OUTCOME_REASON_CODES.has(value as CoachProtocolOutcomeReasonCode);
}

export function normalizeCoachProtocolOutcomeInput(
    input: NormalizeCoachProtocolOutcomeInput,
): NormalizeCoachProtocolOutcomeResult {
    const errors: string[] = [];
    const sessionId = normalizeRequiredString(input.sessionId, 'sessionId', errors);
    const coachPlanId = normalizeRequiredString(input.coachPlanId, 'coachPlanId', errors);
    const protocolId = normalizeRequiredString(input.protocolId, 'protocolId', errors);
    const focusArea = normalizeFocusArea(input.focusArea, errors);
    const status = normalizeStatus(input.status, errors);
    const reasonCodes = normalizeReasonCodes(input.reasonCodes, errors);
    const note = normalizeNote(input.note, errors);
    const revisionOfOutcomeId = normalizeOptionalString(input.revisionOfOutcomeId, 'revisionOfOutcomeId', errors);

    if (status === 'invalid_capture' && reasonCodes.length === 0) {
        errors.push('invalid_capture requires at least one reason code.');
    }

    if (errors.length > 0 || !sessionId || !coachPlanId || !protocolId || !focusArea || !status) {
        return { ok: false, errors };
    }

    return {
        ok: true,
        value: {
            sessionId,
            coachPlanId,
            protocolId,
            focusArea,
            status,
            reasonCodes,
            ...(note ? { note } : {}),
            ...(revisionOfOutcomeId ? { revisionOfOutcomeId } : {}),
        },
    };
}

export function resolveCoachOutcomeEvidence(
    input: ResolveCoachOutcomeEvidenceInput,
): CoachOutcomeEvidenceResolution {
    if (detectEvidenceConflict(input.status, input.precisionTrend?.label)) {
        return {
            evidenceStrength: 'conflict',
            countsAsTechnicalEvidence: false,
            pendingClosure: false,
            needsCompatibleValidation: true,
            invalidBecauseOfExecutionOrCapture: false,
            summary: 'User outcome conflicts with strict compatible trend; require short validation before advancing.',
        };
    }

    switch (input.status) {
        case 'started':
            return {
                evidenceStrength: 'neutral',
                countsAsTechnicalEvidence: false,
                pendingClosure: true,
                needsCompatibleValidation: false,
                invalidBecauseOfExecutionOrCapture: false,
                summary: 'Protocol is in progress and does not count as technical evidence.',
            };
        case 'completed':
            return {
                evidenceStrength: 'neutral',
                countsAsTechnicalEvidence: false,
                pendingClosure: true,
                needsCompatibleValidation: true,
                invalidBecauseOfExecutionOrCapture: false,
                summary: 'Protocol was completed without a measured result; close the outcome before advancing.',
            };
        case 'improved':
            if (input.precisionTrend?.label === 'validated_progress') {
                return {
                    evidenceStrength: 'confirmed_by_compatible_clip',
                    countsAsTechnicalEvidence: true,
                    pendingClosure: false,
                    needsCompatibleValidation: false,
                    invalidBecauseOfExecutionOrCapture: false,
                    summary: 'Self-reported improvement is confirmed by strict compatible progress.',
                };
            }

            return {
                evidenceStrength: 'weak_self_report',
                countsAsTechnicalEvidence: false,
                pendingClosure: false,
                needsCompatibleValidation: true,
                invalidBecauseOfExecutionOrCapture: false,
                summary: 'Improvement is a useful self-report, but it needs a compatible validation clip.',
            };
        case 'unchanged':
            return {
                evidenceStrength: 'neutral',
                countsAsTechnicalEvidence: false,
                pendingClosure: false,
                needsCompatibleValidation: true,
                invalidBecauseOfExecutionOrCapture: false,
                summary: 'No measured change reported; keep validation conservative.',
            };
        case 'worse': {
            const reasonCodes = input.reasonCodes ?? [];
            const invalidBecauseOfExecutionOrCapture = reasonCodes.some((reason) => EXECUTION_OR_CAPTURE_REASON_CODES.has(reason));

            if (invalidBecauseOfExecutionOrCapture) {
                return {
                    evidenceStrength: 'invalid',
                    countsAsTechnicalEvidence: false,
                    pendingClosure: false,
                    needsCompatibleValidation: true,
                    invalidBecauseOfExecutionOrCapture: true,
                    summary: 'Worse outcome is tied to execution or capture friction and should not count against the protocol yet.',
                };
            }

            return {
                evidenceStrength: 'weak_self_report',
                countsAsTechnicalEvidence: false,
                pendingClosure: false,
                needsCompatibleValidation: true,
                invalidBecauseOfExecutionOrCapture: false,
                summary: 'Worse outcome is weak self-report until a compatible clip validates regression.',
            };
        }
        case 'invalid_capture':
            return {
                evidenceStrength: 'invalid',
                countsAsTechnicalEvidence: false,
                pendingClosure: false,
                needsCompatibleValidation: true,
                invalidBecauseOfExecutionOrCapture: true,
                summary: 'Invalid capture becomes learning for the next controlled validation, not protocol failure evidence.',
            };
    }
}

export function detectCoachOutcomePrecisionConflict(
    input: DetectCoachOutcomePrecisionConflictInput,
): CoachOutcomeConflict | null {
    const label = input.precisionTrend?.label;

    if (!label || !detectEvidenceConflict(input.status, label)) {
        return null;
    }

    const reason = input.status === 'improved'
        ? 'Self-report improved, but strict compatible precision validated regression.'
        : 'Self-report worsened, but strict compatible precision validated progress.';

    return {
        userOutcomeId: input.outcomeId,
        precisionTrendLabel: label,
        reason,
        nextValidationCopy: input.precisionTrend?.nextValidationHint
            ?? 'Record a short compatible validation before changing coach aggressiveness.',
    };
}

export function summarizeCoachOutcomeForMemory(
    outcome: CoachProtocolOutcome,
): CoachOutcomeMemorySummary {
    const evidence = resolveCoachOutcomeEvidence({
        status: outcome.status,
        reasonCodes: outcome.reasonCodes,
        precisionTrend: outcome.coachSnapshot?.precisionTrendLabel
            ? { label: outcome.coachSnapshot.precisionTrendLabel, evidenceLevel: 'strong' }
            : null,
    });

    return {
        outcomeId: outcome.id,
        protocolId: outcome.protocolId,
        focusArea: outcome.focusArea,
        status: outcome.status,
        evidenceStrength: outcome.conflict ? 'conflict' : evidence.evidenceStrength,
        countsAsTechnicalEvidence: !outcome.conflict && evidence.countsAsTechnicalEvidence,
        pendingClosure: evidence.pendingClosure,
        needsCompatibleValidation: outcome.conflict ? true : evidence.needsCompatibleValidation,
        failureMode: resolveFailureMode(outcome, evidence),
        summary: outcome.conflict?.reason ?? evidence.summary,
    };
}

function detectEvidenceConflict(
    status: CoachProtocolOutcomeStatus,
    label: PrecisionTrendLabel | undefined,
): boolean {
    return (status === 'improved' && label === 'validated_regression')
        || (status === 'worse' && label === 'validated_progress');
}

function resolveFailureMode(
    outcome: CoachProtocolOutcome,
    evidence: CoachOutcomeEvidenceResolution,
): CoachOutcomeMemorySummary['failureMode'] {
    if (outcome.conflict || evidence.evidenceStrength === 'conflict') {
        return 'conflict';
    }

    if (evidence.invalidBecauseOfExecutionOrCapture) {
        return 'execution_or_capture';
    }

    if (outcome.status === 'worse') {
        return 'protocol';
    }

    if (outcome.status === 'started' || outcome.status === 'completed' || outcome.status === 'unchanged') {
        return 'neutral';
    }

    return 'none';
}

function normalizeRequiredString(
    value: unknown,
    field: string,
    errors: string[],
): string | undefined {
    const normalized = normalizeOptionalString(value, field, errors);

    if (!normalized) {
        errors.push(`${field} is required.`);
    }

    return normalized;
}

function normalizeOptionalString(
    value: unknown,
    field: string,
    errors: string[],
): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (typeof value !== 'string') {
        errors.push(`${field} must be a string.`);
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeFocusArea(value: unknown, errors: string[]): CoachFocusArea | undefined {
    if (typeof value === 'string' && COACH_FOCUS_AREAS.has(value as CoachFocusArea)) {
        return value as CoachFocusArea;
    }

    errors.push('focusArea must be a known coach focus area.');
    return undefined;
}

function normalizeStatus(value: unknown, errors: string[]): CoachProtocolOutcomeStatus | undefined {
    if (isCoachProtocolOutcomeStatus(value)) {
        return value;
    }

    errors.push('status must be a known coach protocol outcome status.');
    return undefined;
}

function normalizeReasonCodes(value: unknown, errors: string[]): readonly CoachProtocolOutcomeReasonCode[] {
    if (value === undefined || value === null) {
        return [];
    }

    if (!Array.isArray(value)) {
        errors.push('reasonCodes must be an array.');
        return [];
    }

    const reasonCodes: CoachProtocolOutcomeReasonCode[] = [];

    for (const reason of value) {
        if (!isCoachProtocolOutcomeReasonCode(reason)) {
            errors.push('reasonCodes contains an unknown reason code.');
            continue;
        }

        if (!reasonCodes.includes(reason)) {
            reasonCodes.push(reason);
        }
    }

    return reasonCodes;
}

function normalizeNote(value: unknown, errors: string[]): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (typeof value !== 'string') {
        errors.push('note must be a string.');
        return undefined;
    }

    const trimmed = value.trim();

    if (trimmed.length > COACH_OUTCOME_NOTE_MAX_LENGTH) {
        errors.push(`note must be at most ${COACH_OUTCOME_NOTE_MAX_LENGTH} characters.`);
        return undefined;
    }

    return trimmed.length > 0 ? trimmed : undefined;
}

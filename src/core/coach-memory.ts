import type {
    AnalysisResult,
    CoachFocusArea,
    CoachSignal,
    PrecisionTrendSummary,
    ProfileType,
    SensitivityAcceptanceOutcome,
    WeaponLoadout,
} from '../types/engine';

export interface CoachMemoryHistorySession {
    readonly id: string;
    readonly createdAt: Date;
    readonly patchVersion?: string;
    readonly distance?: number;
    readonly loadout?: WeaponLoadout;
    readonly fullResult: Record<string, unknown> | null;
}

export interface CoachMemoryFocusRecurrence {
    readonly area: CoachFocusArea;
    readonly count: number;
    readonly supportRatio: number;
    readonly sessionIds: readonly string[];
}

export interface CoachMemorySnapshot {
    readonly compatibleSessionCount: number;
    readonly precisionTrend?: CoachMemoryPrecisionTrend;
    readonly recurrentFocuses: readonly CoachMemoryFocusRecurrence[];
    readonly alignedFocusAreas: readonly CoachFocusArea[];
    readonly conflictingFocusAreas: readonly CoachFocusArea[];
    readonly signals: readonly CoachSignal[];
    readonly summary: string;
}

export interface CoachMemoryPrecisionTrend {
    readonly label: PrecisionTrendSummary['label'];
    readonly evidenceLevel: PrecisionTrendSummary['evidenceLevel'];
    readonly compatibleCount: number;
    readonly actionableDelta: number | null;
    readonly blockerReasons: readonly string[];
    readonly nextValidationHint: string;
}

export interface BuildCoachMemorySnapshotInput {
    readonly currentResult: AnalysisResult;
    readonly historySessions: readonly CoachMemoryHistorySession[];
    readonly distanceToleranceMeters?: number;
}

interface SensitivityOutcomeSignal {
    readonly outcome: SensitivityAcceptanceOutcome;
    readonly testedProfile: ProfileType;
}

export function buildCoachMemorySnapshot(
    input: BuildCoachMemorySnapshotInput,
): CoachMemorySnapshot {
    const compatibleSessions = input.historySessions.filter((session) => (
        isCompatibleHistorySession(input.currentResult, session, input.distanceToleranceMeters)
    ));
    const recurrentFocuses = buildRecurrentFocuses(compatibleSessions);
    const sensitivitySignals = buildSensitivityOutcomeSignals(input.currentResult, compatibleSessions);
    const precisionTrend = buildPrecisionTrendMemory(input.currentResult.precisionTrend);
    const precisionSignals = buildPrecisionTrendSignals(precisionTrend);
    const alignedFocusAreas = collectAlignedFocusAreas(recurrentFocuses, sensitivitySignals, precisionTrend);
    const conflictingFocusAreas = Array.from(new Set<CoachFocusArea>([
        ...(sensitivitySignals.hasConflict ? ['sensitivity' as const] : []),
        ...conflictingAreasFromPrecisionTrend(precisionTrend),
    ]));
    const signals = [
        ...recurrentFocuses.map(toRecurrentFocusSignal),
        ...sensitivitySignals.signals,
        ...precisionSignals,
    ];

    return {
        compatibleSessionCount: compatibleSessions.length,
        ...(precisionTrend ? { precisionTrend } : {}),
        recurrentFocuses,
        alignedFocusAreas,
        conflictingFocusAreas,
        signals,
        summary: summarizeMemory(compatibleSessions.length, recurrentFocuses, conflictingFocusAreas, precisionTrend),
    };
}

export function extractCoachMemorySignals(
    snapshot: CoachMemorySnapshot | undefined,
): readonly CoachSignal[] {
    return snapshot?.signals ?? [];
}

function isCompatibleHistorySession(
    currentResult: AnalysisResult,
    session: CoachMemoryHistorySession,
    distanceToleranceMeters: number | undefined,
): boolean {
    if (session.fullResult === null) {
        return false;
    }

    const sessionPatch = session.patchVersion ?? readString(session.fullResult, 'patchVersion');
    if (sessionPatch && sessionPatch !== currentResult.patchVersion) {
        return false;
    }

    const sessionLoadout = session.loadout ?? readLoadout(session.fullResult);
    if (sessionLoadout && !sameLoadout(currentResult.loadout, sessionLoadout)) {
        return false;
    }

    const currentDistance = resolveResultDistance(currentResult);
    const sessionDistance = session.distance
        ?? readNestedNumber(session.fullResult, ['metrics', 'targetDistanceMeters'])
        ?? readNestedNumber(session.fullResult, ['analysisContext', 'targetDistanceMeters']);

    if (typeof currentDistance === 'number' && typeof sessionDistance === 'number') {
        const tolerance = distanceToleranceMeters ?? resolveDistanceTolerance(currentDistance);
        return Math.abs(currentDistance - sessionDistance) <= tolerance;
    }

    return true;
}

function buildRecurrentFocuses(
    sessions: readonly CoachMemoryHistorySession[],
): readonly CoachMemoryFocusRecurrence[] {
    const counts = new Map<CoachFocusArea, string[]>();

    for (const session of sessions) {
        const area = readPrimaryFocusArea(session.fullResult);
        if (!area) {
            continue;
        }

        counts.set(area, [...(counts.get(area) ?? []), session.id]);
    }

    return Array.from(counts.entries())
        .filter(([, sessionIds]) => sessionIds.length >= 2)
        .map(([area, sessionIds]) => ({
            area,
            count: sessionIds.length,
            supportRatio: roundScore(sessionIds.length / Math.max(1, sessions.length)),
            sessionIds,
        }))
        .sort((left, right) => right.count - left.count);
}

function buildSensitivityOutcomeSignals(
    currentResult: AnalysisResult,
    sessions: readonly CoachMemoryHistorySession[],
): {
    readonly hasConflict: boolean;
    readonly signals: readonly CoachSignal[];
} {
    const currentProfile = currentResult.sensitivity.recommended;
    const outcomes = sessions
        .map(readSensitivityOutcome)
        .filter((outcome): outcome is SensitivityOutcomeSignal => (
            outcome !== undefined
            && outcome.testedProfile === currentProfile
        ));

    if (outcomes.length === 0) {
        return { hasConflict: false, signals: [] };
    }

    const worseCount = outcomes.filter((outcome) => outcome.outcome === 'worse').length;
    const alignedCount = outcomes.filter((outcome) => outcome.outcome === 'improved' || outcome.outcome === 'same').length;
    const coverage = roundScore(Math.min(1, outcomes.length / 3));

    if (worseCount > alignedCount) {
        return {
            hasConflict: true,
            signals: [{
                source: 'history',
                area: 'sensitivity',
                key: 'history.conflict.sensitivity',
                summary: `Compatible history marked ${currentProfile} sensitivity as worse in ${worseCount} prior block(s).`,
                confidence: 1,
                coverage: Math.max(coverage, 0.8),
                weight: 1,
            }],
        };
    }

    if (alignedCount > worseCount) {
        return {
            hasConflict: false,
            signals: [{
                source: 'history',
                area: 'sensitivity',
                key: 'history.aligned.sensitivity',
                summary: `Compatible history supports ${currentProfile} sensitivity in ${alignedCount} prior block(s).`,
                confidence: 0.94,
                coverage: Math.max(coverage, 0.65),
                weight: 0.35,
            }],
        };
    }

    return { hasConflict: false, signals: [] };
}

function collectAlignedFocusAreas(
    recurrentFocuses: readonly CoachMemoryFocusRecurrence[],
    sensitivitySignals: { readonly signals: readonly CoachSignal[] },
    precisionTrend: CoachMemoryPrecisionTrend | undefined,
): readonly CoachFocusArea[] {
    const areas = new Set<CoachFocusArea>();

    for (const focus of recurrentFocuses) {
        areas.add(focus.area);
    }

    if (sensitivitySignals.signals.some((signal) => signal.key === 'history.aligned.sensitivity')) {
        areas.add('sensitivity');
    }

    if (precisionTrend?.label === 'validated_progress') {
        areas.add('validation');
    }

    return Array.from(areas);
}

function buildPrecisionTrendMemory(
    trend: PrecisionTrendSummary | undefined,
): CoachMemoryPrecisionTrend | undefined {
    if (!trend) {
        return undefined;
    }

    return {
        label: trend.label,
        evidenceLevel: trend.evidenceLevel,
        compatibleCount: trend.compatibleCount,
        actionableDelta: trend.actionableDelta?.delta ?? null,
        blockerReasons: trend.blockerSummaries.map((summary) => summary.message),
        nextValidationHint: trend.nextValidationHint,
    };
}

function buildPrecisionTrendSignals(
    precisionTrend: CoachMemoryPrecisionTrend | undefined,
): readonly CoachSignal[] {
    if (!precisionTrend) {
        return [];
    }

    switch (precisionTrend.label) {
        case 'baseline':
        case 'initial_signal':
            return [precisionSignal({
                key: `precision.${precisionTrend.label}`,
                area: 'validation',
                summary: `Strict precision line has ${precisionTrend.compatibleCount} compatible clip(s); keep validating before consolidation.`,
                confidence: 0.72,
                coverage: Math.min(1, precisionTrend.compatibleCount / 3),
                weight: 0.28,
            })];
        case 'validated_progress':
            return [precisionSignal({
                key: 'precision.validated_progress',
                area: 'validation',
                summary: 'Strict precision trend validated progress; consolidate this context before changing another variable.',
                confidence: 0.9,
                coverage: 1,
                weight: 0.4,
            })];
        case 'validated_regression':
            return [precisionSignal({
                key: 'precision.validated_regression',
                area: 'validation',
                summary: 'Strict precision trend validated regression; return to the last reliable baseline and validate again.',
                confidence: 0.92,
                coverage: 1,
                weight: 0.55,
            })];
        case 'oscillation':
            return [precisionSignal({
                key: 'precision.oscillation',
                area: 'validation',
                summary: 'Strict precision trend is oscillating inside the decision band; avoid aggressive changes until another compatible clip confirms direction.',
                confidence: 0.82,
                coverage: Math.min(1, precisionTrend.compatibleCount / 3),
                weight: 0.45,
            })];
        case 'not_comparable':
            return [precisionSignal({
                key: 'precision.not_comparable',
                area: precisionTrend.blockerReasons.some((reason) => reason.toLowerCase().includes('captura'))
                    ? 'capture_quality'
                    : 'validation',
                summary: `Strict precision trend is blocked: ${precisionTrend.blockerReasons[0] ?? precisionTrend.nextValidationHint}`,
                confidence: 0.8,
                coverage: 0.4,
                weight: 0.5,
            })];
        case 'in_validation':
            return [precisionSignal({
                key: 'precision.in_validation',
                area: 'validation',
                summary: 'Strict precision evidence is not strong enough for validated progress; complete another compatible validation.',
                confidence: 0.78,
                coverage: Math.min(1, precisionTrend.compatibleCount / 3),
                weight: 0.38,
            })];
        case 'consolidated':
            return [precisionSignal({
                key: 'precision.consolidated',
                area: 'validation',
                summary: 'Strict precision line is consolidated; choose the next variable from measured evidence.',
                confidence: 0.88,
                coverage: 1,
                weight: 0.35,
            })];
    }
}

function precisionSignal(input: {
    readonly key: string;
    readonly area: CoachFocusArea;
    readonly summary: string;
    readonly confidence: number;
    readonly coverage: number;
    readonly weight: number;
}): CoachSignal {
    return {
        source: 'history',
        area: input.area,
        key: input.key,
        summary: input.summary,
        confidence: input.confidence,
        coverage: input.coverage,
        weight: input.weight,
    };
}

function conflictingAreasFromPrecisionTrend(
    precisionTrend: CoachMemoryPrecisionTrend | undefined,
): readonly CoachFocusArea[] {
    if (
        precisionTrend?.label === 'validated_regression'
        || precisionTrend?.label === 'oscillation'
        || precisionTrend?.label === 'not_comparable'
    ) {
        return ['sensitivity'];
    }

    return [];
}

function toRecurrentFocusSignal(focus: CoachMemoryFocusRecurrence): CoachSignal {
    return {
        source: 'history',
        area: focus.area,
        key: `history.aligned.${focus.area}`,
        summary: `${focus.area.replace(/_/g, ' ')} recurred in ${focus.count} compatible prior session(s).`,
        confidence: roundScore(0.76 + (0.18 * focus.supportRatio)),
        coverage: roundScore(Math.min(1, focus.count / 3)),
        weight: 0.35,
    };
}

function summarizeMemory(
    compatibleSessionCount: number,
    recurrentFocuses: readonly CoachMemoryFocusRecurrence[],
    conflictingFocusAreas: readonly CoachFocusArea[],
    precisionTrend: CoachMemoryPrecisionTrend | undefined,
): string {
    if (precisionTrend) {
        return `Precision trend ${precisionTrend.label} with ${precisionTrend.compatibleCount} compatible clip(s): ${precisionTrend.nextValidationHint}`;
    }

    if (compatibleSessionCount === 0) {
        return 'No compatible coach memory available.';
    }

    if (conflictingFocusAreas.length > 0) {
        return `Coach memory found conflict in ${conflictingFocusAreas.join(', ')} across ${compatibleSessionCount} compatible session(s).`;
    }

    if (recurrentFocuses.length > 0) {
        return `Coach memory found recurring focus ${recurrentFocuses[0]!.area} across ${compatibleSessionCount} compatible session(s).`;
    }

    return `Coach memory found ${compatibleSessionCount} compatible session(s) without a dominant recurrence.`;
}

function readPrimaryFocusArea(fullResult: Record<string, unknown> | null): CoachFocusArea | undefined {
    const area = readNestedString(fullResult, ['coachPlan', 'primaryFocus', 'area']);
    return isCoachFocusArea(area) ? area : undefined;
}

function readSensitivityOutcome(
    session: CoachMemoryHistorySession,
): SensitivityOutcomeSignal | undefined {
    const feedback = readNestedObject(session.fullResult, ['sensitivity', 'acceptanceFeedback']);
    if (!feedback) {
        return undefined;
    }

    const testedProfile = feedback.testedProfile;
    const outcome = feedback.outcome;

    if (!isProfileType(testedProfile) || !isSensitivityAcceptanceOutcome(outcome)) {
        return undefined;
    }

    return {
        testedProfile,
        outcome,
    };
}

function readLoadout(fullResult: Record<string, unknown> | null): WeaponLoadout | undefined {
    const loadout = readNestedObject(fullResult, ['loadout']);
    if (!loadout) {
        return undefined;
    }

    const stance = loadout.stance;
    const muzzle = loadout.muzzle;
    const grip = loadout.grip;
    const stock = loadout.stock;

    if (
        typeof stance !== 'string'
        || typeof muzzle !== 'string'
        || typeof grip !== 'string'
        || typeof stock !== 'string'
    ) {
        return undefined;
    }

    return { stance, muzzle, grip, stock } as WeaponLoadout;
}

function sameLoadout(left: WeaponLoadout, right: WeaponLoadout): boolean {
    return left.stance === right.stance
        && left.muzzle === right.muzzle
        && left.grip === right.grip
        && left.stock === right.stock;
}

function resolveResultDistance(result: AnalysisResult): number | undefined {
    return result.analysisContext?.targetDistanceMeters ?? result.metrics.targetDistanceMeters;
}

function resolveDistanceTolerance(distanceMeters: number): number {
    if (distanceMeters <= 35) {
        return 10;
    }

    if (distanceMeters <= 80) {
        return 15;
    }

    return 25;
}

function readString(value: Record<string, unknown> | null, key: string): string | undefined {
    const property = value?.[key];
    return typeof property === 'string' ? property : undefined;
}

function readNestedString(
    value: Record<string, unknown> | null,
    path: readonly string[],
): string | undefined {
    const property = readNestedValue(value, path);
    return typeof property === 'string' ? property : undefined;
}

function readNestedNumber(
    value: Record<string, unknown> | null,
    path: readonly string[],
): number | undefined {
    const property = readNestedValue(value, path);
    return typeof property === 'number' ? property : undefined;
}

function readNestedObject(
    value: Record<string, unknown> | null,
    path: readonly string[],
): Record<string, unknown> | undefined {
    const property = readNestedValue(value, path);
    return property && typeof property === 'object' && !Array.isArray(property)
        ? property as Record<string, unknown>
        : undefined;
}

function readNestedValue(
    value: Record<string, unknown> | null,
    path: readonly string[],
): unknown {
    let current: unknown = value;

    for (const key of path) {
        if (!current || typeof current !== 'object' || Array.isArray(current)) {
            return undefined;
        }

        current = (current as Record<string, unknown>)[key];
    }

    return current;
}

function isCoachFocusArea(value: string | undefined): value is CoachFocusArea {
    return value === 'capture_quality'
        || value === 'vertical_control'
        || value === 'horizontal_control'
        || value === 'timing'
        || value === 'consistency'
        || value === 'sensitivity'
        || value === 'loadout'
        || value === 'validation';
}

function isProfileType(value: unknown): value is ProfileType {
    return value === 'low' || value === 'balanced' || value === 'high';
}

function isSensitivityAcceptanceOutcome(value: unknown): value is SensitivityAcceptanceOutcome {
    return value === 'improved' || value === 'same' || value === 'worse';
}

function roundScore(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Number(value.toFixed(3));
}

import type {
    AnalysisResult,
    CoachFocusArea,
    CoachSignal,
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
    readonly recurrentFocuses: readonly CoachMemoryFocusRecurrence[];
    readonly alignedFocusAreas: readonly CoachFocusArea[];
    readonly conflictingFocusAreas: readonly CoachFocusArea[];
    readonly signals: readonly CoachSignal[];
    readonly summary: string;
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
    const alignedFocusAreas = collectAlignedFocusAreas(recurrentFocuses, sensitivitySignals);
    const conflictingFocusAreas = sensitivitySignals.hasConflict ? ['sensitivity' as const] : [];
    const signals = [
        ...recurrentFocuses.map(toRecurrentFocusSignal),
        ...sensitivitySignals.signals,
    ];

    return {
        compatibleSessionCount: compatibleSessions.length,
        recurrentFocuses,
        alignedFocusAreas,
        conflictingFocusAreas,
        signals,
        summary: summarizeMemory(compatibleSessions.length, recurrentFocuses, conflictingFocusAreas),
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
): readonly CoachFocusArea[] {
    const areas = new Set<CoachFocusArea>();

    for (const focus of recurrentFocuses) {
        areas.add(focus.area);
    }

    if (sensitivitySignals.signals.some((signal) => signal.key === 'history.aligned.sensitivity')) {
        areas.add('sensitivity');
    }

    return Array.from(areas);
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
): string {
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

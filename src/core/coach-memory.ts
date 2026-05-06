import type {
    AnalysisResult,
    CoachFocusArea,
    CoachOutcomeMemoryLayerSource,
    CoachOutcomeMemoryLayerSummary,
    CoachOutcomeMemorySummary,
    CoachProtocolOutcome,
    CoachSignal,
    PrecisionTrendSummary,
    ProfileType,
    SensitivityAcceptanceOutcome,
    WeaponLoadout,
} from '../types/engine';
import {
    summarizeCoachOutcomeForMemory,
    type CoachOutcomeMemorySummary as CoachOutcomeRecordSummary,
} from './coach-outcomes';

export const COACH_OUTCOME_MEMORY_WINDOW_DAYS = 30;
const COACH_OUTCOME_STRICT_RECENT_SESSION_LIMIT = 6;
const COACH_OUTCOME_GLOBAL_RECENT_LIMIT = 12;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
    readonly outcomeMemory: CoachOutcomeMemorySummary;
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
    readonly protocolOutcomes?: readonly CoachProtocolOutcome[];
    readonly distanceToleranceMeters?: number;
}

interface SensitivityOutcomeSignal {
    readonly outcome: SensitivityAcceptanceOutcome;
    readonly testedProfile: ProfileType;
}

interface CoachOutcomeMemoryEntry {
    readonly outcome: CoachProtocolOutcome;
    readonly summary: CoachOutcomeRecordSummary;
    readonly sessionId: string;
    readonly recordedAtMs: number;
    readonly stale: boolean;
}

interface CoachOutcomeMemoryLayerDetail extends CoachOutcomeMemoryLayerSummary {
    readonly entries: readonly CoachOutcomeMemoryEntry[];
    readonly staleEntries: readonly CoachOutcomeMemoryEntry[];
}

interface CoachOutcomeMemoryDetails extends CoachOutcomeMemorySummary {
    readonly strictCompatible: CoachOutcomeMemoryLayerDetail;
    readonly globalFallback: CoachOutcomeMemoryLayerDetail;
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
    const outcomeMemory = buildOutcomeMemory({
        currentResult: input.currentResult,
        compatibleSessions,
        protocolOutcomes: input.protocolOutcomes ?? [],
    });
    const outcomeSignals = buildOutcomeMemorySignals(outcomeMemory);
    const alignedFocusAreas = collectAlignedFocusAreas(
        recurrentFocuses,
        sensitivitySignals,
        precisionTrend,
        outcomeSignals,
    );
    const conflictingFocusAreas = Array.from(new Set<CoachFocusArea>([
        ...(sensitivitySignals.hasConflict ? ['sensitivity' as const] : []),
        ...conflictingAreasFromPrecisionTrend(precisionTrend),
        ...conflictingAreasFromOutcomeSignals(outcomeSignals),
    ]));
    const signals = [
        ...recurrentFocuses.map(toRecurrentFocusSignal),
        ...sensitivitySignals.signals,
        ...precisionSignals,
        ...outcomeSignals,
    ];

    return {
        compatibleSessionCount: compatibleSessions.length,
        ...(precisionTrend ? { precisionTrend } : {}),
        outcomeMemory,
        recurrentFocuses,
        alignedFocusAreas,
        conflictingFocusAreas,
        signals,
        summary: summarizeMemory(
            compatibleSessions.length,
            recurrentFocuses,
            conflictingFocusAreas,
            precisionTrend,
            outcomeMemory,
        ),
    };
}

export function extractCoachMemorySignals(
    snapshot: CoachMemorySnapshot | undefined,
): readonly CoachSignal[] {
    return snapshot?.signals ?? [];
}

function buildOutcomeMemory(input: {
    readonly currentResult: AnalysisResult;
    readonly compatibleSessions: readonly CoachMemoryHistorySession[];
    readonly protocolOutcomes: readonly CoachProtocolOutcome[];
}): CoachOutcomeMemoryDetails {
    const currentTimestampMs = input.currentResult.timestamp.getTime();
    const compatibleSessionIds = new Set(
        [...input.compatibleSessions]
            .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
            .slice(0, COACH_OUTCOME_STRICT_RECENT_SESSION_LIMIT)
            .map((session) => session.id),
    );
    const effectiveEntries = toEffectiveProtocolOutcomes(input.protocolOutcomes)
        .map((outcome) => toOutcomeMemoryEntry(outcome, currentTimestampMs))
        .sort((left, right) => right.recordedAtMs - left.recordedAtMs);
    const strictCompatible = buildOutcomeMemoryLayer(
        'strict_compatible',
        effectiveEntries.filter((entry) => compatibleSessionIds.has(entry.sessionId)),
    );
    const globalFallback = buildOutcomeMemoryLayer(
        'global_fallback',
        effectiveEntries.slice(0, COACH_OUTCOME_GLOBAL_RECENT_LIMIT),
    );
    const activeLayer: CoachOutcomeMemorySummary['activeLayer'] = strictCompatible.outcomeCount > 0
        ? 'strict_compatible'
        : globalFallback.outcomeCount > 0
            ? 'global_fallback'
            : 'none';
    const activeSummary = activeLayer === 'strict_compatible'
        ? strictCompatible
        : activeLayer === 'global_fallback'
            ? globalFallback
            : undefined;
    const staleOutcomeCount = activeSummary?.staleOutcomeCount
        ?? Math.max(strictCompatible.staleOutcomeCount, globalFallback.staleOutcomeCount);

    return {
        activeLayer,
        strictCompatible,
        globalFallback,
        pendingCount: activeSummary?.pendingCount ?? 0,
        neutralCount: activeSummary?.neutralCount ?? 0,
        confirmedCount: activeSummary?.confirmedCount ?? 0,
        invalidCount: activeSummary?.invalidCount ?? 0,
        conflictCount: activeSummary?.conflictCount ?? 0,
        repeatedFailureCount: activeSummary?.repeatedFailureCount ?? 0,
        staleOutcomeCount,
        confidence: activeSummary?.confidence ?? 0,
        summary: summarizeOutcomeMemory(activeLayer, activeSummary, staleOutcomeCount),
    };
}

function toEffectiveProtocolOutcomes(
    outcomes: readonly CoachProtocolOutcome[],
): readonly CoachProtocolOutcome[] {
    const revisedOutcomeIds = new Set<string>();

    for (const outcome of outcomes) {
        if (outcome.revisionOfOutcomeId) {
            revisedOutcomeIds.add(outcome.revisionOfOutcomeId);
        }
    }

    return outcomes.filter((outcome) => !revisedOutcomeIds.has(outcome.id));
}

function toOutcomeMemoryEntry(
    outcome: CoachProtocolOutcome,
    currentTimestampMs: number,
): CoachOutcomeMemoryEntry {
    const recordedAtMs = Date.parse(outcome.recordedAt);
    const finiteRecordedAtMs = Number.isFinite(recordedAtMs) ? recordedAtMs : 0;
    const ageDays = (currentTimestampMs - finiteRecordedAtMs) / MS_PER_DAY;

    return {
        outcome,
        summary: summarizeCoachOutcomeForMemory(outcome),
        sessionId: outcome.sessionId,
        recordedAtMs: finiteRecordedAtMs,
        stale: !Number.isFinite(recordedAtMs)
            || ageDays > COACH_OUTCOME_MEMORY_WINDOW_DAYS,
    };
}

function buildOutcomeMemoryLayer(
    source: CoachOutcomeMemoryLayerSource,
    entries: readonly CoachOutcomeMemoryEntry[],
): CoachOutcomeMemoryLayerDetail {
    const staleEntries = entries.filter((entry) => entry.stale);
    const activeEntries = entries.filter((entry) => !entry.stale);
    const summaries = activeEntries.map((entry) => entry.summary);
    const protocolFailures = summaries.filter((summary) => summary.failureMode === 'protocol');
    const repeatedFailureCount = countRepeatedFailures(protocolFailures);
    const conflictCount = summaries.filter((summary) => summary.failureMode === 'conflict' || summary.evidenceStrength === 'conflict').length;
    const invalidCount = summaries.filter((summary) => (
        summary.failureMode === 'execution_or_capture'
        || summary.evidenceStrength === 'invalid'
    )).length;
    const pendingCount = summaries.filter((summary) => summary.pendingClosure).length;
    const neutralCount = summaries.filter((summary) => summary.evidenceStrength === 'neutral').length;
    const weakSelfReportCount = summaries.filter((summary) => summary.evidenceStrength === 'weak_self_report').length;
    const confirmedCount = summaries.filter((summary) => summary.evidenceStrength === 'confirmed_by_compatible_clip').length;
    const technicalEvidenceCount = summaries.filter((summary) => summary.countsAsTechnicalEvidence).length;
    const focusAreas = uniqueFocusAreas(summaries.map((summary) => summary.focusArea));

    return {
        source,
        outcomeCount: activeEntries.length,
        pendingCount,
        neutralCount,
        weakSelfReportCount,
        confirmedCount,
        invalidCount,
        conflictCount,
        repeatedFailureCount,
        staleOutcomeCount: staleEntries.length,
        technicalEvidenceCount,
        focusAreas,
        confidence: calculateOutcomeMemoryConfidence({
            outcomeCount: activeEntries.length,
            confirmedCount,
            conflictCount,
            pendingCount,
            neutralCount,
            staleOutcomeCount: staleEntries.length,
        }),
        summary: summarizeOutcomeLayer(source, activeEntries.length, staleEntries.length, {
            confirmedCount,
            conflictCount,
            invalidCount,
            repeatedFailureCount,
            pendingCount,
            neutralCount,
        }),
        entries: activeEntries,
        staleEntries,
    };
}

function buildOutcomeMemorySignals(
    outcomeMemory: CoachOutcomeMemoryDetails,
): readonly CoachSignal[] {
    const activeLayer = outcomeMemory.activeLayer === 'strict_compatible'
        ? outcomeMemory.strictCompatible
        : outcomeMemory.activeLayer === 'global_fallback'
            ? outcomeMemory.globalFallback
            : undefined;

    if (!activeLayer) {
        return outcomeMemory.staleOutcomeCount > 0
            ? [outcomeLayerSignal({
                source: 'strict_compatible',
                area: 'validation',
                key: 'outcome.strict_compatible.stale',
                summary: `${outcomeMemory.staleOutcomeCount} older coach outcome(s) were downweighted because they are outside the ${COACH_OUTCOME_MEMORY_WINDOW_DAYS}-day memory window.`,
                confidence: 0.42,
                coverage: 0.25,
                weight: 0.12,
            })]
            : [];
    }

    const signals: CoachSignal[] = [];
    const layerKey = activeLayer.source;
    const coverage = Math.min(1, Math.max(0.25, activeLayer.outcomeCount / 3));

    if (activeLayer.pendingCount > 0 || activeLayer.neutralCount > 0) {
        signals.push(outcomeLayerSignal({
            source: layerKey,
            area: 'validation',
            key: `outcome.${layerKey}.pending`,
            summary: `${activeLayer.pendingCount || activeLayer.neutralCount} coach outcome(s) are neutral or still need closure; keep the next block in validation mode.`,
            confidence: Math.max(0.58, activeLayer.confidence),
            coverage,
            weight: 0.24,
        }));
    }

    for (const [area, entries] of groupOutcomeEntries(activeLayer.entries, (entry) => (
        entry.summary.status === 'improved'
        && entry.summary.evidenceStrength === 'weak_self_report'
    ))) {
        signals.push(outcomeLayerSignal({
            source: layerKey,
            area,
            key: `outcome.${layerKey}.weak_self_report.${area}`,
            summary: `${entries.length} improvement report(s) for ${area.replace(/_/g, ' ')} still need strict compatible validation before a stronger coach action.`,
            confidence: 0.62,
            coverage,
            weight: 0.16,
        }));
    }

    for (const [area, entries] of groupOutcomeEntries(activeLayer.entries, (entry) => (
        entry.summary.evidenceStrength === 'confirmed_by_compatible_clip'
    ))) {
        signals.push(outcomeLayerSignal({
            source: layerKey,
            area,
            key: `outcome.${layerKey}.confirmed.${area}`,
            summary: `${entries.length} outcome(s) for ${area.replace(/_/g, ' ')} were confirmed by compatible progress; consolidate before changing another variable.`,
            confidence: 0.88,
            coverage,
            weight: 0.34,
        }));
    }

    for (const [area, entries] of groupOutcomeEntries(activeLayer.entries, (entry) => (
        entry.summary.failureMode === 'conflict'
        || entry.summary.evidenceStrength === 'conflict'
    ))) {
        signals.push(outcomeLayerSignal({
            source: layerKey,
            area,
            key: `outcome.${layerKey}.conflict.${area}`,
            summary: `${entries.length} coach outcome conflict(s) for ${area.replace(/_/g, ' ')} block aggressive action until a short compatible validation resolves the disagreement.`,
            confidence: 0.9,
            coverage,
            weight: 0.58,
        }));
    }

    for (const [area, entries] of groupOutcomeEntries(activeLayer.entries, (entry) => (
        entry.summary.failureMode === 'protocol'
    ))) {
        signals.push(outcomeLayerSignal({
            source: layerKey,
            area,
            key: entries.length >= 2
                ? `outcome.${layerKey}.repeated_failure.${area}`
                : `outcome.${layerKey}.failure.${area}`,
            summary: entries.length >= 2
                ? `${entries.length} failure reports for ${area.replace(/_/g, ' ')} require a revised hypothesis before repeating the protocol.`
                : `A worse report for ${area.replace(/_/g, ' ')} keeps the next protocol conservative until compatible validation confirms the cause.`,
            confidence: entries.length >= 2 ? 0.86 : 0.72,
            coverage,
            weight: entries.length >= 2 ? 0.52 : 0.36,
        }));
    }

    const invalidEntries = activeLayer.entries.filter((entry) => entry.summary.failureMode === 'execution_or_capture');
    if (invalidEntries.length > 0) {
        signals.push(outcomeLayerSignal({
            source: layerKey,
            area: 'capture_quality',
            key: `outcome.${layerKey}.invalid_capture`,
            summary: `${invalidEntries.length} invalid capture/execution outcome(s) are treated as validation friction, not proof the protocol failed.`,
            confidence: 0.78,
            coverage,
            weight: 0.32,
        }));
    }

    if (activeLayer.staleOutcomeCount > 0) {
        signals.push(outcomeLayerSignal({
            source: layerKey,
            area: 'validation',
            key: `outcome.${layerKey}.stale`,
            summary: `${activeLayer.staleOutcomeCount} stale outcome(s) were kept out of active coach memory.`,
            confidence: 0.48,
            coverage: 0.3,
            weight: 0.12,
        }));
    }

    return signals;
}

function countRepeatedFailures(
    summaries: readonly CoachOutcomeRecordSummary[],
): number {
    const failuresByFocus = new Map<CoachFocusArea, number>();

    for (const summary of summaries) {
        failuresByFocus.set(summary.focusArea, (failuresByFocus.get(summary.focusArea) ?? 0) + 1);
    }

    return Array.from(failuresByFocus.values())
        .filter((count) => count >= 2)
        .reduce((total, count) => total + count, 0);
}

function uniqueFocusAreas(areas: readonly CoachFocusArea[]): readonly CoachFocusArea[] {
    return Array.from(new Set(areas));
}

function calculateOutcomeMemoryConfidence(input: {
    readonly outcomeCount: number;
    readonly confirmedCount: number;
    readonly conflictCount: number;
    readonly pendingCount: number;
    readonly neutralCount: number;
    readonly staleOutcomeCount: number;
}): number {
    if (input.outcomeCount === 0) {
        return 0;
    }

    const base = 0.28 + (0.42 * Math.min(1, input.outcomeCount / 3));
    const confirmedBoost = input.confirmedCount > 0 ? 0.18 : 0;
    const conflictPenalty = input.conflictCount > 0 ? 0.18 : 0;
    const neutralPenalty = Math.min(0.18, (input.pendingCount + input.neutralCount) * 0.04);
    const stalePenalty = Math.min(0.12, input.staleOutcomeCount * 0.03);

    return roundScore(Math.max(0.15, Math.min(1, base + confirmedBoost - conflictPenalty - neutralPenalty - stalePenalty)));
}

function summarizeOutcomeMemory(
    activeLayer: CoachOutcomeMemorySummary['activeLayer'],
    activeSummary: CoachOutcomeMemoryLayerDetail | undefined,
    staleOutcomeCount: number,
): string {
    if (!activeSummary || activeLayer === 'none') {
        return staleOutcomeCount > 0
            ? `Only stale coach outcomes were found; they are outside the ${COACH_OUTCOME_MEMORY_WINDOW_DAYS}-day memory window.`
            : 'No coach protocol outcome memory available.';
    }

    const source = activeLayer === 'strict_compatible'
        ? 'Strict compatible'
        : 'Global fallback';

    return `${source} outcome memory: ${activeSummary.summary}`;
}

function summarizeOutcomeLayer(
    source: CoachOutcomeMemoryLayerSource,
    outcomeCount: number,
    staleOutcomeCount: number,
    counts: {
        readonly confirmedCount: number;
        readonly conflictCount: number;
        readonly invalidCount: number;
        readonly repeatedFailureCount: number;
        readonly pendingCount: number;
        readonly neutralCount: number;
    },
): string {
    if (outcomeCount === 0) {
        return staleOutcomeCount > 0
            ? `${staleOutcomeCount} stale outcome(s) ignored for ${source} memory.`
            : `No ${source} outcome memory.`;
    }

    if (counts.conflictCount > 0) {
        return `${counts.conflictCount} conflict outcome(s) require compatible validation before advancing.`;
    }

    if (counts.repeatedFailureCount > 0) {
        return `${counts.repeatedFailureCount} repeated failure outcome(s) require a revised hypothesis.`;
    }

    if (counts.confirmedCount > 0) {
        return `${counts.confirmedCount} outcome(s) confirmed by compatible progress; consolidate before changing variables.`;
    }

    if (counts.invalidCount > 0) {
        return `${counts.invalidCount} invalid capture/execution outcome(s) are validation friction, not protocol proof.`;
    }

    if (counts.pendingCount > 0 || counts.neutralCount > 0) {
        return `${counts.pendingCount || counts.neutralCount} neutral/pending outcome(s) need closure before stronger coach memory.`;
    }

    return `${outcomeCount} outcome(s) available for conservative coach memory.`;
}

function groupOutcomeEntries(
    entries: readonly CoachOutcomeMemoryEntry[],
    predicate: (entry: CoachOutcomeMemoryEntry) => boolean,
): Map<CoachFocusArea, CoachOutcomeMemoryEntry[]> {
    const grouped = new Map<CoachFocusArea, CoachOutcomeMemoryEntry[]>();

    for (const entry of entries) {
        if (!predicate(entry)) {
            continue;
        }

        grouped.set(entry.summary.focusArea, [
            ...(grouped.get(entry.summary.focusArea) ?? []),
            entry,
        ]);
    }

    return grouped;
}

function outcomeLayerSignal(input: {
    readonly source: CoachOutcomeMemoryLayerSource;
    readonly area: CoachFocusArea;
    readonly key: string;
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
    outcomeSignals: readonly CoachSignal[],
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

    for (const signal of outcomeSignals) {
        if (signal.key.includes('.confirmed.')) {
            areas.add(signal.area);
        }
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

function conflictingAreasFromOutcomeSignals(
    signals: readonly CoachSignal[],
): readonly CoachFocusArea[] {
    return uniqueFocusAreas(signals
        .filter((signal) => (
            signal.key.includes('.conflict.')
            || signal.key.includes('.repeated_failure.')
            || signal.key.includes('.failure.')
        ))
        .map((signal) => signal.area));
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
    outcomeMemory: CoachOutcomeMemorySummary,
): string {
    if (outcomeMemory.activeLayer !== 'none') {
        return outcomeMemory.summary;
    }

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

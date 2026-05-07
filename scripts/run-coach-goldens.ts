import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateCoaching } from '../src/core/coach-engine';
import { buildCoachPlan } from '../src/core/coach-plan-builder';
import type { CoachMemorySnapshot } from '../src/core/coach-memory';
import { buildCompleteTrainingProtocol } from '../src/core/training-protocols';
import { createAnalysisResultFixture } from '../src/core/coach-test-fixtures';
import { resolveAnalysisDecision } from '../src/core/analysis-decision';
import type {
    AnalysisContextDetails,
    AnalysisResult,
    CoachContext,
    CoachDecisionTier,
    CoachEvidence,
    CoachFeedback,
    CoachFocusArea,
    CoachMode,
    CoachOutcomeMemoryLayerSummary,
    CoachOutcomeMemorySummary,
    CoachPlan,
    CompleteTrainingProtocol,
    Diagnosis,
    WeaponLoadout,
} from '../src/types/engine';

interface StableCoachFeedback {
    readonly mode: CoachMode;
    readonly problem: string;
    readonly evidence: CoachEvidence;
    readonly confidence: number;
    readonly likelyCause: string;
    readonly adjustment: string;
    readonly drill: string;
    readonly verifyNextClip: string;
    readonly adaptationTimeDays: number;
}

interface StableCompleteProtocolExpectation {
    readonly version: CompleteTrainingProtocol['version'];
    readonly tier: CoachDecisionTier;
    readonly drillId: CompleteTrainingProtocol['drillId'];
    readonly durationMinutes: number;
    readonly sprayReps: number;
    readonly environment: CompleteTrainingProtocol['environment'];
    readonly target: string;
    readonly preparationContains: readonly string[];
    readonly downgradeReasons: readonly string[];
    readonly repairActions: readonly string[];
    readonly validationTarget: string;
    readonly transferCountsAsTechnicalValidation: false;
}

const STABLE_COMPLETE_PROTOCOL_KEYS = [
    'version',
    'tier',
    'drillId',
    'durationMinutes',
    'sprayReps',
    'environment',
    'target',
    'preparationContains',
    'downgradeReasons',
    'repairActions',
    'validationTarget',
    'transferCountsAsTechnicalValidation',
] as const satisfies readonly (keyof StableCompleteProtocolExpectation)[];

type CoachGoldenProtocolScenario = 'default' | 'outcome_conflict' | 'fatigue_or_pain';

export interface CoachGoldenFixture {
    readonly version: 1;
    readonly name: string;
    readonly loadout: WeaponLoadout;
    readonly context?: CoachContext;
    readonly diagnoses: readonly Diagnosis[];
    readonly expected: readonly StableCoachFeedback[];
    readonly protocolScenario?: CoachGoldenProtocolScenario;
    readonly expectedCompleteProtocol?: StableCompleteProtocolExpectation;
}

export interface CoachGoldenFixtureResult {
    readonly name: string;
    readonly passed: boolean;
    readonly actual: readonly StableCoachFeedback[];
    readonly expected: readonly StableCoachFeedback[];
    readonly actualCompleteProtocol?: StableCompleteProtocolExpectation;
    readonly expectedCompleteProtocol?: StableCompleteProtocolExpectation;
    readonly completeProtocolMismatches: readonly string[];
}

export interface CoachGoldenReport {
    readonly passed: boolean;
    readonly summary: {
        readonly totalFixtures: number;
        readonly failedFixtures: number;
    };
    readonly fixtures: readonly CoachGoldenFixtureResult[];
}

export interface RunCoachGoldensOptions {
    readonly fixturesDir?: string;
}

function toStableFeedback(feedback: CoachFeedback): StableCoachFeedback {
    return {
        mode: feedback.mode,
        problem: feedback.problem,
        evidence: feedback.evidence,
        confidence: feedback.confidence,
        likelyCause: feedback.likelyCause,
        adjustment: feedback.adjustment,
        drill: feedback.drill,
        verifyNextClip: feedback.verifyNextClip,
        adaptationTimeDays: feedback.adaptationTimeDays,
    };
}

function toStableCompleteProtocol(
    completeProtocol: CompleteTrainingProtocol,
): StableCompleteProtocolExpectation {
    return {
        version: completeProtocol.version,
        tier: completeProtocol.tier,
        drillId: completeProtocol.drillId,
        durationMinutes: completeProtocol.dose.durationMinutes,
        sprayReps: completeProtocol.dose.sprayReps,
        environment: completeProtocol.environment,
        target: completeProtocol.target,
        preparationContains: completeProtocol.preparation.map((item) => item.id),
        downgradeReasons: completeProtocol.downgrade.reasons,
        repairActions: completeProtocol.downgrade.repairCtas,
        validationTarget: completeProtocol.validation.nextClipCopy,
        transferCountsAsTechnicalValidation: completeProtocol.transfer.countsAsTechnicalValidation,
    };
}

function stableJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
}

function stripCompleteProtocol(coachPlan: CoachPlan): Omit<CoachPlan, 'completeProtocol'> {
    return {
        tier: coachPlan.tier,
        sessionSummary: coachPlan.sessionSummary,
        primaryFocus: coachPlan.primaryFocus,
        secondaryFocuses: coachPlan.secondaryFocuses,
        actionProtocols: coachPlan.actionProtocols,
        nextBlock: coachPlan.nextBlock,
        stopConditions: coachPlan.stopConditions,
        adaptationWindowDays: coachPlan.adaptationWindowDays,
        llmRewriteAllowed: coachPlan.llmRewriteAllowed,
    };
}

function buildFixtureAnalysisContext(context: CoachContext | undefined): AnalysisContextDetails | undefined {
    if (!context?.opticId && typeof context?.targetDistanceMeters !== 'number') {
        return undefined;
    }

    const opticId = context.opticId ?? 'red-dot';
    const opticStateId = context.opticStateId ?? '1x';

    return {
        targetDistanceMeters: context.targetDistanceMeters ?? 50,
        distanceMode: context.distanceMode ?? 'exact',
        optic: {
            scopeId: opticId,
            opticId,
            opticStateId,
            opticName: opticId,
            opticStateName: opticStateId,
            availableStateIds: [opticStateId],
            isDynamicOptic: opticId === 'hybrid-scope',
        },
    };
}

function buildAnalysisResultForFixture(
    fixture: CoachGoldenFixture,
    coaching: readonly CoachFeedback[],
): AnalysisResult {
    const firstEvidence = coaching[0]?.evidence;
    const analysisContext = buildFixtureAnalysisContext(fixture.context);
    const weakBlockers = [
        ...(firstEvidence && firstEvidence.confidence < 0.6 ? ['low_confidence' as const] : []),
        ...(firstEvidence && firstEvidence.coverage < 0.6 ? ['low_coverage' as const] : []),
    ];
    const analysisDecision = firstEvidence
        ? resolveAnalysisDecision({
            blockerReasons: weakBlockers,
            confidence: firstEvidence.confidence,
            coverage: firstEvidence.coverage,
        })
        : undefined;

    return createAnalysisResultFixture({
        id: `coach-golden-${fixture.name}`,
        patchVersion: fixture.context?.patchVersion ?? '41.1',
        ...(analysisDecision ? { analysisDecision } : {}),
        ...(analysisContext ? { analysisContext } : {}),
        trajectory: {
            weaponId: 'beryl-m762',
        },
        loadout: fixture.loadout,
        diagnoses: fixture.diagnoses,
        coaching,
    });
}

function emptyOutcomeLayer(source: CoachOutcomeMemoryLayerSummary['source']): CoachOutcomeMemoryLayerSummary {
    return {
        source,
        outcomeCount: 0,
        pendingCount: 0,
        neutralCount: 0,
        weakSelfReportCount: 0,
        confirmedCount: 0,
        invalidCount: 0,
        conflictCount: 0,
        repeatedFailureCount: 0,
        staleOutcomeCount: 0,
        technicalEvidenceCount: 0,
        focusAreas: [],
        confidence: 0,
        summary: 'Sem memoria de outcome para este golden.',
    };
}

function buildConflictMemorySnapshot(area: CoachFocusArea): CoachMemorySnapshot {
    const strictCompatible: CoachOutcomeMemoryLayerSummary = {
        ...emptyOutcomeLayer('strict_compatible'),
        outcomeCount: 1,
        conflictCount: 1,
        focusAreas: [area],
        confidence: 0.42,
        summary: 'Outcome recente conflita com a validacao compativel.',
    };
    const globalFallback = emptyOutcomeLayer('global_fallback');
    const outcomeMemory: CoachOutcomeMemorySummary = {
        activeLayer: 'strict_compatible',
        strictCompatible,
        globalFallback,
        pendingCount: 0,
        neutralCount: 0,
        confirmedCount: 0,
        invalidCount: 0,
        conflictCount: 1,
        repeatedFailureCount: 0,
        staleOutcomeCount: 0,
        confidence: 0.42,
        summary: 'Conflito de outcome bloqueia agressividade do protocolo.',
    };

    return {
        compatibleSessionCount: 1,
        outcomeMemory,
        recurrentFocuses: [],
        alignedFocusAreas: [],
        conflictingFocusAreas: [area],
        signals: [],
        summary: 'Conflito de outcome bloqueia agressividade do protocolo.',
    };
}

function buildCompleteProtocolForFixture(
    fixture: CoachGoldenFixture,
    analysisResult: AnalysisResult,
): CompleteTrainingProtocol | undefined {
    const basePlan = buildCoachPlan({
        analysisResult,
        ...(fixture.protocolScenario === 'outcome_conflict'
            ? { memorySnapshot: buildConflictMemorySnapshot('vertical_control') }
            : {}),
    });

    if (fixture.protocolScenario === 'fatigue_or_pain') {
        const basePlanWithoutProtocol = stripCompleteProtocol(basePlan);
        const coachPlanBase: Omit<CoachPlan, 'completeProtocol'> = {
            ...basePlanWithoutProtocol,
            primaryFocus: {
                ...basePlanWithoutProtocol.primaryFocus,
                blockedBy: [
                    ...basePlanWithoutProtocol.primaryFocus.blockedBy,
                    'fatigue_or_pain',
                ],
            },
        };

        return buildCompleteTrainingProtocol({
            analysisResult,
            coachPlanBase,
        });
    }

    return basePlan.completeProtocol;
}

function compareCompleteProtocol(
    actual: StableCompleteProtocolExpectation | undefined,
    expected: StableCompleteProtocolExpectation | undefined,
): readonly string[] {
    if (!expected) {
        return [];
    }

    if (!actual) {
        return ['completeProtocol missing from actual coach plan'];
    }

    const mismatches: string[] = [];

    for (const key of STABLE_COMPLETE_PROTOCOL_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(expected, key)) {
            mismatches.push(`${String(key)} missing from expected completeProtocol`);
            continue;
        }

        if (stableJson(actual[key]) !== stableJson(expected[key])) {
            mismatches.push(`${String(key)} expected ${stableJson(expected[key])} but received ${stableJson(actual[key])}`);
        }
    }

    return mismatches;
}

export function evaluateCoachGoldenFixture(fixture: CoachGoldenFixture): CoachGoldenFixtureResult {
    const generatedCoaching = generateCoaching(
        fixture.diagnoses,
        fixture.loadout,
        fixture.context ?? {}
    );
    const actual = generatedCoaching.map(toStableFeedback);
    const analysisResult = buildAnalysisResultForFixture(fixture, generatedCoaching);
    const completeProtocol = buildCompleteProtocolForFixture(fixture, analysisResult);
    const actualCompleteProtocol = completeProtocol
        ? toStableCompleteProtocol(completeProtocol)
        : undefined;
    const completeProtocolMismatches = compareCompleteProtocol(
        actualCompleteProtocol,
        fixture.expectedCompleteProtocol,
    );
    const passed = stableJson(actual) === stableJson(fixture.expected)
        && completeProtocolMismatches.length === 0;

    return {
        name: fixture.name,
        passed,
        actual,
        expected: fixture.expected,
        ...(actualCompleteProtocol ? { actualCompleteProtocol } : {}),
        ...(fixture.expectedCompleteProtocol ? { expectedCompleteProtocol: fixture.expectedCompleteProtocol } : {}),
        completeProtocolMismatches,
    };
}

export async function loadCoachGoldenFixture(filePath: string): Promise<CoachGoldenFixture> {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as CoachGoldenFixture;
}

async function loadFixtures(fixturesDir: string): Promise<CoachGoldenFixture[]> {
    const entries = await readdir(fixturesDir);
    const files = entries.filter(entry => entry.endsWith('.json')).sort();
    const fixtures: CoachGoldenFixture[] = [];

    for (const file of files) {
        fixtures.push(await loadCoachGoldenFixture(path.join(fixturesDir, file)));
    }

    return fixtures;
}

export async function runCoachGoldens(
    options: RunCoachGoldensOptions = {}
): Promise<CoachGoldenReport> {
    const fixturesDir = options.fixturesDir ?? path.resolve(process.cwd(), 'tests/goldens/coach');
    const fixtures = await loadFixtures(fixturesDir);
    const results = fixtures.map(evaluateCoachGoldenFixture);
    const failedFixtures = results.filter(result => !result.passed).length;

    return {
        passed: failedFixtures === 0,
        summary: {
            totalFixtures: results.length,
            failedFixtures,
        },
        fixtures: results,
    };
}

function isCliEntrypoint(): boolean {
    const entrypoint = process.argv[1];
    if (!entrypoint) return false;

    return import.meta.url === pathToFileURL(entrypoint).href;
}

async function main(): Promise<void> {
    const report = await runCoachGoldens();
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.passed ? 0 : 1;
}

if (isCliEntrypoint()) {
    void main();
}

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runBenchmark } from '../../scripts/run-benchmark';
import {
    evaluateCoachGoldenFixture,
    runCoachGoldens,
    type CoachGoldenFixture,
} from '../../scripts/run-coach-goldens';

const fixturesDir = fileURLToPath(new URL('../../tests/goldens/coach', import.meta.url));
const capturedBenchmarkPath = fileURLToPath(new URL('../../tests/goldens/benchmark/captured-benchmark-draft.json', import.meta.url));

const coachDecisionTiers = ['capture_again', 'test_protocol', 'stabilize_block', 'apply_protocol'];
const coachFocusAreas = [
    'capture_quality',
    'vertical_control',
    'horizontal_control',
    'timing',
    'consistency',
    'sensitivity',
    'loadout',
    'validation',
];

interface CapturedBenchmarkClipWithCoachPlanExpectation {
    readonly clipId: string;
    readonly labels: {
        readonly expectedCoachPlan?: StableCoachPlanExpectation;
    };
}

interface StableCoachPlanExpectation {
    readonly tier?: string;
    readonly primaryFocusArea?: string;
    readonly nextBlockTitle?: string;
}

function loadCapturedBenchmarkClips(): readonly CapturedBenchmarkClipWithCoachPlanExpectation[] {
    const raw = readFileSync(capturedBenchmarkPath, 'utf8');
    const dataset = JSON.parse(raw) as { readonly clips?: readonly CapturedBenchmarkClipWithCoachPlanExpectation[] };
    return dataset.clips ?? [];
}

describe('runCoachGoldens', () => {
    it('passes explicit coach golden fixtures', async () => {
        const report = await runCoachGoldens({ fixturesDir });

        expect(report.passed).toBe(true);
        expect(report.summary.totalFixtures).toBeGreaterThanOrEqual(5);
        expect(report.summary.failedFixtures).toBe(0);
        expect(report.fixtures.map(fixture => fixture.name).sort()).toEqual([
            'clean-no-diagnosis-411',
            'complete-protocol-fatigue',
            'complete-protocol-low-confidence',
            'complete-protocol-outcome-conflict',
            'complete-protocol-vertical-control',
            'horizontal-drift-361-angled',
            'horizontal-drift-411-tilted',
            'hybrid-scope-411',
            'low-confidence-underpull',
            'underpull-standard-411',
        ]);
    });

    it('locks complete protocol facts in the coach golden matrix', async () => {
        const report = await runCoachGoldens({ fixturesDir });
        const protocolFixtures = report.fixtures.filter(fixture => fixture.name.startsWith('complete-protocol-'));

        expect(protocolFixtures).toHaveLength(4);

        for (const fixture of protocolFixtures) {
            expect(fixture.actualCompleteProtocol, `${fixture.name} should emit completeProtocol`).toEqual(fixture.expectedCompleteProtocol);
            expect(fixture.completeProtocolMismatches).toEqual([]);
            expect(fixture.expectedCompleteProtocol?.version).toBe('complete-protocol-v1');
            expect(fixture.expectedCompleteProtocol?.drillId).toEqual(expect.any(String));
            expect(fixture.expectedCompleteProtocol?.transferCountsAsTechnicalValidation).toBe(false);
        }

        const lowConfidence = protocolFixtures.find(fixture => fixture.name === 'complete-protocol-low-confidence');
        expect(lowConfidence?.expectedCompleteProtocol?.tier).not.toBe('apply_protocol');
        expect(lowConfidence?.expectedCompleteProtocol?.downgradeReasons).toEqual(expect.arrayContaining([
            'low_confidence',
        ]));

        const fatigue = protocolFixtures.find(fixture => fixture.name === 'complete-protocol-fatigue');
        expect(fatigue?.expectedCompleteProtocol?.downgradeReasons).toEqual(expect.arrayContaining([
            'fatigue_or_pain',
        ]));
        expect(fatigue?.expectedCompleteProtocol?.repairActions.join(' ')).toContain('Reduza a dose');

        const conflict = protocolFixtures.find(fixture => fixture.name === 'complete-protocol-outcome-conflict');
        expect(conflict?.expectedCompleteProtocol?.downgradeReasons).toEqual(expect.arrayContaining([
            'outcome_conflict',
        ]));
    });

    it('fails a coach golden when completeProtocol drillId expectation is removed', () => {
        const raw = readFileSync(
            fileURLToPath(new URL('../../tests/goldens/coach/complete-protocol-vertical-control.json', import.meta.url)),
            'utf8',
        );
        const fixture = JSON.parse(raw) as CoachGoldenFixture;
        const { drillId: _removedDrillId, ...expectedWithoutDrillId } = fixture.expectedCompleteProtocol!;
        const result = evaluateCoachGoldenFixture({
            ...fixture,
            expectedCompleteProtocol: expectedWithoutDrillId as CoachGoldenFixture['expectedCompleteProtocol'],
        });

        expect(result.passed).toBe(false);
        expect(result.completeProtocolMismatches.some(mismatch => mismatch.includes('drillId'))).toBe(true);
    });

    it('pins session coach plan facts in the captured benchmark golden', async () => {
        const clips = loadCapturedBenchmarkClips();

        expect(clips.length).toBeGreaterThan(0);

        for (const clip of clips) {
            expect(clip.labels.expectedCoachPlan, `${clip.clipId} should define expected coachPlan facts`).toEqual(expect.objectContaining({
                tier: expect.any(String),
                primaryFocusArea: expect.any(String),
                nextBlockTitle: expect.any(String),
            }));
            expect(coachDecisionTiers).toContain(clip.labels.expectedCoachPlan?.tier);
            expect(coachFocusAreas).toContain(clip.labels.expectedCoachPlan?.primaryFocusArea);
            expect(clip.labels.expectedCoachPlan?.nextBlockTitle?.trim().length).toBeGreaterThan(0);
        }

        const report = await runBenchmark({ datasetPath: capturedBenchmarkPath });

        expect(report.passed).toBe(true);
        expect(report.clips).toHaveLength(clips.length);

        for (const clip of report.clips) {
            expect(clip.coach.error).toBeUndefined();
            expect(clip.coach.actualPlan, `${clip.clipId} should expose actual coachPlan facts`).toEqual(clip.coach.expectedPlan);
        }
    }, 15000);
});

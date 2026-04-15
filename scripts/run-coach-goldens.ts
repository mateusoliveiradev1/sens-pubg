import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateCoaching } from '../src/core/coach-engine';
import type { CoachContext, CoachEvidence, CoachFeedback, CoachMode, Diagnosis, WeaponLoadout } from '../src/types/engine';

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

export interface CoachGoldenFixture {
    readonly version: 1;
    readonly name: string;
    readonly loadout: WeaponLoadout;
    readonly context?: CoachContext;
    readonly diagnoses: readonly Diagnosis[];
    readonly expected: readonly StableCoachFeedback[];
}

export interface CoachGoldenFixtureResult {
    readonly name: string;
    readonly passed: boolean;
    readonly actual: readonly StableCoachFeedback[];
    readonly expected: readonly StableCoachFeedback[];
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

function stableJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
}

export function evaluateCoachGoldenFixture(fixture: CoachGoldenFixture): CoachGoldenFixtureResult {
    const actual = generateCoaching(
        fixture.diagnoses,
        fixture.loadout,
        fixture.context ?? {}
    ).map(toStableFeedback);
    const passed = stableJson(actual) === stableJson(fixture.expected);

    return {
        name: fixture.name,
        passed,
        actual,
        expected: fixture.expected,
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

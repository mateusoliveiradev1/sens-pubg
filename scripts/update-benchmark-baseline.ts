import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createBenchmarkRegressionBaseline, runBenchmark } from './run-benchmark';

type BaselineDataset = 'synthetic' | 'captured';

interface ParsedArgs {
    readonly dataset: BaselineDataset;
    readonly reason: string;
    readonly affectedClips: string;
    readonly honestyRationale: string;
}

const DATASETS: Record<BaselineDataset, {
    readonly datasetPath: string;
    readonly baselinePath: string;
}> = {
    synthetic: {
        datasetPath: 'tests/goldens/benchmark/synthetic-benchmark.v1.json',
        baselinePath: 'tests/goldens/benchmark/synthetic-benchmark.baseline.json',
    },
    captured: {
        datasetPath: 'tests/goldens/benchmark/captured-benchmark-draft.json',
        baselinePath: 'tests/goldens/benchmark/captured-benchmark.baseline.json',
    },
};

function readOption(args: readonly string[], name: string): string | undefined {
    const index = args.indexOf(name);
    if (index < 0) return undefined;

    return args[index + 1];
}

function requireOption(args: readonly string[], name: string): string {
    const value = readOption(args, name)?.trim();
    if (!value) {
        throw new Error(`Missing required ${name}`);
    }

    return value;
}

export function parseBaselineUpdateArgs(args: readonly string[]): ParsedArgs {
    const dataset = requireOption(args, '--dataset');

    if (dataset !== 'synthetic' && dataset !== 'captured') {
        throw new Error('--dataset must be synthetic or captured');
    }

    return {
        dataset,
        reason: requireOption(args, '--reason'),
        affectedClips: requireOption(args, '--affected-clips'),
        honestyRationale: requireOption(args, '--honesty-rationale'),
    };
}

function resolveInputPath(filePath: string): string {
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

function buildUpdateSummary(input: {
    readonly parsedArgs: ParsedArgs;
    readonly baselinePath: string;
    readonly generatedAt: string;
    readonly failedClips: number;
    readonly score: number;
}): string {
    return [
        '# Benchmark Baseline Update',
        '',
        `Generated: ${input.generatedAt}`,
        `Dataset: ${input.parsedArgs.dataset}`,
        `Baseline: \`${input.baselinePath}\``,
        '',
        '## Required Justification',
        '',
        `Reason: ${input.parsedArgs.reason}`,
        `Affected clips: ${input.parsedArgs.affectedClips}`,
        `Honesty rationale: ${input.parsedArgs.honestyRationale}`,
        '',
        '## New Baseline Snapshot',
        '',
        `Failed clips: ${input.failedClips}`,
        `Score: ${input.score}`,
        '',
    ].join('\n');
}

async function main(): Promise<void> {
    try {
        const parsedArgs = parseBaselineUpdateArgs(process.argv.slice(2));
        const config = DATASETS[parsedArgs.dataset];
        const report = await runBenchmark({ datasetPath: config.datasetPath });

        if (!report.passed) {
            throw new Error(`Refusing to update ${parsedArgs.dataset} baseline because benchmark has ${report.summary.failedClips} structural failure(s).`);
        }

        const generatedAt = new Date().toISOString();
        const baseline = createBenchmarkRegressionBaseline({
            ...report,
            generatedAt,
        });
        const baselinePath = resolveInputPath(config.baselinePath);
        const summaryPath = resolveInputPath(`docs/benchmark-reports/baseline-update-${parsedArgs.dataset}-${generatedAt.slice(0, 10)}.md`);

        await writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
        await mkdir(path.dirname(summaryPath), { recursive: true });
        await writeFile(summaryPath, buildUpdateSummary({
            parsedArgs,
            baselinePath: config.baselinePath,
            generatedAt,
            failedClips: report.summary.failedClips,
            score: report.summary.score,
        }));

        console.log(`updated ${config.baselinePath}`);
        console.log(`summary ${path.relative(process.cwd(), summaryPath)}`);
        process.exitCode = 0;
    } catch (error) {
        console.error(error instanceof Error ? error.message : 'Unknown baseline update error');
        process.exitCode = 1;
    }
}

function isCliEntrypoint(): boolean {
    const entrypoint = process.argv[1];
    if (!entrypoint) return false;

    return import.meta.url === pathToFileURL(entrypoint).href;
}

if (isCliEntrypoint()) {
    void main();
}

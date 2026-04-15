import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildBenchmarkCoverageSummary } from '../src/core/benchmark-coverage';
import { parseBenchmarkDataset } from '../src/types/benchmark';

function resolveInputPath(filePath: string): string {
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

async function loadBenchmarkDataset(datasetPath: string) {
    const raw = await readFile(resolveInputPath(datasetPath), 'utf8');
    return parseBenchmarkDataset(JSON.parse(raw));
}

async function main(): Promise<void> {
    const [, , datasetArg] = process.argv;
    const datasetPath = datasetArg ?? 'tests/goldens/benchmark/captured-benchmark-draft.json';
    const dataset = await loadBenchmarkDataset(datasetPath);
    const summary = buildBenchmarkCoverageSummary(dataset);

    console.log(`benchmark coverage validation for ${summary.datasetId}`);
    for (const check of summary.starterGate.checks) {
        console.log(`- ${check.label}: ${check.actual}/${check.required} ${check.passed ? 'PASS' : 'FAIL'}`);
    }

    if (summary.starterGate.passed) {
        console.log('starter gate: PASS');
        process.exitCode = 0;
        return;
    }

    console.log('starter gate: FAIL');
    if (summary.starterGaps.length > 0) {
        console.log('gaps:');
        for (const gap of summary.starterGaps) {
            console.log(`- ${gap}`);
        }
    }

    process.exitCode = 1;
}

function isCliEntrypoint(): boolean {
    const entrypoint = process.argv[1];
    if (!entrypoint) return false;

    return import.meta.url === pathToFileURL(entrypoint).href;
}

if (isCliEntrypoint()) {
    void main();
}

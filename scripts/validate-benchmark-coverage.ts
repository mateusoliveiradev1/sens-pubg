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
    const args = process.argv.slice(2);
    const gateMode = args.includes('--sdd') ? 'sdd' : 'starter';
    const datasetArg = args.find((arg) => !arg.startsWith('--'));
    const datasetPath = datasetArg ?? 'tests/goldens/benchmark/captured-benchmark-draft.json';
    const dataset = await loadBenchmarkDataset(datasetPath);
    const summary = buildBenchmarkCoverageSummary(dataset);
    const gate = gateMode === 'sdd' ? summary.sddGate : summary.starterGate;
    const gaps = gateMode === 'sdd' ? summary.sddGaps : summary.starterGaps;
    const gateLabel = gateMode === 'sdd' ? 'sdd evidence gate' : 'starter gate';

    console.log(`benchmark coverage validation for ${summary.datasetId}`);
    for (const check of gate.checks) {
        console.log(`- ${check.label}: ${check.actual}/${check.required} ${check.passed ? 'PASS' : 'FAIL'}`);
    }

    if (gate.passed) {
        console.log(`${gateLabel}: PASS`);
        process.exitCode = 0;
        return;
    }

    console.log(`${gateLabel}: FAIL`);
    if (gaps.length > 0) {
        console.log('gaps:');
        for (const gap of gaps) {
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

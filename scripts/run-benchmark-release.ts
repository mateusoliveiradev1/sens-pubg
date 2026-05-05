import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildBenchmarkCoverageSummary } from '../src/core/benchmark-coverage';
import { buildBenchmarkReleaseReport } from '../src/core/benchmark-release-report';
import { parseBenchmarkDataset } from '../src/types/benchmark';
import { runBenchmark } from './run-benchmark';

const SYNTHETIC_DATASET = 'tests/goldens/benchmark/synthetic-benchmark.v1.json';
const SYNTHETIC_BASELINE = 'tests/goldens/benchmark/synthetic-benchmark.baseline.json';
const CAPTURED_DATASET = 'tests/goldens/benchmark/captured-benchmark-draft.json';
const CAPTURED_BASELINE = 'tests/goldens/benchmark/captured-benchmark.baseline.json';

function resolveInputPath(filePath: string): string {
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

async function loadCoverageSummary(datasetPath: string) {
    const raw = await readFile(resolveInputPath(datasetPath), 'utf8');
    return buildBenchmarkCoverageSummary(parseBenchmarkDataset(JSON.parse(raw)));
}

async function main(): Promise<void> {
    const generatedAt = new Date().toISOString();
    const syntheticReport = await runBenchmark({
        datasetPath: SYNTHETIC_DATASET,
        baselinePath: SYNTHETIC_BASELINE,
    });
    const capturedReport = await runBenchmark({
        datasetPath: CAPTURED_DATASET,
        baselinePath: CAPTURED_BASELINE,
    });
    const coverageSummary = await loadCoverageSummary(CAPTURED_DATASET);
    const releaseReport = buildBenchmarkReleaseReport({
        generatedAt,
        syntheticReport,
        capturedReport,
        coverageSummary,
    });

    await mkdir(path.dirname(resolveInputPath(releaseReport.datedReportPath)), { recursive: true });
    await writeFile(resolveInputPath(releaseReport.datedReportPath), releaseReport.markdown);
    await writeFile(resolveInputPath(releaseReport.latestReportPath), releaseReport.markdown);

    for (const line of releaseReport.consoleLines) {
        console.log(line);
    }
    console.log(`report: ${releaseReport.datedReportPath}`);
    console.log(`latest: ${releaseReport.latestReportPath}`);

    process.exitCode = releaseReport.passed ? 0 : 1;
}

function isCliEntrypoint(): boolean {
    const entrypoint = process.argv[1];
    if (!entrypoint) return false;

    return import.meta.url === pathToFileURL(entrypoint).href;
}

if (isCliEntrypoint()) {
    void main();
}

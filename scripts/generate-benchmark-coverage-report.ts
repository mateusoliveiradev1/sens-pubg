import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildBenchmarkCoverageSummary, renderBenchmarkCoverageMarkdown } from '../src/core/benchmark-coverage';
import { parseBenchmarkDataset } from '../src/types/benchmark';

function resolveInputPath(filePath: string): string {
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

async function loadBenchmarkDataset(datasetPath: string) {
    const raw = await readFile(resolveInputPath(datasetPath), 'utf8');
    return parseBenchmarkDataset(JSON.parse(raw));
}

async function main(): Promise<void> {
    const [, , datasetArg, outputArg, titleArg] = process.argv;
    const datasetPath = datasetArg ?? 'tests/goldens/benchmark/captured-benchmark-draft.json';
    const outputPath = resolveInputPath(outputArg ?? 'docs/benchmark-coverage-2026-04-14.md');
    const title = titleArg ?? 'Benchmark Coverage';
    const dataset = await loadBenchmarkDataset(datasetPath);
    const summary = buildBenchmarkCoverageSummary(dataset);
    const markdown = renderBenchmarkCoverageMarkdown(summary, {
        title,
        generatedFor: datasetPath,
    });

    await writeFile(outputPath, markdown, 'utf8');
    console.log(`benchmark coverage report written to ${outputPath}`);
}

function isCliEntrypoint(): boolean {
    const entrypoint = process.argv[1];
    if (!entrypoint) return false;

    return import.meta.url === pathToFileURL(entrypoint).href;
}

if (isCliEntrypoint()) {
    void main();
}

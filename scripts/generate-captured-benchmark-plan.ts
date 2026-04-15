import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
    buildCapturedBenchmarkPlan,
    renderCapturedBenchmarkPlanMarkdown,
} from '../src/core/captured-benchmark-plan';
import { parseBenchmarkDataset } from '../src/types/benchmark';
import { parseCapturedClipIntakeManifest } from '../src/types/captured-clip-intake';
import { parseCapturedClipLabelSet } from '../src/types/captured-clip-labels';

function resolveInputPath(filePath: string): string {
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

async function readJson<T>(filePath: string, parser: (value: unknown) => T): Promise<T> {
    const raw = await readFile(resolveInputPath(filePath), 'utf8');
    return parser(JSON.parse(raw));
}

async function main(): Promise<void> {
    const [, , datasetArg, intakeArg, labelsArg, outputArg, titleArg] = process.argv;

    if (!datasetArg || !intakeArg || !labelsArg || !outputArg) {
        throw new Error('usage: tsx scripts/generate-captured-benchmark-plan.ts <dataset> <intake> <labels> <output> [title]');
    }

    const dataset = await readJson(datasetArg, parseBenchmarkDataset);
    const intakeManifest = await readJson(intakeArg, parseCapturedClipIntakeManifest);
    const labelSet = await readJson(labelsArg, parseCapturedClipLabelSet);
    const plan = buildCapturedBenchmarkPlan(dataset, intakeManifest, labelSet);
    const markdown = renderCapturedBenchmarkPlanMarkdown(plan, {
        title: titleArg ?? 'Captured Benchmark Plan',
        generatedFor: datasetArg,
    });
    const outputPath = resolveInputPath(outputArg);

    await writeFile(outputPath, markdown, 'utf8');
    console.log(`captured benchmark plan written to ${outputPath}`);
}

function isCliEntrypoint(): boolean {
    const entrypoint = process.argv[1];
    if (!entrypoint) return false;

    return import.meta.url === pathToFileURL(entrypoint).href;
}

if (isCliEntrypoint()) {
    void main();
}

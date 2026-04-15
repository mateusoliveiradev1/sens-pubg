import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildCapturedBenchmarkPlan } from '../src/core/captured-benchmark-plan';
import { buildCapturedCaptureSlotTemplate } from '../src/core/captured-capture-slot-template';
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
    const [, , datasetArg, intakeArg, labelsArg, outputArg, createdAtArg] = process.argv;

    if (!datasetArg || !intakeArg || !labelsArg || !outputArg) {
        throw new Error('usage: tsx scripts/generate-captured-capture-slots.ts <dataset> <intake> <labels> <output> [createdAt]');
    }

    const dataset = await readJson(datasetArg, parseBenchmarkDataset);
    const intakeManifest = await readJson(intakeArg, parseCapturedClipIntakeManifest);
    const labelSet = await readJson(labelsArg, parseCapturedClipLabelSet);
    const plan = buildCapturedBenchmarkPlan(dataset, intakeManifest, labelSet);
    const template = buildCapturedCaptureSlotTemplate({
        requestSetId: `captured-capture-slots-todo-${new Date(createdAtArg ?? Date.now()).toISOString().slice(0, 10)}`,
        datasetId: dataset.datasetId,
        createdAt: createdAtArg ?? new Date().toISOString(),
        plan,
    });
    const outputPath = resolveInputPath(outputArg);

    await writeFile(outputPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
    console.log(`captured capture slots written to ${outputPath}`);
}

function isCliEntrypoint(): boolean {
    const entrypoint = process.argv[1];
    if (!entrypoint) return false;

    return import.meta.url === pathToFileURL(entrypoint).href;
}

if (isCliEntrypoint()) {
    void main();
}

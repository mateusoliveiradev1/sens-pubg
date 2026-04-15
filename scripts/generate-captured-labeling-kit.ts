import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildCapturedLabelingKitMarkdown } from '../src/core/captured-labeling-kit';
import { parseCapturedClipIntakeManifest } from '../src/types/captured-clip-intake';
import { parseCapturedClipLabelSet } from '../src/types/captured-clip-labels';

export interface GenerateCapturedLabelingKitOptions {
    readonly intakePath?: string;
    readonly labelsPath?: string;
    readonly outputPath?: string;
    readonly title?: string;
}

const resolveInputPath = (filePath: string): string =>
    path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

const loadJson = async (filePath: string): Promise<unknown> => {
    const raw = await readFile(resolveInputPath(filePath), 'utf8');
    return JSON.parse(raw);
};

export const generateCapturedLabelingKit = async (
    options: GenerateCapturedLabelingKitOptions = {},
): Promise<string> => {
    const outputPath = resolveInputPath(options.outputPath ?? 'docs/captured-labeling-kit-2026-04-14.md');
    const intakeManifest = parseCapturedClipIntakeManifest(
        await loadJson(options.intakePath ?? 'tests/fixtures/captured-clips/intake.v1.json'),
    );
    const labelSet = parseCapturedClipLabelSet(
        await loadJson(options.labelsPath ?? 'tests/fixtures/captured-clips/labels.todo.v1.json'),
    );
    const markdown = buildCapturedLabelingKitMarkdown({
        title: options.title ?? 'Captured Clip Labeling Kit - 2026-04-14',
        intakeManifest,
        labelSet,
    });

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, markdown, 'utf8');

    return outputPath;
};

const isCliEntrypoint = (): boolean => {
    const entrypoint = process.argv[1];
    if (!entrypoint) return false;

    return import.meta.url === pathToFileURL(entrypoint).href;
};

const main = async (): Promise<void> => {
    const [, , intakeArg, labelsArg, outputArg] = process.argv;
    const outputPath = await generateCapturedLabelingKit({
        ...(intakeArg ? { intakePath: intakeArg } : {}),
        ...(labelsArg ? { labelsPath: labelsArg } : {}),
        ...(outputArg ? { outputPath: outputArg } : {}),
    });

    console.log(JSON.stringify({ outputPath }, null, 2));
};

if (isCliEntrypoint()) {
    void main();
}

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildCapturedSpecialistReviewKitMarkdown } from '../src/core/captured-specialist-review-kit';
import { parseBenchmarkDataset } from '../src/types/benchmark';
import { parseCapturedBenchmarkReviewDecisionSet } from '../src/types/captured-benchmark-review-decisions';
import { parseCapturedFrameLabelTemplate } from '../src/types/captured-frame-labels';
import { parseCapturedClipIntakeManifest } from '../src/types/captured-clip-intake';
import { parseCapturedClipLabelSet } from '../src/types/captured-clip-labels';

export interface GenerateCapturedSpecialistReviewKitOptions {
    readonly datasetPath?: string;
    readonly intakePath?: string;
    readonly labelsPath?: string;
    readonly decisionsPath?: string;
    readonly outputPath?: string;
    readonly title?: string;
}

const resolveInputPath = (filePath: string): string =>
    path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

const loadJson = async (filePath: string): Promise<unknown> => {
    const raw = await readFile(resolveInputPath(filePath), 'utf8');
    return JSON.parse(raw);
};

const tryLoadFrameLabelTemplate = async (filePath: string) => {
    try {
        return parseCapturedFrameLabelTemplate(await loadJson(filePath));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return undefined;
        }

        throw error;
    }
};

export const generateCapturedSpecialistReviewKit = async (
    options: GenerateCapturedSpecialistReviewKitOptions = {},
): Promise<string> => {
    const outputPath = resolveInputPath(options.outputPath ?? 'docs/captured-specialist-review-kit-2026-04-16.md');
    const dataset = parseBenchmarkDataset(
        await loadJson(options.datasetPath ?? 'tests/goldens/benchmark/captured-benchmark-draft.json'),
    );
    const intakeManifest = parseCapturedClipIntakeManifest(
        await loadJson(options.intakePath ?? 'tests/fixtures/captured-clips/intake.v1.json'),
    );
    const labelSet = parseCapturedClipLabelSet(
        await loadJson(options.labelsPath ?? 'tests/fixtures/captured-clips/labels.todo.v1.json'),
    );
    const decisionSet = parseCapturedBenchmarkReviewDecisionSet(
        await loadJson(options.decisionsPath ?? 'tests/fixtures/captured-clips/review-decisions.todo.v1.json'),
    );
    const frameLabelTemplatesByClipId = new Map<string, ReturnType<typeof parseCapturedFrameLabelTemplate>>();

    for (const clip of labelSet.clips) {
        if (!clip.frameLabelsPath) {
            continue;
        }

        const template = await tryLoadFrameLabelTemplate(clip.frameLabelsPath);
        if (!template) {
            continue;
        }

        frameLabelTemplatesByClipId.set(clip.clipId, template);
    }

    const markdown = buildCapturedSpecialistReviewKitMarkdown({
        title: options.title ?? 'Captured Specialist Review Kit - 2026-04-16',
        dataset,
        intakeManifest,
        labelSet,
        decisionSet,
        frameLabelTemplatesByClipId,
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
    const [, , datasetArg, intakeArg, labelsArg, decisionsArg, outputArg] = process.argv;
    const outputPath = await generateCapturedSpecialistReviewKit({
        ...(datasetArg ? { datasetPath: datasetArg } : {}),
        ...(intakeArg ? { intakePath: intakeArg } : {}),
        ...(labelsArg ? { labelsPath: labelsArg } : {}),
        ...(decisionsArg ? { decisionsPath: decisionsArg } : {}),
        ...(outputArg ? { outputPath: outputArg } : {}),
    });

    console.log(JSON.stringify({ outputPath }, null, 2));
};

if (isCliEntrypoint()) {
    void main();
}

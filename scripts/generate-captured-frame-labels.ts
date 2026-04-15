import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
    buildCapturedFrameLabelTemplate,
    getCapturedFrameLabelsTemplatePath,
} from '../src/core/captured-frame-label-template';
import { parseCapturedClipIntakeManifest } from '../src/types/captured-clip-intake';

export interface GenerateCapturedFrameLabelsOptions {
    readonly intakePath?: string;
    readonly outputDir?: string;
    readonly sampleIntervalSeconds?: number;
    readonly overwrite?: boolean;
}

export interface GeneratedCapturedFrameLabelsFile {
    readonly clipId: string;
    readonly outputPath: string;
    readonly action: 'created' | 'skipped-existing';
}

const resolveInputPath = (filePath: string): string =>
    path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

const loadJson = async (filePath: string): Promise<unknown> => {
    const raw = await readFile(resolveInputPath(filePath), 'utf8');
    return JSON.parse(raw);
};

const exists = async (filePath: string): Promise<boolean> => {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
};

export const generateCapturedFrameLabels = async (
    options: GenerateCapturedFrameLabelsOptions = {},
): Promise<GeneratedCapturedFrameLabelsFile[]> => {
    const intake = parseCapturedClipIntakeManifest(
        await loadJson(options.intakePath ?? 'tests/fixtures/captured-clips/intake.v1.json'),
    );
    const outputDir = resolveInputPath(options.outputDir ?? 'tests/fixtures/captured-clips/labels');
    const results: GeneratedCapturedFrameLabelsFile[] = [];

    await mkdir(outputDir, { recursive: true });

    for (const clip of intake.clips) {
        const defaultRelativePath = getCapturedFrameLabelsTemplatePath(clip.clipId);
        const outputPath = path.join(outputDir, path.basename(defaultRelativePath));

        if (!options.overwrite && await exists(outputPath)) {
            results.push({ clipId: clip.clipId, outputPath, action: 'skipped-existing' });
            continue;
        }

        const template = buildCapturedFrameLabelTemplate(clip, {
            ...(options.sampleIntervalSeconds !== undefined
                ? { sampleIntervalSeconds: options.sampleIntervalSeconds }
                : {}),
        });

        await writeFile(outputPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
        results.push({ clipId: clip.clipId, outputPath, action: 'created' });
    }

    return results;
};

const isCliEntrypoint = (): boolean => {
    const entrypoint = process.argv[1];
    if (!entrypoint) return false;

    return import.meta.url === pathToFileURL(entrypoint).href;
};

const main = async (): Promise<void> => {
    const [, , intakeArg, outputDirArg, sampleIntervalArg] = process.argv;
    const results = await generateCapturedFrameLabels({
        ...(intakeArg ? { intakePath: intakeArg } : {}),
        ...(outputDirArg ? { outputDir: outputDirArg } : {}),
        ...(sampleIntervalArg ? { sampleIntervalSeconds: Number(sampleIntervalArg) } : {}),
    });

    console.log(JSON.stringify({ files: results }, null, 2));
};

if (isCliEntrypoint()) {
    void main();
}

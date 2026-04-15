import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
    parseCapturedClipLabelSet,
    summarizeCapturedClipLabelSet,
    type CapturedClipLabelSetSummary,
} from '../src/types/captured-clip-labels';

export interface ValidateCapturedClipLabelsOptions {
    readonly labelsPath?: string;
}

const resolveInputPath = (filePath: string): string =>
    path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

export const validateCapturedClipLabels = async (
    options: ValidateCapturedClipLabelsOptions = {},
): Promise<CapturedClipLabelSetSummary> => {
    const labelsPath = resolveInputPath(options.labelsPath ?? 'tests/fixtures/captured-clips/labels.todo.v1.json');
    const raw = await readFile(labelsPath, 'utf8');
    const labelSet = parseCapturedClipLabelSet(JSON.parse(raw));

    return summarizeCapturedClipLabelSet(labelSet);
};

const isCliEntrypoint = (): boolean => {
    const entrypoint = process.argv[1];
    if (!entrypoint) return false;

    return import.meta.url === pathToFileURL(entrypoint).href;
};

const main = async (): Promise<void> => {
    const [, , labelsArg] = process.argv;
    const report = await validateCapturedClipLabels({
        ...(labelsArg ? { labelsPath: labelsArg } : {}),
    });

    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.readyClipCount === report.totalClips ? 0 : 1;
};

if (isCliEntrypoint()) {
    void main();
}

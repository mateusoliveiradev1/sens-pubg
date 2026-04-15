import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildCapturedBenchmarkPromotion } from '../src/core/captured-golden-promotion';
import { parseCapturedClipIntakeManifest } from '../src/types/captured-clip-intake';
import { parseCapturedBenchmarkReviewDecisionSet } from '../src/types/captured-benchmark-review-decisions';
import { parseCapturedClipLabelSet } from '../src/types/captured-clip-labels';
import type { CapturedBenchmarkPromotionReport } from '../src/core/captured-golden-promotion';

export interface PromoteCapturedClipsOptions {
    readonly intakePath?: string;
    readonly labelsPath?: string;
    readonly reviewDecisionsPath?: string;
    readonly datasetId?: string;
    readonly createdAt?: string;
    readonly outputPath?: string;
    readonly writeDataset?: boolean;
}

export interface PromoteCapturedClipsResult extends CapturedBenchmarkPromotionReport {
    readonly wroteDataset: boolean;
    readonly outputPath?: string;
}

const resolveInputPath = (filePath: string): string =>
    path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

const loadJson = async (filePath: string): Promise<unknown> => {
    const raw = await readFile(resolveInputPath(filePath), 'utf8');
    return JSON.parse(raw);
};

export const promoteCapturedClips = async (options: PromoteCapturedClipsOptions = {}) => {
    const intakeManifest = parseCapturedClipIntakeManifest(
        await loadJson(options.intakePath ?? 'tests/fixtures/captured-clips/intake.v1.json'),
    );
    const labelSet = parseCapturedClipLabelSet(
        await loadJson(options.labelsPath ?? 'tests/fixtures/captured-clips/labels.todo.v1.json'),
    );
    const reviewDecisionSet = options.reviewDecisionsPath
        ? parseCapturedBenchmarkReviewDecisionSet(await loadJson(options.reviewDecisionsPath))
        : undefined;

    const promotion = buildCapturedBenchmarkPromotion({
        datasetId: options.datasetId ?? 'captured-benchmark-draft',
        createdAt: options.createdAt ?? new Date().toISOString(),
        intakeManifest,
        labelSet,
        ...(reviewDecisionSet ? { reviewDecisionSet } : {}),
    });

    if (!promotion.dataset || options.writeDataset === false) {
        return {
            ...promotion,
            wroteDataset: false,
            ...(options.outputPath ? { outputPath: options.outputPath } : {}),
        } satisfies PromoteCapturedClipsResult;
    }

    const outputPath = options.outputPath ?? `tests/goldens/benchmark/${promotion.dataset.datasetId}.json`;
    const resolvedOutputPath = resolveInputPath(outputPath);

    await mkdir(path.dirname(resolvedOutputPath), { recursive: true });
    await writeFile(resolvedOutputPath, `${JSON.stringify(promotion.dataset, null, 2)}\n`, 'utf8');

    return {
        ...promotion,
        wroteDataset: true,
        outputPath,
    } satisfies PromoteCapturedClipsResult;
};

const isCliEntrypoint = (): boolean => {
    const entrypoint = process.argv[1];
    if (!entrypoint) return false;

    return import.meta.url === pathToFileURL(entrypoint).href;
};

const main = async (): Promise<void> => {
    const [, , intakeArg, labelsArg, datasetIdArg, reviewDecisionsArg] = process.argv;
    const report = await promoteCapturedClips({
        ...(intakeArg ? { intakePath: intakeArg } : {}),
        ...(labelsArg ? { labelsPath: labelsArg } : {}),
        ...(datasetIdArg ? { datasetId: datasetIdArg } : {}),
        ...(reviewDecisionsArg ? { reviewDecisionsPath: reviewDecisionsArg } : {}),
    });

    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.dataset ? 0 : 1;
};

if (isCliEntrypoint()) {
    void main();
}

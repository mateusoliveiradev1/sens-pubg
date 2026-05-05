import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildBenchmarkCoverageSummary } from '../src/core/benchmark-coverage';
import { buildCapturedBenchmarkPromotion } from '../src/core/captured-golden-promotion';
import { buildCapturedPromotionMarkdownReport } from '../src/core/captured-promotion-report';
import { parseCapturedClipIntakeManifest } from '../src/types/captured-clip-intake';
import { parseCapturedBenchmarkReviewDecisionSet } from '../src/types/captured-benchmark-review-decisions';
import { parseCapturedClipLabelSet } from '../src/types/captured-clip-labels';
import { parseBenchmarkDataset, type BenchmarkDataset } from '../src/types/benchmark';
import { runBenchmark } from './run-benchmark';
import type { CapturedBenchmarkPromotionReport } from '../src/core/captured-golden-promotion';

export interface PromoteCapturedClipsOptions {
    readonly intakePath?: string;
    readonly labelsPath?: string;
    readonly reviewDecisionsPath?: string;
    readonly datasetId?: string;
    readonly createdAt?: string;
    readonly outputPath?: string;
    readonly writeDataset?: boolean;
    readonly clipIds?: readonly string[];
    readonly targetMaturity?: 'reviewed' | 'golden';
    readonly promotionReason?: string;
    readonly reviewer?: string;
    readonly reportPath?: string;
}

export interface PromoteCapturedClipsResult extends CapturedBenchmarkPromotionReport {
    readonly wroteDataset: boolean;
    readonly outputPath?: string;
    readonly wroteReport: boolean;
    readonly reportPath?: string;
}

const resolveInputPath = (filePath: string): string =>
    path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

const loadJson = async (filePath: string): Promise<unknown> => {
    const raw = await readFile(resolveInputPath(filePath), 'utf8');
    return JSON.parse(raw);
};

async function loadExistingCoverage(datasetId: string) {
    try {
        const raw = await readFile(resolveInputPath(`tests/goldens/benchmark/${datasetId}.json`), 'utf8');
        return buildBenchmarkCoverageSummary(parseBenchmarkDataset(JSON.parse(raw)));
    } catch {
        return undefined;
    }
}

async function runBenchmarkPreview(dataset: BenchmarkDataset | undefined): Promise<boolean> {
    if (!dataset) {
        return false;
    }

    const tempDir = await mkdtemp(path.join(tmpdir(), 'captured-promotion-benchmark-'));
    const tempDatasetPath = path.join(tempDir, `${dataset.datasetId}.json`);
    await writeFile(tempDatasetPath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
    const report = await runBenchmark({ datasetPath: tempDatasetPath });
    return report.passed;
}

export const promoteCapturedClips = async (options: PromoteCapturedClipsOptions = {}) => {
    const intakeManifest = parseCapturedClipIntakeManifest(
        await loadJson(options.intakePath ?? 'tests/fixtures/captured-clips/intake.v1.json'),
    );
    const loadedLabelSet = parseCapturedClipLabelSet(
        await loadJson(options.labelsPath ?? 'tests/fixtures/captured-clips/labels.todo.v1.json'),
    );
    const labelSet = options.clipIds && options.clipIds.length > 0
        ? {
            ...loadedLabelSet,
            clips: loadedLabelSet.clips.filter((clip) => options.clipIds?.includes(clip.clipId)),
        }
        : loadedLabelSet;
    const reviewDecisionSet = options.reviewDecisionsPath
        ? parseCapturedBenchmarkReviewDecisionSet(await loadJson(options.reviewDecisionsPath))
        : undefined;
    const datasetId = options.datasetId ?? 'captured-benchmark-draft';

    const promotion = buildCapturedBenchmarkPromotion({
        datasetId,
        createdAt: options.createdAt ?? new Date().toISOString(),
        intakeManifest,
        labelSet,
        ...(reviewDecisionSet ? { reviewDecisionSet } : {}),
        ...(options.targetMaturity ? { targetMaturity: options.targetMaturity } : {}),
        ...(options.promotionReason ? { promotionReason: options.promotionReason } : {}),
    });
    const benchmarkPassed = await runBenchmarkPreview(promotion.dataset);
    const reportPath = options.reportPath;
    let wroteReport = false;

    if (reportPath) {
        const coverageBefore = await loadExistingCoverage(datasetId);
        const coverageAfter = promotion.dataset ? buildBenchmarkCoverageSummary(promotion.dataset) : undefined;
        const markdownReport = buildCapturedPromotionMarkdownReport({
            generatedAt: options.createdAt ?? new Date().toISOString(),
            selectedClipIds: options.clipIds ?? [],
            intendedMaturity: options.targetMaturity ?? 'reviewed',
            reason: options.promotionReason ?? 'Legacy captured clip promotion.',
            ...(options.reviewer ? { reviewer: options.reviewer } : {}),
            benchmarkPassed,
            promotion,
            ...(coverageBefore ? { coverageBefore } : {}),
            ...(coverageAfter ? { coverageAfter } : {}),
        });
        const resolvedReportPath = resolveInputPath(reportPath);
        await mkdir(path.dirname(resolvedReportPath), { recursive: true });
        await writeFile(resolvedReportPath, markdownReport.markdown, 'utf8');
        wroteReport = true;
    }

    if (!promotion.dataset || options.writeDataset === false) {
        return {
            ...promotion,
            wroteDataset: false,
            wroteReport,
            ...(options.outputPath ? { outputPath: options.outputPath } : {}),
            ...(reportPath ? { reportPath } : {}),
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
        wroteReport,
        ...(reportPath ? { reportPath } : {}),
    } satisfies PromoteCapturedClipsResult;
};

function readOption(args: readonly string[], name: string): string | undefined {
    const index = args.indexOf(name);
    if (index < 0) return undefined;

    return args[index + 1];
}

function readRepeatedOption(args: readonly string[], name: string): readonly string[] {
    const values: string[] = [];

    for (let index = 0; index < args.length; index++) {
        if (args[index] === name && args[index + 1]) {
            values.push(args[index + 1]!);
        }
    }

    return values;
}

function parseFlagOptions(args: readonly string[]): PromoteCapturedClipsOptions {
    const createdAt = new Date().toISOString();
    const reportPath = readOption(args, '--report')
        ?? `docs/benchmark-reports/captured-promotion-${createdAt.slice(0, 10)}.md`;
    const targetMaturity = readOption(args, '--to');
    const reviewDecisionsPath = readOption(args, '--review-decisions') ?? (
        args.includes('--with-review-decisions')
            ? 'tests/fixtures/captured-clips/review-decisions.todo.v1.json'
            : undefined
    );
    const outputPath = readOption(args, '--output');
    const clipIds = readRepeatedOption(args, '--clip');
    const promotionReason = readOption(args, '--reason');
    const reviewer = readOption(args, '--reviewer');

    if (targetMaturity !== undefined && targetMaturity !== 'reviewed' && targetMaturity !== 'golden') {
        throw new Error('--to must be reviewed or golden');
    }

    return {
        intakePath: readOption(args, '--intake') ?? 'tests/fixtures/captured-clips/intake.v1.json',
        labelsPath: readOption(args, '--labels') ?? 'tests/fixtures/captured-clips/labels.todo.v1.json',
        datasetId: readOption(args, '--dataset-id') ?? 'captured-benchmark-draft',
        createdAt,
        writeDataset: args.includes('--write'),
        ...(reviewDecisionsPath ? { reviewDecisionsPath } : {}),
        ...(outputPath ? { outputPath } : {}),
        ...(clipIds.length > 0 ? { clipIds } : {}),
        ...(targetMaturity ? { targetMaturity } : {}),
        ...(promotionReason ? { promotionReason } : {}),
        ...(reviewer ? { reviewer } : {}),
        reportPath,
    };
}

const isCliEntrypoint = (): boolean => {
    const entrypoint = process.argv[1];
    if (!entrypoint) return false;

    return import.meta.url === pathToFileURL(entrypoint).href;
};

const main = async (): Promise<void> => {
    const args = process.argv.slice(2);
    const flagMode = args.some((arg) => arg.startsWith('--'));
    const [intakeArg, labelsArg, datasetIdArg, reviewDecisionsArg] = args;
    const options = flagMode
        ? parseFlagOptions(args)
        : {
            ...(intakeArg ? { intakePath: intakeArg } : {}),
            ...(labelsArg ? { labelsPath: labelsArg } : {}),
            ...(datasetIdArg ? { datasetId: datasetIdArg } : {}),
            ...(reviewDecisionsArg ? { reviewDecisionsPath: reviewDecisionsArg } : {}),
            reportPath: `docs/benchmark-reports/captured-promotion-${new Date().toISOString().slice(0, 10)}.md`,
        };
    const report = await promoteCapturedClips(options);

    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.dataset ? 0 : 1;
};

if (isCliEntrypoint()) {
    void main();
}

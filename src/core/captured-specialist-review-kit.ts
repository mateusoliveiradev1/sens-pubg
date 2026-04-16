import type { BenchmarkClip, BenchmarkDataset } from '@/types/benchmark';
import type { CapturedBenchmarkReviewDecisionSet } from '@/types/captured-benchmark-review-decisions';
import {
    summarizeCapturedFrameLabelTemplate,
    type CapturedFrameLabelTemplate,
} from '@/types/captured-frame-labels';
import type { CapturedClipIntakeClip, CapturedClipIntakeManifest } from '@/types/captured-clip-intake';
import {
    summarizeCapturedClipLabel,
    type CapturedClipLabel,
    type CapturedClipLabelSet,
} from '@/types/captured-clip-labels';
import { buildBenchmarkCoverageSummary } from './benchmark-coverage';

type PendingSpecialistReviewDecision = CapturedBenchmarkReviewDecisionSet['decisions'][number];
type ReviewProvenance = BenchmarkClip['quality']['reviewProvenance'];
type FrameLabelEntry = CapturedFrameLabelTemplate['frames'][number];

export interface CapturedSpecialistReviewKitInput {
    readonly title: string;
    readonly dataset: BenchmarkDataset;
    readonly intakeManifest: CapturedClipIntakeManifest;
    readonly labelSet: CapturedClipLabelSet;
    readonly decisionSet: CapturedBenchmarkReviewDecisionSet;
    readonly frameLabelTemplatesByClipId?: ReadonlyMap<string, CapturedFrameLabelTemplate>;
}

interface FrameStatusCounts {
    tracked: number;
    uncertain: number;
    occluded: number;
    lost: number;
}

const SPECIALIST_REVIEW_MARKER = 'approvedReviewProvenance=`specialist-reviewed`';

const isPendingSpecialistReviewDecision = (decision: PendingSpecialistReviewDecision): boolean => {
    if (decision.approvalStatus !== 'pending') {
        return false;
    }

    if (decision.rationale.startsWith('Validacao especialista proposta automaticamente:')) {
        return true;
    }

    if (decision.notes?.includes(SPECIALIST_REVIEW_MARKER)) {
        return true;
    }

    return false;
};

const createFrameStatusCounts = (): FrameStatusCounts => ({
    tracked: 0,
    uncertain: 0,
    occluded: 0,
    lost: 0,
});

const countFrameStatuses = (frames: readonly FrameLabelEntry[]): FrameStatusCounts => {
    const counts = createFrameStatusCounts();

    for (const frame of frames) {
        const status = frame.label.status;
        if (!status) {
            continue;
        }

        counts[status] += 1;
    }

    return counts;
};

const renderFrameStatusCounts = (counts: FrameStatusCounts): string =>
    `tracked=${counts.tracked}, uncertain=${counts.uncertain}, occluded=${counts.occluded}, lost=${counts.lost}`;

const renderMissingFields = (fields: readonly string[]): string => {
    if (fields.length === 0) {
        return '- Nenhum campo pendente.';
    }

    return fields.map((field) => `- \`${field}\``).join('\n');
};

const renderUnknownCaptureFields = (fields: readonly string[]): string => {
    if (fields.length === 0) {
        return '- Nenhum campo de captura ainda desconhecido no intake.';
    }

    return fields.map((field) => `- \`${field}\``).join('\n');
};

const renderExpectedDiagnoses = (diagnoses: readonly string[]): string =>
    diagnoses.length === 0 ? '`[]` (sem diagnostico travado)' : diagnoses.map((diagnosis) => `\`${diagnosis}\``).join(', ');

const formatSeconds = (value: number | null | undefined): string =>
    value === null || value === undefined ? '`missing`' : `\`${value.toFixed(3)}s\``;

const formatProvenance = (provenance: ReviewProvenance | undefined): string => {
    if (!provenance) {
        return '`unspecified`';
    }

    const parts = [`\`${provenance.source}\``];
    if (provenance.reviewerId) {
        parts.push(`by \`${provenance.reviewerId}\``);
    }

    if (provenance.reviewedAt) {
        parts.push(`at \`${provenance.reviewedAt}\``);
    }

    return parts.join(' ');
};

const renderFrameLabelSummary = (
    frameLabelTemplate: CapturedFrameLabelTemplate | undefined,
    sprayWindow: BenchmarkClip['sprayWindow'] | CapturedClipLabel['sprayWindow'] | undefined,
): string[] => {
    if (!frameLabelTemplate) {
        return [
            '- Frame label summary: `missing`',
            '- Frame label statuses (all samples): `missing`',
            '- Frame label statuses (spray window): `missing`',
        ];
    }

    const summary = summarizeCapturedFrameLabelTemplate(frameLabelTemplate);
    const allStatusCounts = countFrameStatuses(frameLabelTemplate.frames);
    const sprayFrames = frameLabelTemplate.frames.filter((frame) => {
        if (!sprayWindow || sprayWindow.startSeconds === null || sprayWindow.startSeconds === undefined) {
            return false;
        }

        if (sprayWindow.endSeconds === null || sprayWindow.endSeconds === undefined) {
            return false;
        }

        return frame.timestampSeconds >= sprayWindow.startSeconds && frame.timestampSeconds <= sprayWindow.endSeconds;
    });
    const sprayStatusCounts = countFrameStatuses(sprayFrames);

    return [
        `- Frame label summary: \`${summary.readyFrameCount}/${summary.totalFrames}\` sampled frames completos`,
        `- Frame label statuses (all samples): \`${renderFrameStatusCounts(allStatusCounts)}\``,
        `- Frame label statuses (spray window): \`${renderFrameStatusCounts(sprayStatusCounts)}\``,
    ];
};

const renderSpecialistReviewSection = (
    decision: PendingSpecialistReviewDecision,
    benchmarkClip: BenchmarkClip | undefined,
    intakeClip: CapturedClipIntakeClip | undefined,
    label: CapturedClipLabel | undefined,
    frameLabelTemplate: CapturedFrameLabelTemplate | undefined,
): string => {
    const labelSummary = label ? summarizeCapturedClipLabel(label) : undefined;
    const currentReviewStatus = benchmarkClip?.quality.reviewStatus ?? 'missing';
    const currentProvenance = benchmarkClip?.quality.reviewProvenance;
    const frameLabelsPath = label?.frameLabelsPath ?? benchmarkClip?.media.frameLabelsPath ?? 'missing';
    const centerPreviewPath = intakeClip?.media.centerPreviewPath ?? benchmarkClip?.media.previewImagePath ?? 'missing';
    const contactPreviewPath = intakeClip?.media.contactPreviewPath ?? 'missing';
    const videoPath = intakeClip?.media.videoPath ?? benchmarkClip?.media.videoPath ?? 'missing';
    const capture = benchmarkClip?.capture ?? label?.capture;
    const sprayWindow = benchmarkClip?.sprayWindow ?? label?.sprayWindow;
    const intakeQuality = intakeClip?.quality;
    const labels = benchmarkClip?.labels ?? label?.labels;

    return [
        `## ${decision.clipId}`,
        '',
        `- Pending rationale: ${decision.rationale}`,
        `- Pending notes: ${decision.notes ?? 'Sem observacoes adicionais.'}`,
        `- Current review status: \`${currentReviewStatus}\``,
        `- Current review provenance: ${formatProvenance(currentProvenance)}`,
        `- Decision file to update: \`tests/fixtures/captured-clips/review-decisions.todo.v1.json\``,
        '',
        'Evidence bundle:',
        '',
        `- Video: \`${videoPath}\``,
        `- Center preview: \`${centerPreviewPath}\``,
        `- Contact sheet: \`${contactPreviewPath}\``,
        `- Frame labels path: \`${frameLabelsPath}\``,
        '',
        'Current capture facts:',
        '',
        `- Patch version: \`${capture?.patchVersion ?? 'missing'}\``,
        `- Weapon: \`${capture?.weaponId ?? 'missing'}\``,
        `- Distance: \`${capture?.distanceMeters ?? 'missing'}\` meters`,
        `- Stance: \`${capture?.stance ?? 'missing'}\``,
        `- Optic: \`${capture?.optic.opticId ?? 'missing'}:${capture?.optic.stateId ?? 'missing'}\``,
        `- Attachments: muzzle=\`${capture?.attachments.muzzle ?? 'missing'}\`, grip=\`${capture?.attachments.grip ?? 'missing'}\`, stock=\`${capture?.attachments.stock ?? 'missing'}\``,
        `- Spray window: ${formatSeconds(sprayWindow?.startSeconds)} -> ${formatSeconds(sprayWindow?.endSeconds)}`,
        '',
        'Current labeling state:',
        '',
        `- Label readiness: \`${labelSummary?.readyForGoldenLabels ?? false}\``,
        `- Expected diagnoses: ${renderExpectedDiagnoses(labels?.expectedDiagnoses ?? [])}`,
        `- Expected coach mode: \`${labels?.expectedCoachMode ?? 'none'}\``,
        `- Expected tracking tier: \`${labels?.expectedTrackingTier ?? 'missing'}\``,
        ...renderFrameLabelSummary(frameLabelTemplate, sprayWindow ?? { startSeconds: null, endSeconds: null }),
        '',
        'Missing label fields:',
        '',
        renderMissingFields(labelSummary?.missingFieldPaths ?? ['clip not found in labels.todo.v1.json']),
        '',
        'Intake notes:',
        '',
        `- Intake review status: \`${intakeQuality?.reviewStatus ?? 'missing'}\``,
        `- Quality tier: \`${intakeQuality?.qualityTier ?? 'missing'}\``,
        `- Benchmark readiness: \`${intakeQuality?.benchmarkReadiness ?? 'missing'}\``,
        `- Occlusion/compression/reticle: occlusion=\`${intakeQuality?.occlusionLevel ?? 'missing'}\`, compression=\`${intakeQuality?.compressionLevel ?? 'missing'}\`, reticle=\`${intakeQuality?.reticleVisibility ?? 'missing'}\``,
        `- Intake rationale: ${intakeQuality?.rationale ?? 'missing'}`,
        '',
        'Unknown capture fields from intake:',
        '',
        renderUnknownCaptureFields(intakeClip?.unknownCaptureFields ?? []),
        '',
        'Approval write-back:',
        '',
        '- Se a revisao especialista nao aprovar o clip, mantenha esta decisao como `pending`; nao marque `specialist-reviewed`.',
        '- Quando a aprovacao real acontecer, preencher a entrada pendente correspondente com:',
        '  `approvalStatus=approved`, `approvedReviewStatus=golden`, `approvedReviewProvenance=specialist-reviewed`, `approvedBy=<specialist-id>`, `approvedAt=<ISO-8601>`.',
        '- Depois da aprovacao, rodar `npm run promote:captured-clips:with-review-decisions`.',
        '- Em seguida, rodar `npm run validate:sdd-coverage` para confirmar que o gap de provenance especialista realmente fechou.',
        '',
    ].join('\n');
};

export const buildCapturedSpecialistReviewKitMarkdown = (
    input: CapturedSpecialistReviewKitInput,
): string => {
    const coverage = buildBenchmarkCoverageSummary(input.dataset);
    const pendingDecisions = input.decisionSet.decisions
        .filter(isPendingSpecialistReviewDecision)
        .sort((left, right) => left.clipId.localeCompare(right.clipId));
    const intakeByClipId = new Map(input.intakeManifest.clips.map((clip) => [clip.clipId, clip]));
    const labelsByClipId = new Map(input.labelSet.clips.map((clip) => [clip.clipId, clip]));
    const benchmarkByClipId = new Map(input.dataset.clips.map((clip) => [clip.clipId, clip]));
    const remainingSddGapsAfterApproval = coverage.sddGaps.filter((gap) => !gap.includes('specialist-reviewed'));

    const pendingReviewTableRows = pendingDecisions.map((decision) => {
        const benchmarkClip = benchmarkByClipId.get(decision.clipId);
        const label = labelsByClipId.get(decision.clipId);
        const labelSummary = label ? summarizeCapturedClipLabel(label) : undefined;
        const frameLabelTemplate = input.frameLabelTemplatesByClipId?.get(decision.clipId);
        const frameLabelSummary = frameLabelTemplate ? summarizeCapturedFrameLabelTemplate(frameLabelTemplate) : undefined;

        return `| \`${decision.clipId}\` | \`${benchmarkClip?.quality.reviewStatus ?? 'missing'}\` | \`${benchmarkClip?.quality.reviewProvenance?.source ?? 'unspecified'}\` | \`${labelSummary?.readyForGoldenLabels ?? false}\` | \`${frameLabelSummary ? `${frameLabelSummary.readyFrameCount}/${frameLabelSummary.totalFrames}` : 'missing'}\` |`;
    });

    const sections = pendingDecisions.map((decision) =>
        renderSpecialistReviewSection(
            decision,
            benchmarkByClipId.get(decision.clipId),
            intakeByClipId.get(decision.clipId),
            labelsByClipId.get(decision.clipId),
            input.frameLabelTemplatesByClipId?.get(decision.clipId),
        ),
    );

    return [
        `# ${input.title}`,
        '',
        'This guide is generated from the captured benchmark draft, intake manifest, label worksheet, and review decisions.',
        '',
        'Only a real specialist review should flip provenance to `specialist-reviewed`.',
        '',
        '## Commands',
        '',
        '```bash',
        'npm run validate:captured-labels',
        'npm run benchmark:captured',
        'npm run promote:captured-clips:with-review-decisions',
        'npm run validate:sdd-coverage',
        '```',
        '',
        '## What This Kit Can Close',
        '',
        '- Este pacote fecha apenas a pendencia de `specialist-reviewed` quando houver aprovacao humana real.',
        ...(remainingSddGapsAfterApproval.length > 0
            ? remainingSddGapsAfterApproval.map((gap) => `- Mesmo depois disso, ainda continuara faltando: ${gap}`)
            : ['- Nenhuma outra lacuna SDD continuaria aberta depois da aprovacao especialista.']),
        '',
        '## Pending Specialist Reviews',
        '',
        pendingDecisions.length > 0
            ? '| Clip | Current review status | Current provenance | Labels ready | Frame labels ready |'
            : '- Nenhuma revisao especialista pendente encontrada no decision set atual.',
        pendingDecisions.length > 0 ? '|---|---|---|---|---|' : '',
        ...pendingReviewTableRows,
        '',
        '## Specialist Approval Checklist',
        '',
        '- Confirmar que o clip ainda merece `golden` ao revisar video, contact sheet e center preview.',
        '- Confirmar que patch, arma, distancia, stance, optic/state, attachments e spray window continuam defensaveis.',
        '- Confirmar que os frame labels cobrem o trecho de spray com evidencia suficiente para auditoria humana.',
        '- Se houver duvida material, nao escrever `specialist-reviewed`; manter a decisao como `pending` e corrigir corpus/labels primeiro.',
        '',
        ...sections,
        '',
    ].join('\n');
};

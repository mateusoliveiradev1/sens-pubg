import type { CapturedClipIntakeClip, CapturedClipIntakeManifest } from '@/types/captured-clip-intake';
import {
    summarizeCapturedClipLabel,
    type CapturedClipLabel,
    type CapturedClipLabelSet,
} from '@/types/captured-clip-labels';
import { getCapturedFrameLabelsTemplatePath } from './captured-frame-label-template';

export interface CapturedLabelingKitInput {
    readonly title: string;
    readonly intakeManifest: CapturedClipIntakeManifest;
    readonly labelSet: CapturedClipLabelSet;
}

const renderMissingFields = (fields: readonly string[]): string => {
    if (fields.length === 0) {
        return '- No missing fields.';
    }

    return fields.map((field) => `- \`${field}\``).join('\n');
};

const renderClip = (
    intakeClip: CapturedClipIntakeClip | undefined,
    label: CapturedClipLabel,
): string => {
    const summary = summarizeCapturedClipLabel(label);
    const qualityTier = intakeClip?.quality.qualityTier ?? 'missing-intake';
    const centerPreview = intakeClip?.media.centerPreviewPath ?? 'missing';
    const contactPreview = intakeClip?.media.contactPreviewPath ?? 'missing';
    const videoPath = intakeClip?.media.videoPath ?? 'missing';
    const frameLabelsPath = label.frameLabelsPath ?? getCapturedFrameLabelsTemplatePath(label.clipId);
    const metadata = intakeClip
        ? `${intakeClip.media.width}x${intakeClip.media.height}, ${intakeClip.media.fps.toFixed(3)} fps, ${intakeClip.media.durationSeconds.toFixed(3)}s, ${intakeClip.media.codecFourcc}`
        : 'missing intake metadata';

    return [
        `## ${label.clipId}`,
        '',
        `- Preliminary tier: \`${qualityTier}\``,
        `- Video: \`${videoPath}\``,
        `- Metadata: ${metadata}`,
        `- Center preview: \`${centerPreview}\``,
        `- Contact sheet: \`${contactPreview}\``,
        `- Suggested frame labels template: \`${frameLabelsPath}\``,
        `- Ready for golden labels: \`${summary.readyForGoldenLabels}\``,
        '',
        'Missing fields:',
        '',
        renderMissingFields(summary.missingFieldPaths),
        '',
        'Labeling notes:',
        '',
        '- Fill only facts you can verify from the clip or capture context.',
        '- Do not guess patch, weapon, distance, attachments, or diagnoses.',
        '- If the spray window is ambiguous, keep it null and capture a cleaner clip.',
        '- Fill sampled frame labels before copying the template path into `labels.todo.v1.json`.',
        '- Use `tracked`/`uncertain` with x/y coordinates, or `occluded`/`lost` without coordinates.',
        '',
    ].join('\n');
};

export const buildCapturedLabelingKitMarkdown = (input: CapturedLabelingKitInput): string => {
    const intakeByClipId = new Map(input.intakeManifest.clips.map((clip) => [clip.clipId, clip]));
    const clips = input.labelSet.clips.map((label) => renderClip(intakeByClipId.get(label.clipId), label));

    return [
        `# ${input.title}`,
        '',
        'This guide is generated from the captured clip intake manifest and the pending label worksheet.',
        '',
        'Do not guess. The goal is to convert captured clips into benchmark goldens only when the evidence is explicit.',
        '',
        '## Commands',
        '',
        '```bash',
        'npm run validate:captured-labels',
        'npm run generate:captured-frame-labels',
        'npm run label:captured-frames',
        'npm run promote:captured-clips',
        '```',
        '',
        '## Frame Labeler UI',
        '',
        'Run `npm run label:captured-frames`, open the printed localhost URL, select a clip, then click the video to mark `tracked` or `uncertain` coordinates. Use `occluded` or `lost` when the reticle cannot be labeled.',
        '',
        '## Labeling Checklist',
        '',
        '- Patch version',
        '- Weapon',
        '- Distance in meters',
        '- Stance',
        '- Optic and optic state',
        '- Muzzle, grip, and stock',
        '- Spray start and end timestamps',
        '- Frame labels path',
        '- Expected diagnosis and tracking tier',
        '',
        ...clips,
        '',
    ].join('\n');
};

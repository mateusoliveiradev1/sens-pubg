import type { CapturedClipIntakeClip } from '@/types/captured-clip-intake';
import {
    parseCapturedFrameLabelTemplate,
    summarizeCapturedFrameLabelTemplate,
    type CapturedFrameLabelTemplate,
    type CapturedFrameLabelTemplateSummary,
} from '@/types/captured-frame-labels';

export interface BuildCapturedFrameLabelTemplateOptions {
    readonly sampleIntervalSeconds?: number;
    readonly createdAt?: string;
}

export { summarizeCapturedFrameLabelTemplate };
export type { CapturedFrameLabelTemplate, CapturedFrameLabelTemplateSummary };

const toFixedNumber = (value: number, digits = 3): number => Number(value.toFixed(digits));

const buildSampleTimestamps = (durationSeconds: number, sampleIntervalSeconds: number): number[] => {
    const timestamps: number[] = [];

    for (let timestamp = 0; timestamp <= durationSeconds; timestamp += sampleIntervalSeconds) {
        timestamps.push(toFixedNumber(timestamp));
    }

    const lastTimestamp = toFixedNumber(durationSeconds);
    if (timestamps[timestamps.length - 1] !== lastTimestamp) {
        timestamps.push(lastTimestamp);
    }

    return timestamps;
};

export const getCapturedFrameLabelsTemplatePath = (clipId: string): string =>
    `tests/fixtures/captured-clips/labels/${clipId}.frames.todo.json`;

export const buildCapturedFrameLabelTemplate = (
    clip: CapturedClipIntakeClip,
    options: BuildCapturedFrameLabelTemplateOptions = {},
): CapturedFrameLabelTemplate => {
    const sampleIntervalSeconds = options.sampleIntervalSeconds ?? 1;
    const timestamps = buildSampleTimestamps(clip.media.durationSeconds, sampleIntervalSeconds);
    const frameCount = Math.max(1, clip.media.frameCount);
    const template = {
        schemaVersion: 1,
        clipId: clip.clipId,
        sourceVideoPath: clip.media.videoPath,
        createdAt: options.createdAt ?? new Date().toISOString(),
        sampleIntervalSeconds,
        frameSize: {
            width: clip.media.width,
            height: clip.media.height,
        },
        frames: timestamps.map((timestampSeconds) => ({
            frameIndex: Math.min(frameCount - 1, Math.round(timestampSeconds * clip.media.fps)),
            timestampSeconds,
            label: {
                status: null,
                x: null,
                y: null,
            },
        })),
    };

    return parseCapturedFrameLabelTemplate(template);
};

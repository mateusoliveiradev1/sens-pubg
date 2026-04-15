import { z } from 'zod';
import type { TrackingFrameStatus } from './engine';

const CAPTURED_FRAME_LABEL_TEMPLATE_SCHEMA_VERSION = 1 as const;

const trackingFrameStatusSchema = z.enum(['tracked', 'occluded', 'lost', 'uncertain']);
const nullableCoordinateSchema = z.number().nonnegative().nullable();

export const capturedFrameAnnotationSchema = z.object({
    status: trackingFrameStatusSchema.nullable(),
    x: nullableCoordinateSchema.optional().default(null),
    y: nullableCoordinateSchema.optional().default(null),
    notes: z.string().min(1).optional(),
});

export const capturedFrameLabelSchema = z.object({
    frameIndex: z.number().int().nonnegative(),
    timestampSeconds: z.number().nonnegative(),
    label: capturedFrameAnnotationSchema,
});

export const capturedFrameLabelTemplateSchema = z
    .object({
        schemaVersion: z.literal(CAPTURED_FRAME_LABEL_TEMPLATE_SCHEMA_VERSION),
        clipId: z.string().min(1),
        sourceVideoPath: z.string().min(1),
        createdAt: z.string().datetime(),
        sampleIntervalSeconds: z.number().positive(),
        frameSize: z.object({
            width: z.number().int().positive(),
            height: z.number().int().positive(),
        }),
        frames: z.array(capturedFrameLabelSchema).min(1),
    })
    .superRefine((template, ctx) => {
        for (let index = 0; index < template.frames.length; index++) {
            const frame = template.frames[index]!;
            const { status, x, y } = frame.label;
            const isVisible = status === 'tracked' || status === 'uncertain';

            if (isVisible && (x === null || y === null || x === undefined || y === undefined)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['frames', index, 'label'],
                    message: 'frames visiveis precisam de coordenadas x/y',
                });
            }

            if (x !== null && x !== undefined && x >= template.frameSize.width) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['frames', index, 'label', 'x'],
                    message: 'x deve ficar dentro da largura do frame',
                });
            }

            if (y !== null && y !== undefined && y >= template.frameSize.height) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['frames', index, 'label', 'y'],
                    message: 'y deve ficar dentro da altura do frame',
                });
            }
        }
    });

export type CapturedFrameAnnotation = z.infer<typeof capturedFrameAnnotationSchema>;
export type CapturedFrameLabel = z.infer<typeof capturedFrameLabelSchema>;
export type CapturedFrameLabelTemplate = z.infer<typeof capturedFrameLabelTemplateSchema>;

export interface CapturedFrameLabelTemplateSummary {
    readonly clipId: string;
    readonly totalFrames: number;
    readonly readyFrameCount: number;
    readonly missingFrameCount: number;
    readonly missingFrames: readonly {
        readonly frameIndex: number;
        readonly timestampSeconds: number;
        readonly missingFieldPaths: readonly string[];
    }[];
}

export const parseCapturedFrameLabelTemplate = (value: unknown): CapturedFrameLabelTemplate =>
    capturedFrameLabelTemplateSchema.parse(value);

const isVisibleStatus = (status: TrackingFrameStatus | null): boolean =>
    status === 'tracked' || status === 'uncertain';

const getMissingFieldPaths = (frame: CapturedFrameLabel): string[] => {
    const missing: string[] = [];

    if (frame.label.status === null) {
        missing.push('label.status');
        return missing;
    }

    if (isVisibleStatus(frame.label.status)) {
        if (frame.label.x === null || frame.label.x === undefined) {
            missing.push('label.x');
        }

        if (frame.label.y === null || frame.label.y === undefined) {
            missing.push('label.y');
        }
    }

    return missing;
};

export const summarizeCapturedFrameLabelTemplate = (
    template: CapturedFrameLabelTemplate,
): CapturedFrameLabelTemplateSummary => {
    const missingFrames = template.frames
        .map((frame) => ({
            frameIndex: frame.frameIndex,
            timestampSeconds: frame.timestampSeconds,
            missingFieldPaths: getMissingFieldPaths(frame),
        }))
        .filter((frame) => frame.missingFieldPaths.length > 0);

    return {
        clipId: template.clipId,
        totalFrames: template.frames.length,
        readyFrameCount: template.frames.length - missingFrames.length,
        missingFrameCount: missingFrames.length,
        missingFrames,
    };
};

import { describe, expect, it } from 'vitest';
import { asMilliseconds, asPixels } from '@/types/branded';
import type { TrackingFrameObservation } from '@/types/engine';
import { createTrackingTimeline } from './tracking-timeline';

function makeFrame(
    frame: number,
    timestamp: number,
    status: TrackingFrameObservation['status'],
    disturbance: Partial<TrackingFrameObservation['exogenousDisturbance']> = {},
    confidence = 0.9,
    reacquisitionFrames?: number
): TrackingFrameObservation {
    const base = {
        frame,
        timestamp: asMilliseconds(timestamp),
        status,
        confidence,
        visiblePixels: status === 'lost' ? 0 : 18,
        colorState: 'red' as const,
        exogenousDisturbance: {
            muzzleFlash: disturbance.muzzleFlash ?? 0,
            blur: disturbance.blur ?? 0,
            shake: disturbance.shake ?? 0,
            occlusion: disturbance.occlusion ?? 0,
        },
        x: asPixels(100),
        y: asPixels(100),
    };

    if (reacquisitionFrames === undefined) {
        return base;
    }

    return {
        ...base,
        reacquisitionFrames,
    };
}

describe('createTrackingTimeline', () => {
    it('groups contiguous status windows and summarizes disturbance-heavy segments', () => {
        const timeline = createTrackingTimeline([
            makeFrame(0, 1_000, 'tracked'),
            makeFrame(1, 1_016, 'tracked', { shake: 0.35 }),
            makeFrame(2, 1_032, 'uncertain', { blur: 0.52 }, 0.64),
            makeFrame(3, 1_048, 'uncertain', { blur: 0.68 }, 0.58, 2),
            makeFrame(4, 1_064, 'lost', { occlusion: 1 }, 0.1),
            makeFrame(5, 1_420, 'tracked', { shake: 0.74 }, 0.88, 1),
        ]);

        expect(timeline.summary).toEqual({
            totalFrames: 6,
            trackedFrames: 3,
            attentionFrames: 3,
            lostFrames: 1,
            trackedSegments: 2,
            attentionSegments: 2,
            worstReacquisitionFrames: 2,
        });

        expect(timeline.segments).toHaveLength(4);
        expect(timeline.segments[0]).toMatchObject({
            status: 'tracked',
            startMs: 1_000,
            endMs: 1_016,
            frameCount: 2,
            dominantDisturbance: null,
        });
        expect(timeline.segments[1]).toMatchObject({
            status: 'uncertain',
            frameCount: 2,
            dominantDisturbance: 'blur',
            maxReacquisitionFrames: 2,
        });
        expect(timeline.segments[2]).toMatchObject({
            status: 'lost',
            frameCount: 1,
            dominantDisturbance: 'occlusion',
        });
        expect(timeline.segments[3]).toMatchObject({
            status: 'tracked',
            startMs: 1_420,
            dominantDisturbance: 'shake',
        });
    });

    it('returns an empty timeline when there are no tracking frames', () => {
        expect(createTrackingTimeline([])).toEqual({
            segments: [],
            summary: {
                totalFrames: 0,
                trackedFrames: 0,
                attentionFrames: 0,
                lostFrames: 0,
                trackedSegments: 0,
                attentionSegments: 0,
                worstReacquisitionFrames: 0,
            },
        });
    });
});

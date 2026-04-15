import { describe, expect, it } from 'vitest';
import { ang_x, ang_y, delta_theta, fov_v } from './projection-math';

describe('exact projection math', () => {
    it('derives vertical FOV from horizontal FOV and variable aspect ratio', () => {
        expect(fov_v(90, 16 / 9)).toBeCloseTo(58.7155070856, 10);
        expect(fov_v(90, 21 / 9)).toBeCloseTo(46.3971810273, 10);
        expect(fov_v(103, 16 / 9)).toBeCloseTo(70.5328004329, 10);
    });

    it('projects horizontal pixel positions to exact yaw angles', () => {
        expect(ang_x(960, 1920, 90)).toBeCloseTo(0, 10);
        expect(ang_x(1920, 1920, 90)).toBeCloseTo(45, 10);
        expect(ang_x(1440, 1920, 90)).toBeCloseTo(26.5650511771, 10);
        expect(ang_x(480, 1920, 90)).toBeCloseTo(-26.5650511771, 10);
    });

    it('projects vertical pixel positions to exact pitch angles', () => {
        const verticalFov = fov_v(90, 16 / 9);

        expect(ang_y(540, 1080, verticalFov)).toBeCloseTo(0, 10);
        expect(ang_y(0, 1080, verticalFov)).toBeCloseTo(29.3577535428, 10);
        expect(ang_y(270, 1080, verticalFov)).toBeCloseTo(15.7086378290, 10);
        expect(ang_y(810, 1080, verticalFov)).toBeCloseTo(-15.7086378290, 10);
    });

    it('returns exact angular delta between two screen points', () => {
        const delta = delta_theta(
            { x: 960, y: 540 },
            { x: 1440, y: 270 },
            { widthPx: 1920, heightPx: 1080, horizontalFovDegrees: 90 }
        );

        expect(delta.yawDegrees).toBeCloseTo(26.5650511771, 10);
        expect(delta.pitchDegrees).toBeCloseTo(15.7086378290, 10);
        expect(delta.magnitudeDegrees).toBeCloseTo(30.8620032805, 10);
    });
});

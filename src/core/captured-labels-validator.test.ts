import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateCapturedClipLabels } from '../../scripts/validate-captured-clip-labels';

const labelsPath = fileURLToPath(new URL('../../tests/fixtures/captured-clips/labels.todo.v1.json', import.meta.url));

describe('captured clip label validator', () => {
    it('summarizes the captured starter corpus as ready for golden promotion', async () => {
        const report = await validateCapturedClipLabels({ labelsPath });

        expect(report.readyClipCount).toBe(report.totalClips);
        expect(report.totalClips).toBe(report.clips.length);
        expect(report.totalClips).toBeGreaterThanOrEqual(5);
        expect(report.clips.every((clip) => clip.readyForGoldenLabels)).toBe(true);
        expect(report.clips.every((clip) => clip.missingFieldPaths.length === 0)).toBe(true);
        expect(report.clips.some((clip) => clip.clipId === 'captured-clip5-2026-04-16')).toBe(true);
    });
});

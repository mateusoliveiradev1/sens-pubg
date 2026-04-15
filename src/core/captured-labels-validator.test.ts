import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateCapturedClipLabels } from '../../scripts/validate-captured-clip-labels';

const labelsPath = fileURLToPath(new URL('../../tests/fixtures/captured-clips/labels.todo.v1.json', import.meta.url));

describe('captured clip label validator', () => {
    it('summarizes the captured starter corpus as ready for golden promotion', async () => {
        const report = await validateCapturedClipLabels({ labelsPath });

        expect(report.readyClipCount).toBe(4);
        expect(report.totalClips).toBe(4);
        expect(report.clips.every((clip) => clip.readyForGoldenLabels)).toBe(true);
        expect(report.clips.every((clip) => clip.missingFieldPaths.length === 0)).toBe(true);
    });
});

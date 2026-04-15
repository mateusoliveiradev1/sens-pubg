import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseBenchmarkDataset } from '@/types/benchmark';
import { promoteCapturedClips } from '../../scripts/promote-captured-clips';

describe('promoteCapturedClips', () => {
    it('writes the captured benchmark draft file to disk when labels are promotion-ready', async () => {
        const tempDir = await mkdtemp(path.join(tmpdir(), 'captured-benchmark-promotion-'));
        const outputPath = path.join(tempDir, 'captured-benchmark-draft.json');

        const report = await promoteCapturedClips({
            intakePath: 'tests/fixtures/captured-clips/intake.v1.json',
            labelsPath: 'tests/fixtures/captured-clips/labels.todo.v1.json',
            datasetId: 'captured-benchmark-draft',
            outputPath,
        });

        const writtenDataset = parseBenchmarkDataset(
            JSON.parse(await readFile(outputPath, 'utf8'))
        );

        expect(report.dataset).toBeDefined();
        expect(report.outputPath).toBe(outputPath);
        expect(report.wroteDataset).toBe(true);
        expect(report.goldenClipCount).toBe(0);
        expect(writtenDataset).toEqual(report.dataset);
        expect(writtenDataset.clips.map((clip) => clip.clipId)).toEqual([
            'captured-clip1-2026-04-14',
            'captured-clip2-2026-04-14',
            'captured-clip3-2026-04-14',
            'captured-clip4-2026-04-14',
        ]);
        expect(writtenDataset.clips.every((clip) => clip.quality.sourceType === 'captured')).toBe(true);
    });
});

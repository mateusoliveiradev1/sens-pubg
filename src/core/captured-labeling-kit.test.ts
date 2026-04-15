import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCapturedClipIntakeManifest } from '@/types/captured-clip-intake';
import { parseCapturedClipLabelSet } from '@/types/captured-clip-labels';
import { buildCapturedLabelingKitMarkdown } from './captured-labeling-kit';

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

describe('captured labeling kit markdown', () => {
    it('renders a human labeling guide with previews, ready status, and promotion commands', () => {
        const intakeManifest = parseCapturedClipIntakeManifest(readJson('tests/fixtures/captured-clips/intake.v1.json'));
        const labelSet = parseCapturedClipLabelSet(readJson('tests/fixtures/captured-clips/labels.todo.v1.json'));

        const markdown = buildCapturedLabelingKitMarkdown({
            title: 'Captured Clip Labeling Kit - 2026-04-14',
            intakeManifest,
            labelSet,
        });

        expect(markdown).toContain('# Captured Clip Labeling Kit - 2026-04-14');
        expect(markdown).toContain('captured-clip1-2026-04-14');
        expect(markdown).toContain('candidate-clean');
        expect(markdown).toContain('tests/fixtures/captured-clips/previews/clip1_center.jpg');
        expect(markdown).toContain('Ready for golden labels: `true`');
        expect(markdown).toContain('- No missing fields.');
        expect(markdown).toContain('npm run validate:captured-labels');
        expect(markdown).toContain('npm run generate:captured-frame-labels');
        expect(markdown).toContain('npm run label:captured-frames');
        expect(markdown).toContain('npm run promote:captured-clips');
        expect(markdown).toContain('open the printed localhost URL');
        expect(markdown).toContain('tests/fixtures/captured-clips/labels/captured-clip1-2026-04-14.frames.todo.json');
        expect(markdown).toContain('Do not guess');
        expect(markdown).toContain('Fill sampled frame labels before copying the template path');
        expect(markdown).toContain('Use `tracked`/`uncertain` with x/y coordinates');
        expect(markdown).toContain('## captured-clip2-2026-04-14');
    });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseBenchmarkDataset } from '@/types/benchmark';
import { parseCapturedBenchmarkReviewDecisionSet } from '@/types/captured-benchmark-review-decisions';
import { parseCapturedFrameLabelTemplate } from '@/types/captured-frame-labels';
import { parseCapturedClipIntakeManifest } from '@/types/captured-clip-intake';
import { parseCapturedClipLabelSet } from '@/types/captured-clip-labels';
import { buildCapturedSpecialistReviewKitMarkdown } from './captured-specialist-review-kit';

const readJson = (filePath: string): unknown => JSON.parse(readFileSync(filePath, 'utf8'));

describe('captured specialist review kit markdown', () => {
    it('renders the pending specialist review packet with clip evidence and write-back instructions', () => {
        const dataset = parseBenchmarkDataset(readJson('tests/goldens/benchmark/captured-benchmark-draft.json'));
        const intakeManifest = parseCapturedClipIntakeManifest(readJson('tests/fixtures/captured-clips/intake.v1.json'));
        const labelSet = parseCapturedClipLabelSet(readJson('tests/fixtures/captured-clips/labels.todo.v1.json'));
        const decisionSet = parseCapturedBenchmarkReviewDecisionSet(readJson('tests/fixtures/captured-clips/review-decisions.todo.v1.json'));
        const frameLabelTemplatesByClipId = new Map([
            [
                'captured-clip1-2026-04-14',
                parseCapturedFrameLabelTemplate(
                    readJson('tests/fixtures/captured-clips/labels/captured-clip1-2026-04-14.frames.todo.json'),
                ),
            ],
        ]);

        const markdown = buildCapturedSpecialistReviewKitMarkdown({
            title: 'Captured Specialist Review Kit - 2026-04-16',
            dataset,
            intakeManifest,
            labelSet,
            decisionSet,
            frameLabelTemplatesByClipId,
        });

        expect(markdown).toContain('# Captured Specialist Review Kit - 2026-04-16');
        expect(markdown).toContain('Only a real specialist review should flip provenance to `specialist-reviewed`.');
        expect(markdown).toContain('captured-clip1-2026-04-14');
        expect(markdown).toContain('`codex-assisted`');
        expect(markdown).toContain('tests/fixtures/captured-clips/previews/clip1_center.jpg');
        expect(markdown).toContain('tests/fixtures/captured-clips/previews/clip1_contact.jpg');
        expect(markdown).toContain('tests/fixtures/captured-clips/labels/captured-clip1-2026-04-14.frames.todo.json');
        expect(markdown).toContain('Frame label summary: `17/17` sampled frames completos');
        expect(markdown).toContain('Frame label statuses (spray window): `tracked=1, uncertain=2, occluded=0, lost=0`');
        expect(markdown).toContain('approvalStatus=approved');
        expect(markdown).toContain('npm run promote:captured-clips:with-review-decisions');
        expect(markdown).toContain('Adicionar pelo menos 1 clip capturado no patch atual 41.1.');
        expect(markdown).toContain('Adicionar pelo menos 1 optic/optic state capturado distinto ao corpus SDD.');
    });

    it('renders an explicit empty-state when no pending specialist review exists', () => {
        const dataset = parseBenchmarkDataset(readJson('tests/goldens/benchmark/captured-benchmark-draft.json'));
        const intakeManifest = parseCapturedClipIntakeManifest(readJson('tests/fixtures/captured-clips/intake.v1.json'));
        const labelSet = parseCapturedClipLabelSet(readJson('tests/fixtures/captured-clips/labels.todo.v1.json'));
        const decisionSet = parseCapturedBenchmarkReviewDecisionSet({
            schemaVersion: 1,
            decisionSetId: 'captured-review-decisions-empty',
            intakeManifestId: intakeManifest.manifestId,
            labelSetId: labelSet.labelSetId,
            createdAt: '2026-04-16T03:00:00.000Z',
            decisions: [],
        });

        const markdown = buildCapturedSpecialistReviewKitMarkdown({
            title: 'Captured Specialist Review Kit - Empty',
            dataset,
            intakeManifest,
            labelSet,
            decisionSet,
        });

        expect(markdown).toContain('# Captured Specialist Review Kit - Empty');
        expect(markdown).toContain('Nenhuma revisao especialista pendente encontrada no decision set atual.');
    });
});

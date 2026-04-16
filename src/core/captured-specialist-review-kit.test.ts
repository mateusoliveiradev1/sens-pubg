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
        const decisionSet = parseCapturedBenchmarkReviewDecisionSet({
            schemaVersion: 1,
            decisionSetId: 'captured-review-decisions-pending-specialist',
            intakeManifestId: intakeManifest.manifestId,
            labelSetId: labelSet.labelSetId,
            createdAt: '2026-04-16T18:00:00.000Z',
            decisions: [
                {
                    clipId: 'captured-clip5-2026-04-16',
                    proposedReviewStatus: 'golden',
                    approvalStatus: 'pending',
                    approvedReviewStatus: null,
                    approvedReviewProvenance: null,
                    approvedBy: null,
                    approvedAt: null,
                    rationale: 'Validacao especialista proposta automaticamente: clip `captured-clip5-2026-04-16` fecha o slot 41.1 com optic distinto, mas ainda precisa de aprovacao humana real.',
                    notes: 'Aprovacao pendente deve registrar approvedBy/approvedAt e approvedReviewProvenance=`specialist-reviewed` quando a revisao especialista concluir.',
                },
            ],
        });
        const frameLabelTemplatesByClipId = new Map([
            [
                'captured-clip5-2026-04-16',
                parseCapturedFrameLabelTemplate(
                    readJson('tests/fixtures/captured-clips/labels/captured-clip5-2026-04-16.frames.todo.json'),
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
        expect(markdown).toContain('captured-clip5-2026-04-16');
        expect(markdown).toContain('`machine-assisted`');
        expect(markdown).toContain('tests/fixtures/captured-clips/previews/clip5_center.jpg');
        expect(markdown).toContain('tests/fixtures/captured-clips/previews/clip5_contact.jpg');
        expect(markdown).toContain('tests/fixtures/captured-clips/labels/captured-clip5-2026-04-16.frames.todo.json');
        expect(markdown).toContain('Frame label summary: `17/17` sampled frames completos');
        expect(markdown).toContain('Frame label statuses (spray window): `tracked=4, uncertain=0, occluded=0, lost=0`');
        expect(markdown).toContain('approvalStatus=approved');
        expect(markdown).toContain('npm run promote:captured-clips:with-review-decisions');
        expect(markdown).toContain('Nenhuma outra lacuna SDD continuaria aberta depois da aprovacao especialista.');
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

import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseBenchmarkDataset } from '@/types/benchmark';
import {
    parsePromoteCapturedClipFlagOptions,
    promoteCapturedClips,
} from '../../scripts/promote-captured-clips';

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
        expect(writtenDataset.clips.length).toBeGreaterThanOrEqual(5);
        expect(writtenDataset.clips.map((clip) => clip.clipId)).toEqual(expect.arrayContaining([
            'captured-clip1-2026-04-14',
            'captured-clip2-2026-04-14',
            'captured-clip3-2026-04-14',
            'captured-clip4-2026-04-14',
            'captured-clip5-2026-04-16',
        ]));
        expect(writtenDataset.clips.every((clip) => clip.quality.sourceType === 'captured')).toBe(true);
        expect(report.consent.every((clip) => clip.consentStatus === 'label_review')).toBe(true);
    });

    it('accepts an explicit consent path and blocks clips missing from that manifest', async () => {
        const tempDir = await mkdtemp(path.join(tmpdir(), 'captured-benchmark-consent-'));
        const consentPath = path.join(tempDir, 'empty-consent.json');
        await writeFile(consentPath, JSON.stringify({
            schemaVersion: 1,
            manifestId: 'custom-consent',
            createdAt: '2026-04-14T19:00:00.000Z',
            clips: [
                {
                    clipId: 'unrelated-clip',
                    contributorRef: 'fixture-contributor-001',
                    consentCapturedAt: '2026-04-14T18:40:00.000Z',
                    consentStatus: 'label_review',
                    allowedPurposes: ['internal_validation'],
                    trainabilityAuthorized: false,
                    rawClipStorage: 'private_only',
                    derivativeScope: 'metadata_and_report',
                    redistributionAllowed: false,
                    reviewerRef: 'fixture-maintainer',
                    reviewedAt: '2026-04-14T19:00:00.000Z',
                    transitionReason: 'Custom consent fixture for parser coverage.',
                },
            ],
        }), 'utf8');

        const report = await promoteCapturedClips({
            intakePath: 'tests/fixtures/captured-clips/intake.v1.json',
            labelsPath: 'tests/fixtures/captured-clips/labels.todo.v1.json',
            consentPath,
            clipIds: ['captured-clip1-2026-04-14'],
            writeDataset: false,
        });

        expect(report.dataset).toBeUndefined();
        expect(report.wroteDataset).toBe(false);
        expect(report.blockedClips.some((clip) => clip.reason === 'missing-consent')).toBe(true);
    });

    it('parses the --consent flag for CLI mode', () => {
        const options = parsePromoteCapturedClipFlagOptions([
            '--consent',
            'tests/fixtures/captured-clips/consent.todo.v1.json',
            '--clip',
            'captured-clip1-2026-04-14',
            '--to',
            'reviewed',
        ]);

        expect(options.consentPath).toBe('tests/fixtures/captured-clips/consent.todo.v1.json');
        expect(options.clipIds).toEqual(['captured-clip1-2026-04-14']);
        expect(options.targetMaturity).toBe('reviewed');
    });
});

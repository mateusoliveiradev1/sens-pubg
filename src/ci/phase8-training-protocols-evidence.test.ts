import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    requiredEvidenceRows,
    verifyPhase8TrainingProtocols,
    type Phase8EvidenceRow,
} from '../../scripts/verify-phase8-training-protocols';

const checklistPath = '.planning/phases/08-complete-training-protocols/08-VERIFY-CHECKLIST.md';

function createWorkspace() {
    const root = mkdtempSync(join(tmpdir(), 'phase8-training-evidence-'));
    mkdirSync(join(root, '.planning/phases/08-complete-training-protocols'), { recursive: true });

    return root;
}

function writeChecklist(
    root: string,
    rows: readonly Phase8EvidenceRow[],
    statusById: Readonly<Record<string, string>> = {},
) {
    writeFileSync(join(root, checklistPath), [
        '# Phase 8 Checklist',
        '',
        '| Row ID | Evidence | Command/Test | Result | Artifact path | Remaining gap | Status |',
        '|---|---|---|---|---|---|---|',
        ...rows.map((row) => [
            `\`${row.id}\``,
            row.label,
            'fixture command',
            'fixture result',
            'fixture artifact',
            'None',
            statusById[row.id] ?? 'PASS',
        ].join(' | ')).map((row) => `| ${row} |`),
    ].join('\n'));
}

describe('Phase 8 training protocol evidence helper', () => {
    it('passes when every required row has evidence and status', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredEvidenceRows);

        const report = verifyPhase8TrainingProtocols({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(true);
        expect(report.finalStatus).toBe('Delivered');
        expect(report.missingEvidenceRows).toEqual([]);
    });

    it('fails when downgrade.matrix is absent from the checklist', () => {
        const root = createWorkspace();
        writeChecklist(
            root,
            requiredEvidenceRows.filter((row) => row.id !== 'downgrade.matrix'),
        );

        const report = verifyPhase8TrainingProtocols({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(false);
        expect(report.finalStatus).toBe('Blocked');
        expect(report.missingEvidenceRows).toContain('downgrade.matrix');
    });

    it('fails when a required row is marked MISSING', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredEvidenceRows, {
            'commands.benchmark_gate': 'MISSING',
        });

        const report = verifyPhase8TrainingProtocols({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(false);
        expect(report.rowsMarkedMissing).toEqual(['commands.benchmark_gate']);
    });

    it('allows PENDING rows while keeping final status Partial', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredEvidenceRows, {
            'commands.vitest': 'PENDING',
        });

        const report = verifyPhase8TrainingProtocols({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(true);
        expect(report.finalStatus).toBe('Partial');
        expect(report.pendingRows).toEqual(['commands.vitest']);
    });
});

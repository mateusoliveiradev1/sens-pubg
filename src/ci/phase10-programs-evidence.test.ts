import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    requiredPhase10EvidenceRows,
    verifyPhase10Programs,
    type Phase10EvidenceRow,
} from '../../scripts/verify-phase10-programs';

const checklistPath = '.planning/phases/10-guided-pro-training-programs/10-VERIFY-CHECKLIST.md';

function createWorkspace() {
    const root = mkdtempSync(join(tmpdir(), 'phase10-programs-evidence-'));
    mkdirSync(join(root, '.planning/phases/10-guided-pro-training-programs'), { recursive: true });

    return root;
}

function writeChecklist(
    root: string,
    rows: readonly Phase10EvidenceRow[],
    statusById: Readonly<Record<string, string>> = {},
    remainingGapById: Readonly<Record<string, string>> = {},
    finalStatus = 'Delivered',
) {
    writeFileSync(join(root, checklistPath), [
        '# Phase 10 Checklist',
        '',
        `Final status: ${finalStatus}.`,
        '',
        '| Row ID | Evidence | Command/Test | Result | Artifact path | Remaining gap | Status |',
        '|---|---|---|---|---|---|---|',
        ...rows.map((row) => [
            `\`${row.id}\``,
            row.label,
            'fixture command',
            'fixture result',
            'fixture artifact',
            remainingGapById[row.id] ?? 'None',
            statusById[row.id] ?? 'PASS',
        ].join(' | ')).map((row) => `| ${row} |`),
    ].join('\n'));
}

describe('Phase 10 guided programs evidence helper', () => {
    it('passes when every required row has evidence and status', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredPhase10EvidenceRows);

        const report = verifyPhase10Programs({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(true);
        expect(report.statusDeclarationValid).toBe(true);
        expect(report.blockersExplicit).toBe(true);
        expect(report.finalStatus).toBe('Delivered');
    });

    it('fails when the program route row is absent from the checklist', () => {
        const root = createWorkspace();
        writeChecklist(
            root,
            requiredPhase10EvidenceRows.filter((row) => row.id !== 'ui.program_route'),
        );

        const report = verifyPhase10Programs({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(false);
        expect(report.finalStatus).toBe('Blocked');
        expect(report.missingEvidenceRows).toContain('ui.program_route');
    });

    it('requires final command rows before a checklist can pass', () => {
        const root = createWorkspace();
        writeChecklist(
            root,
            requiredPhase10EvidenceRows.filter((row) => row.id !== 'commands.verify_phase10'),
        );

        const report = verifyPhase10Programs({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(false);
        expect(report.missingEvidenceRows).toContain('commands.verify_phase10');
    });

    it('allows partial delivery only when remaining gaps are explicit and declared', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredPhase10EvidenceRows, {
            'playwright.program_matrix': 'PENDING',
        }, {
            'playwright.program_matrix': 'Browser screenshots still pending.',
        }, 'Partially delivered');

        const report = verifyPhase10Programs({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(true);
        expect(report.finalStatus).toBe('Partially delivered');
        expect(report.statusDeclarationValid).toBe(true);
        expect(report.blockersExplicit).toBe(true);
        expect(report.pendingRows).toEqual(['playwright.program_matrix']);
    });

    it('fails partial rows that hide their remaining gap', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredPhase10EvidenceRows, {
            'migration.target_db': 'PENDING',
        }, {}, 'Partially delivered');

        const report = verifyPhase10Programs({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(true);
        expect(report.blockersExplicit).toBe(false);
        expect(report.rowsNeedingExplicitGaps).toEqual(['migration.target_db']);
    });

    it('keeps the npm script registered', () => {
        const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
            readonly scripts?: Record<string, string>;
        };

        expect(packageJson.scripts?.['verify:phase10:programs']).toBe('tsx scripts/verify-phase10-programs.ts');
    });
});

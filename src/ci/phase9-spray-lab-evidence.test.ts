import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    requiredPhase9EvidenceRows,
    verifyPhase9SprayLab,
    type Phase9EvidenceRow,
} from '../../scripts/verify-phase9-spray-lab';

const checklistPath = '.planning/phases/09-pubg-spray-lab-session-runner-and-benchmark/09-VERIFY-CHECKLIST.md';

function createWorkspace() {
    const root = mkdtempSync(join(tmpdir(), 'phase9-spray-lab-evidence-'));
    mkdirSync(join(root, '.planning/phases/09-pubg-spray-lab-session-runner-and-benchmark'), { recursive: true });

    return root;
}

function writeChecklist(
    root: string,
    rows: readonly Phase9EvidenceRow[],
    statusById: Readonly<Record<string, string>> = {},
    remainingGapById: Readonly<Record<string, string>> = {},
    finalStatus = 'Delivered',
) {
    writeFileSync(join(root, checklistPath), [
        '# Phase 9 Checklist',
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

describe('Phase 9 Spray Lab evidence helper', () => {
    it('passes when every required row has evidence and status', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredPhase9EvidenceRows);

        const report = verifyPhase9SprayLab({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(true);
        expect(report.statusDeclarationValid).toBe(true);
        expect(report.blockersExplicit).toBe(true);
        expect(report.finalStatus).toBe('Delivered');
    });

    it('fails when coach.handoff is absent from the checklist', () => {
        const root = createWorkspace();
        writeChecklist(
            root,
            requiredPhase9EvidenceRows.filter((row) => row.id !== 'coach.handoff'),
        );

        const report = verifyPhase9SprayLab({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(false);
        expect(report.finalStatus).toBe('Blocked');
        expect(report.missingEvidenceRows).toContain('coach.handoff');
    });

    it('requires final command rows before a checklist can pass', () => {
        const root = createWorkspace();
        writeChecklist(
            root,
            requiredPhase9EvidenceRows.filter((row) => row.id !== 'commands.verify_phase9'),
        );

        const report = verifyPhase9SprayLab({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(false);
        expect(report.missingEvidenceRows).toContain('commands.verify_phase9');
    });

    it('allows partial delivery only when remaining gaps are explicit and declared', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredPhase9EvidenceRows, {
            'playwright.desktop_mobile': 'PENDING',
        }, {
            'playwright.desktop_mobile': 'Manual browser screenshots still pending.',
        }, 'Partially delivered');

        const report = verifyPhase9SprayLab({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(true);
        expect(report.finalStatus).toBe('Partially delivered');
        expect(report.statusDeclarationValid).toBe(true);
        expect(report.blockersExplicit).toBe(true);
        expect(report.pendingRows).toEqual(['playwright.desktop_mobile']);
    });

    it('fails partial rows that hide their remaining gap', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredPhase9EvidenceRows, {
            'playwright.desktop_mobile': 'PENDING',
        }, {}, 'Partially delivered');

        const report = verifyPhase9SprayLab({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(true);
        expect(report.blockersExplicit).toBe(false);
        expect(report.rowsNeedingExplicitGaps).toEqual(['playwright.desktop_mobile']);
    });

    it('keeps the npm script registered', () => {
        const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
            readonly scripts?: Record<string, string>;
        };

        expect(packageJson.scripts?.['verify:phase9:spray-lab']).toBe('tsx scripts/verify-phase9-spray-lab.ts');
    });
});

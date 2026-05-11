import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    requiredPhase13TeamCoachEvidenceRows,
    verifyPhase13TeamCoach,
    type Phase13TeamCoachEvidenceRow,
} from '../../scripts/verify-phase13-team-coach';

const checklistPath = '.planning/phases/13-team-and-coach-expansion/13-VERIFY-CHECKLIST.md';

function createWorkspace() {
    const root = mkdtempSync(join(tmpdir(), 'phase13-team-coach-evidence-'));
    mkdirSync(join(root, '.planning/phases/13-team-and-coach-expansion'), { recursive: true });

    return root;
}

function writeChecklist(
    root: string,
    rows: readonly Phase13TeamCoachEvidenceRow[],
    statusById: Readonly<Record<string, string>> = {},
    remainingGapById: Readonly<Record<string, string>> = {},
    finalStatus = 'Delivered',
) {
    writeFileSync(join(root, checklistPath), [
        '# Phase 13 Team Coach Checklist',
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

describe('Phase 13 Team Coach evidence helper', () => {
    it('passes when every Team Coach evidence row has PASS evidence and Delivered is declared', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredPhase13TeamCoachEvidenceRows);

        const report = verifyPhase13TeamCoach({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(true);
        expect(report.statusDeclarationValid).toBe(true);
        expect(report.blockersExplicit).toBe(true);
        expect(report.finalStatus).toBe('Delivered');
    });

    it('fails when mandatory privacy redaction evidence is absent', () => {
        const root = createWorkspace();
        writeChecklist(
            root,
            requiredPhase13TeamCoachEvidenceRows.filter((row) => row.id !== 'privacy.team_safe_redaction'),
        );

        const report = verifyPhase13TeamCoach({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(false);
        expect(report.finalStatus).toBe('Blocked');
        expect(report.missingEvidenceRows).toContain('privacy.team_safe_redaction');
    });

    it('does not allow Delivered while rows are WARN or PENDING', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredPhase13TeamCoachEvidenceRows, {
            'playwright.desktop_matrix': 'WARN',
            'commands.build': 'PENDING',
        }, {
            'playwright.desktop_matrix': 'Desktop evidence still needs final route screenshots.',
            'commands.build': 'Production build has not been rerun after packet route implementation.',
        }, 'Delivered');

        const report = verifyPhase13TeamCoach({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(true);
        expect(report.finalStatus).toBe('Partially delivered');
        expect(report.statusDeclarationValid).toBe(false);
        expect(report.warningRows).toEqual(['playwright.desktop_matrix']);
        expect(report.pendingRows).toEqual(['commands.build']);
    });

    it('keeps FAIL and BLOCKED rows hard-blocking and requires explicit remaining gaps', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredPhase13TeamCoachEvidenceRows, {
            'access.separate_team_entitlement': 'FAIL',
            'privacy.player_consent': 'BLOCKED',
        }, {
            'access.separate_team_entitlement': 'Solo Pro still grants a Team capability.',
        }, 'Blocked');

        const report = verifyPhase13TeamCoach({
            rootDir: root,
            checklistPath,
        });

        expect(report.finalStatus).toBe('Blocked');
        expect(report.blockersExplicit).toBe(false);
        expect(report.failedRows).toEqual(['access.separate_team_entitlement']);
        expect(report.blockedRows).toEqual(['privacy.player_consent']);
        expect(report.rowsNeedingExplicitGaps).toEqual(['privacy.player_consent']);
    });

    it('keeps the npm script registered', () => {
        const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
            readonly scripts?: Record<string, string>;
        };

        expect(packageJson.scripts?.['verify:phase13:team-coach']).toBe(
            'tsx scripts/verify-phase13-team-coach.ts',
        );
    });

    it('requires explicit Team access, privacy, seat, browser, and command evidence rows', () => {
        const rowIds = requiredPhase13TeamCoachEvidenceRows.map((row) => row.id);

        expect(rowIds).toEqual(expect.arrayContaining([
            'access.separate_team_entitlement',
            'access.server_owned_membership',
            'privacy.player_consent',
            'privacy.no_private_account_data',
            'seats.foundation_no_billing',
            'playwright.desktop_matrix',
            'playwright.mobile_matrix',
            'commands.verify_phase13',
        ]));
    });
});

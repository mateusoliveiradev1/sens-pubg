import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    requiredPhase11SocialProEvidenceRows,
    verifyPhase11SocialPro,
    type Phase11SocialProEvidenceRow,
} from '../../scripts/verify-phase11-social-pro';

const checklistPath = '.planning/phases/11-social-pro-community-premium/11-VERIFY-CHECKLIST.md';

function createWorkspace() {
    const root = mkdtempSync(join(tmpdir(), 'phase11-social-pro-evidence-'));
    mkdirSync(join(root, '.planning/phases/11-social-pro-community-premium'), { recursive: true });

    return root;
}

function writeChecklist(
    root: string,
    rows: readonly Phase11SocialProEvidenceRow[],
    statusById: Readonly<Record<string, string>> = {},
    remainingGapById: Readonly<Record<string, string>> = {},
    finalStatus = 'Delivered',
) {
    writeFileSync(join(root, checklistPath), [
        '# Phase 11 Social Pro Checklist',
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

describe('Phase 11 Social Pro evidence helper', () => {
    it('passes when every required Social Pro evidence row has PASS evidence and Delivered is declared', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredPhase11SocialProEvidenceRows);

        const report = verifyPhase11SocialPro({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(true);
        expect(report.statusDeclarationValid).toBe(true);
        expect(report.blockersExplicit).toBe(true);
        expect(report.finalStatus).toBe('Delivered');
    });

    it('fails when the Free public community regression row is absent', () => {
        const root = createWorkspace();
        writeChecklist(
            root,
            requiredPhase11SocialProEvidenceRows.filter((row) => row.id !== 'free.public_feed'),
        );

        const report = verifyPhase11SocialPro({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(false);
        expect(report.finalStatus).toBe('Blocked');
        expect(report.missingEvidenceRows).toContain('free.public_feed');
    });

    it('fails rows without a valid status before delivery can be claimed', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredPhase11SocialProEvidenceRows, {
            'pro.report_lifecycle': '',
            'redaction.public_safe_snapshot': 'unknown',
        }, {}, 'Blocked');

        const report = verifyPhase11SocialPro({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(false);
        expect(report.finalStatus).toBe('Blocked');
        expect(report.missingStatusRows).toEqual([
            'pro.report_lifecycle',
            'redaction.public_safe_snapshot',
        ]);
    });

    it('does not allow Delivered while required rows are PENDING or PARTIAL', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredPhase11SocialProEvidenceRows, {
            'playwright.public_states_desktop': 'PENDING',
            'commands.community_visual': 'PARTIAL',
        }, {
            'playwright.public_states_desktop': 'Desktop screenshots still pending.',
            'commands.community_visual': 'Visual gate has a known Social Pro route gap.',
        }, 'Delivered');

        const report = verifyPhase11SocialPro({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(true);
        expect(report.finalStatus).toBe('Partially delivered');
        expect(report.statusDeclarationValid).toBe(false);
        expect(report.pendingRows).toEqual(['playwright.public_states_desktop']);
        expect(report.partialRows).toEqual(['commands.community_visual']);
    });

    it('requires explicit remaining gaps for blocked, partial, pending, or missing evidence rows', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredPhase11SocialProEvidenceRows, {
            'moderation.audit_reasons': 'BLOCKED',
        }, {}, 'Blocked');

        const report = verifyPhase11SocialPro({
            rootDir: root,
            checklistPath,
        });

        expect(report.finalStatus).toBe('Blocked');
        expect(report.blockersExplicit).toBe(false);
        expect(report.rowsNeedingExplicitGaps).toEqual(['moderation.audit_reasons']);
    });

    it('keeps the npm script registered', () => {
        const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
            readonly scripts?: Record<string, string>;
        };

        expect(packageJson.scripts?.['verify:phase11:social-pro']).toBe(
            'tsx scripts/verify-phase11-social-pro.ts',
        );
    });

    it('requires explicit Phase 11 profile listing, profile redaction, exclusion, and badge surface evidence rows', () => {
        const rowIds = requiredPhase11SocialProEvidenceRows.map((row) => row.id);

        expect(rowIds).toEqual(expect.arrayContaining([
            'visibility.profile_public_report_listing',
            'visibility.profile_report_exclusion',
            'redaction.profile_report_card_honesty',
            'pro.badge_surface_placement',
        ]));
    });

    it('keeps the repository checklist present with every required row and an honest partial status', () => {
        const report = verifyPhase11SocialPro();

        expect(report.missingDocuments).toEqual([]);
        expect(report.missingEvidenceRows).toEqual([]);
        expect(report.missingStatusRows).toEqual([]);
        expect(report.rowsMarkedMissing).toEqual([]);
        expect(report.evidenceFileValid).toBe(true);
        expect(report.finalStatus).toBe('Partially delivered');
        expect(report.statusDeclarationValid).toBe(true);
        expect(report.blockersExplicit).toBe(true);
    });
});

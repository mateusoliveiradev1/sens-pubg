import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    requiredPhase12RevenueOpsEvidenceRows,
    verifyPhase12RevenueOps,
    type Phase12RevenueOpsEvidenceRow,
} from '../../scripts/verify-phase12-revenue-ops';

const checklistPath = '.planning/phases/12-revenue-operations-hardening/12-VERIFY-CHECKLIST.md';

function createWorkspace() {
    const root = mkdtempSync(join(tmpdir(), 'phase12-revenue-ops-evidence-'));
    mkdirSync(join(root, '.planning/phases/12-revenue-operations-hardening'), { recursive: true });

    return root;
}

function writeChecklist(
    root: string,
    rows: readonly Phase12RevenueOpsEvidenceRow[],
    statusById: Readonly<Record<string, string>> = {},
    remainingGapById: Readonly<Record<string, string>> = {},
    finalStatus = 'Delivered',
) {
    writeFileSync(join(root, checklistPath), [
        '# Phase 12 Revenue Ops Checklist',
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

describe('Phase 12 Revenue Ops evidence helper', () => {
    it('passes when every required Revenue Ops evidence row has PASS evidence and Delivered is declared', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredPhase12RevenueOpsEvidenceRows);

        const report = verifyPhase12RevenueOps({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(true);
        expect(report.statusDeclarationValid).toBe(true);
        expect(report.blockersExplicit).toBe(true);
        expect(report.finalStatus).toBe('Delivered');
    });

    it('fails when a mandatory paid-flow production evidence row is absent', () => {
        const root = createWorkspace();
        writeChecklist(
            root,
            requiredPhase12RevenueOpsEvidenceRows.filter((row) => row.id !== 'paid_flow.production_matrix'),
        );

        const report = verifyPhase12RevenueOps({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(false);
        expect(report.finalStatus).toBe('Blocked');
        expect(report.missingEvidenceRows).toContain('paid_flow.production_matrix');
    });

    it('fails rows without a valid status before delivery can be claimed', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredPhase12RevenueOpsEvidenceRows, {
            'implementation.funnel_contract': '',
            'privacy.prohibited_fields': 'unknown',
        }, {}, 'Blocked');

        const report = verifyPhase12RevenueOps({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(false);
        expect(report.finalStatus).toBe('Blocked');
        expect(report.missingStatusRows).toEqual([
            'implementation.funnel_contract',
            'privacy.prohibited_fields',
        ]);
    });

    it('does not allow Delivered while required rows are WARN or PENDING', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredPhase12RevenueOpsEvidenceRows, {
            'paid_flow.test_mode_matrix': 'WARN',
            'commands.readiness_deploy': 'PENDING',
        }, {
            'paid_flow.test_mode_matrix': 'Stripe test mode has a known portal cancellation gap.',
            'commands.readiness_deploy': 'Deploy smoke is waiting for external production env access.',
        }, 'Delivered');

        const report = verifyPhase12RevenueOps({
            rootDir: root,
            checklistPath,
        });

        expect(report.evidenceFileValid).toBe(true);
        expect(report.finalStatus).toBe('Partially delivered');
        expect(report.statusDeclarationValid).toBe(false);
        expect(report.warningRows).toEqual(['paid_flow.test_mode_matrix']);
        expect(report.pendingRows).toEqual(['commands.readiness_deploy']);
    });

    it('keeps FAIL and BLOCKED rows hard-blocking and requires explicit remaining gaps', () => {
        const root = createWorkspace();
        writeChecklist(root, requiredPhase12RevenueOpsEvidenceRows, {
            'launch.public_paid_gate': 'BLOCKED',
            'paid_flow.production_matrix': 'FAIL',
        }, {
            'paid_flow.production_matrix': 'Production webhook evidence failed.',
        }, 'Blocked');

        const report = verifyPhase12RevenueOps({
            rootDir: root,
            checklistPath,
        });

        expect(report.finalStatus).toBe('Blocked');
        expect(report.blockersExplicit).toBe(false);
        expect(report.blockedRows).toEqual(['launch.public_paid_gate']);
        expect(report.failedRows).toEqual(['paid_flow.production_matrix']);
        expect(report.rowsNeedingExplicitGaps).toEqual(['launch.public_paid_gate']);
    });

    it('keeps the npm script registered', () => {
        const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
            readonly scripts?: Record<string, string>;
        };

        expect(packageJson.scripts?.['verify:phase12:revenue-ops']).toBe(
            'tsx scripts/verify-phase12-revenue-ops.ts',
        );
    });

    it('requires explicit Revenue Ops privacy, support, paid-flow, launch, and command evidence rows', () => {
        const rowIds = requiredPhase12RevenueOpsEvidenceRows.map((row) => row.id);

        expect(rowIds).toEqual(expect.arrayContaining([
            'privacy.aggregate_default',
            'privacy.detail_reason',
            'support.domains',
            'support.safe_summary',
            'paid_flow.test_mode_matrix',
            'paid_flow.production_matrix',
            'launch.founder_beta_gate',
            'launch.public_paid_gate',
            'playwright.desktop_matrix',
            'playwright.mobile_matrix',
            'commands.verify_phase12',
        ]));
    });
});

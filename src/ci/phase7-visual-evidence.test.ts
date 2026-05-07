import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    inspectPhase7VisualEvidence,
    type Phase7VisualEvidenceRow,
} from '../../scripts/verify-phase7-visual-evidence';

const docsPath = 'docs/phase7.md';

const rows: readonly Phase7VisualEvidenceRow[] = [
    {
        id: 'route-home',
        group: 'screen',
        label: 'Home',
        command: 'npx playwright test e2e/phase7.visual-matrix.spec.ts',
        screenshotPaths: ['test-results/home.png'],
    },
    {
        id: 'typecheck',
        group: 'gate',
        label: 'Typecheck',
        command: 'npm run typecheck',
    },
    {
        id: 'stripe-manual',
        group: 'manual',
        label: 'Manual Stripe',
        command: 'manual',
        manualGate: true,
    },
];

function createWorkspace() {
    const root = mkdtempSync(join(tmpdir(), 'phase7-evidence-'));
    mkdirSync(join(root, 'docs'), { recursive: true });
    mkdirSync(join(root, 'test-results'), { recursive: true });

    return root;
}

function writeDocs(root: string, stripeStatus: 'PASS' | 'PENDING_MANUAL' = 'PASS') {
    writeFileSync(join(root, docsPath), [
        '| id | command | result |',
        '|---|---|---|',
        '| route-home | npx playwright test e2e/phase7.visual-matrix.spec.ts | PASS |',
        '| typecheck | npm run typecheck | PASS |',
        `| stripe-manual | manual | ${stripeStatus} |`,
    ].join('\n'));
}

describe('Phase 7 visual evidence helper', () => {
    it('passes when required rows, docs, and screenshots exist', () => {
        const root = createWorkspace();
        writeFileSync(join(root, 'test-results/home.png'), 'png');
        writeDocs(root, 'PASS');

        const report = inspectPhase7VisualEvidence({
            rootDir: root,
            rows,
            docsPaths: [docsPath],
        });

        expect(report.finalStatus).toBe('Delivered');
        expect(report.missingScreenshots).toEqual([]);
        expect(report.missingDocumentRows).toEqual([]);
    });

    it('blocks when required screenshots are missing', () => {
        const root = createWorkspace();
        writeDocs(root, 'PASS');

        const report = inspectPhase7VisualEvidence({
            rootDir: root,
            rows,
            docsPaths: [docsPath],
        });

        expect(report.finalStatus).toBe('Blocked');
        expect(report.missingScreenshots).toContain('test-results/home.png');
    });

    it('returns Partial when only a manual gate is pending', () => {
        const root = createWorkspace();
        writeFileSync(join(root, 'test-results/home.png'), 'png');
        writeDocs(root, 'PENDING_MANUAL');

        const report = inspectPhase7VisualEvidence({
            rootDir: root,
            rows,
            docsPaths: [docsPath],
        });

        expect(report.finalStatus).toBe('Partial');
        expect(report.partialRows).toEqual(['stripe-manual']);
    });
});

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type Phase7EvidenceGroup = 'screen' | 'state' | 'asset' | 'gate' | 'manual';
export type Phase7FinalStatus = 'Delivered' | 'Partial' | 'Blocked';

export interface Phase7VisualEvidenceRow {
    readonly id: string;
    readonly group: Phase7EvidenceGroup;
    readonly label: string;
    readonly command: string;
    readonly screenshotPaths?: readonly string[];
    readonly manualGate?: boolean;
}

export interface Phase7VisualEvidenceReport {
    readonly finalStatus: Phase7FinalStatus;
    readonly checkedRows: number;
    readonly missingDocuments: readonly string[];
    readonly missingDocumentRows: readonly string[];
    readonly missingScreenshots: readonly string[];
    readonly blockedRows: readonly string[];
    readonly partialRows: readonly string[];
}

interface InspectPhase7VisualEvidenceInput {
    readonly rootDir?: string;
    readonly rows?: readonly Phase7VisualEvidenceRow[];
    readonly docsPaths?: readonly string[];
}

const routeScreenshots = (name: string): readonly string[] => [
    `test-results/phase7-route-${name}-mobile.png`,
    `test-results/phase7-route-${name}-desktop.png`,
];

export const phase7VisualEvidenceRows: readonly Phase7VisualEvidenceRow[] = [
    {
        id: 'route-home',
        group: 'screen',
        label: 'Home first viewport and loop entry',
        command: 'npx playwright test e2e/phase7.visual-matrix.spec.ts',
        screenshotPaths: routeScreenshots('home'),
    },
    {
        id: 'route-analyze',
        group: 'screen',
        label: 'Analyze upload route',
        command: 'npx playwright test e2e/phase7.visual-matrix.spec.ts',
        screenshotPaths: routeScreenshots('analyze'),
    },
    {
        id: 'route-dashboard',
        group: 'screen',
        label: 'Dashboard command route',
        command: 'npx playwright test e2e/phase7.visual-matrix.spec.ts',
        screenshotPaths: routeScreenshots('dashboard'),
    },
    {
        id: 'route-history',
        group: 'screen',
        label: 'History audit route',
        command: 'npx playwright test e2e/phase7.visual-matrix.spec.ts',
        screenshotPaths: routeScreenshots('history'),
    },
    {
        id: 'route-history-detail',
        group: 'screen',
        label: 'Seeded history detail audit route',
        command: 'npx playwright test e2e/phase7.visual-matrix.spec.ts',
        screenshotPaths: routeScreenshots('history-detail'),
    },
    {
        id: 'route-pricing',
        group: 'screen',
        label: 'Pricing purchase route',
        command: 'npx playwright test e2e/phase7.visual-matrix.spec.ts',
        screenshotPaths: routeScreenshots('pricing'),
    },
    {
        id: 'route-billing',
        group: 'screen',
        label: 'Billing trust route',
        command: 'npx playwright test e2e/phase7.visual-matrix.spec.ts',
        screenshotPaths: routeScreenshots('billing'),
    },
    {
        id: 'route-checkout-success',
        group: 'screen',
        label: 'Checkout success webhook-pending receipt',
        command: 'npx playwright test e2e/phase7.visual-matrix.spec.ts',
        screenshotPaths: routeScreenshots('checkout-success'),
    },
    {
        id: 'route-checkout-cancel',
        group: 'screen',
        label: 'Checkout cancel receipt',
        command: 'npx playwright test e2e/phase7.visual-matrix.spec.ts',
        screenshotPaths: routeScreenshots('checkout-cancel'),
    },
    {
        id: 'mobile-paid-nav',
        group: 'screen',
        label: 'Mobile nav includes Planos and separates Sens dos Pros',
        command: 'npx playwright test e2e/phase7.no-false-perfect.spec.ts',
        screenshotPaths: ['test-results/phase7-mobile-paid-nav.png'],
    },
    {
        id: 'spray-state-matrix',
        group: 'state',
        label: 'Spray normal, weak, inconclusive, and reference-unavailable states',
        command: 'npx playwright test e2e/phase7.visual-matrix.spec.ts',
        screenshotPaths: [
            'test-results/phase7-spray-states-mobile.png',
            'test-results/phase7-spray-states-desktop.png',
        ],
    },
    {
        id: 'weapon-grid-29',
        group: 'asset',
        label: '29-weapon visual grid',
        command: 'npx playwright test e2e/phase7.visual-matrix.spec.ts',
        screenshotPaths: [
            'test-results/phase7-weapon-grid-mobile.png',
            'test-results/phase7-weapon-grid-desktop.png',
        ],
    },
    {
        id: 'product-state-matrix',
        group: 'state',
        label: 'Free, Pro, lock, quota, billing, weak, inconclusive, empty, loading, and error states',
        command: 'npx playwright test e2e/phase7.visual-matrix.spec.ts',
        screenshotPaths: [
            'test-results/phase7-state-matrix-mobile.png',
            'test-results/phase7-state-matrix-desktop.png',
        ],
    },
    {
        id: 'accessibility-overflow',
        group: 'gate',
        label: 'Mobile and desktop accessibility/overflow browser assertions',
        command: 'npx playwright test e2e/phase7.accessibility-overflow.spec.ts',
    },
    {
        id: 'copy-claims',
        group: 'gate',
        label: 'No perfect sensitivity, guarantee, rank, or affiliation copy',
        command: 'npx vitest run src/app/copy-claims.contract.test.ts',
    },
    {
        id: 'lint',
        group: 'gate',
        label: 'General ESLint suite',
        command: 'npm run lint',
    },
    {
        id: 'typecheck',
        group: 'gate',
        label: 'Strict TypeScript',
        command: 'npm run typecheck',
    },
    {
        id: 'vitest-full',
        group: 'gate',
        label: 'Full Vitest suite',
        command: 'npx vitest run',
    },
    {
        id: 'monetization',
        group: 'gate',
        label: 'Focused monetization suite',
        command: 'npm run test:monetization',
    },
    {
        id: 'benchmark-gate',
        group: 'gate',
        label: 'Fast benchmark gate',
        command: 'npm run benchmark:gate',
    },
    {
        id: 'build',
        group: 'gate',
        label: 'Production build',
        command: 'npm run build',
    },
    {
        id: 'stripe-manual',
        group: 'manual',
        label: 'Manual Stripe test-mode paid-flow checklist',
        command: 'Manual Stripe test-mode checklist from Phase 5/07-05',
        manualGate: true,
    },
];

const DEFAULT_DOCS = [
    'docs/phase7-visual-verification.md',
    '.planning/phases/07-premium-visual-ui-ux/07-VERIFY-CHECKLIST.md',
] as const;

function readDocs(rootDir: string, docsPaths: readonly string[]) {
    return docsPaths.map((docPath) => {
        const absolutePath = path.join(rootDir, docPath);

        return {
            path: docPath,
            exists: existsSync(absolutePath),
            text: existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '',
        };
    });
}

function rowLines(rowId: string, text: string): readonly string[] {
    return text
        .split(/\r?\n/)
        .filter((line) => line.includes(rowId));
}

function docsContainRow(rowId: string, docsText: string): boolean {
    return rowLines(rowId, docsText).length > 0;
}

function rowHasStatus(rowId: string, docsText: string, statusPattern: RegExp): boolean {
    return rowLines(rowId, docsText).some((line) => statusPattern.test(line));
}

export function inspectPhase7VisualEvidence(
    input: InspectPhase7VisualEvidenceInput = {},
): Phase7VisualEvidenceReport {
    const rootDir = input.rootDir ?? process.cwd();
    const rows = input.rows ?? phase7VisualEvidenceRows;
    const docsPaths = input.docsPaths ?? DEFAULT_DOCS;
    const docs = readDocs(rootDir, docsPaths);
    const docsText = docs.map((doc) => doc.text).join('\n');
    const missingDocuments = docs.filter((doc) => !doc.exists).map((doc) => doc.path);
    const missingDocumentRows = rows
        .filter((row) => !docsContainRow(row.id, docsText))
        .map((row) => row.id);
    const missingScreenshots = rows.flatMap((row) => (
        row.screenshotPaths ?? []
    ).filter((screenshotPath) => !existsSync(path.join(rootDir, screenshotPath))));
    const blockedRows = rows
        .filter((row) => !row.manualGate)
        .filter((row) => rowHasStatus(row.id, docsText, /\b(FAIL|FAILED|BLOCKED|MISSING)\b/i))
        .map((row) => row.id);
    const partialRows = rows
        .filter((row) => row.manualGate)
        .filter((row) => !rowHasStatus(row.id, docsText, /\bPASS\b/i))
        .map((row) => row.id);
    const hasBlockingGap = missingDocuments.length > 0
        || missingDocumentRows.length > 0
        || missingScreenshots.length > 0
        || blockedRows.length > 0;
    const finalStatus: Phase7FinalStatus = hasBlockingGap
        ? 'Blocked'
        : partialRows.length > 0
            ? 'Partial'
            : 'Delivered';

    return {
        finalStatus,
        checkedRows: rows.length,
        missingDocuments,
        missingDocumentRows,
        missingScreenshots,
        blockedRows,
        partialRows,
    };
}

function formatList(values: readonly string[]): string {
    return values.length > 0 ? values.map((value) => `- ${value}`).join('\n') : '- None';
}

export function formatPhase7VisualEvidenceReport(report: Phase7VisualEvidenceReport): string {
    return [
        '# Phase 7 Visual Evidence Verification',
        '',
        `Final status: **${report.finalStatus}**`,
        `Rows checked: ${report.checkedRows}`,
        '',
        '## Blocking Gaps',
        '',
        '### Missing documents',
        formatList(report.missingDocuments),
        '',
        '### Missing evidence rows in docs/checklist',
        formatList(report.missingDocumentRows),
        '',
        '### Missing screenshots',
        formatList(report.missingScreenshots),
        '',
        '### Rows marked failed/blocked',
        formatList(report.blockedRows),
        '',
        '## Partial Rows',
        '',
        formatList(report.partialRows),
        '',
    ].join('\n');
}

function isDirectRun(): boolean {
    const executedPath = process.argv[1];
    if (!executedPath) {
        return false;
    }

    return import.meta.url === pathToFileURL(executedPath).href;
}

if (isDirectRun()) {
    const report = inspectPhase7VisualEvidence();
    console.log(formatPhase7VisualEvidenceReport(report));
    process.exit(report.finalStatus === 'Blocked' ? 1 : 0);
}

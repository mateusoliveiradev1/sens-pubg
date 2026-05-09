import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type Phase12RevenueOpsEvidenceStatus = 'PASS' | 'WARN' | 'FAIL' | 'BLOCKED' | 'PENDING' | 'MISSING';
export type Phase12RevenueOpsFinalStatus = 'Delivered' | 'Partially delivered' | 'Blocked';

export interface Phase12RevenueOpsEvidenceRow {
    readonly id: string;
    readonly label: string;
}

export interface Phase12RevenueOpsReport {
    readonly finalStatus: Phase12RevenueOpsFinalStatus;
    readonly declaredFinalStatus: Phase12RevenueOpsFinalStatus | null;
    readonly checkedRows: number;
    readonly evidenceFileValid: boolean;
    readonly statusDeclarationValid: boolean;
    readonly blockersExplicit: boolean;
    readonly missingDocuments: readonly string[];
    readonly missingEvidenceRows: readonly string[];
    readonly missingStatusRows: readonly string[];
    readonly rowsMarkedMissing: readonly string[];
    readonly failedRows: readonly string[];
    readonly blockedRows: readonly string[];
    readonly warningRows: readonly string[];
    readonly pendingRows: readonly string[];
    readonly rowsNeedingExplicitGaps: readonly string[];
}

export interface VerifyPhase12RevenueOpsInput {
    readonly rootDir?: string;
    readonly checklistPath?: string;
    readonly requiredRows?: readonly Phase12RevenueOpsEvidenceRow[];
}

interface ParsedEvidenceRow {
    readonly id: string;
    readonly remainingGap: string;
    readonly status: string;
}

export const requiredPhase12RevenueOpsEvidenceRows: readonly Phase12RevenueOpsEvidenceRow[] = [
    { id: 'implementation.validation_scaffold', label: 'Wave 0 validation scaffold exists and is executable' },
    { id: 'implementation.funnel_contract', label: 'Privacy-safe funnel contracts and aggregation helpers' },
    { id: 'implementation.support_diagnosis', label: 'Support-domain diagnosis model' },
    { id: 'implementation.pro_cause_tree', label: 'Explicit Pro no-access first-cause tree' },
    { id: 'implementation.role_boundaries', label: 'Support read/note/request boundaries and admin-only mutations' },
    { id: 'implementation.readiness_gates', label: 'Paid launch readiness gate model' },
    { id: 'implementation.cockpit_ui', label: 'Staff-only Revenue Ops launch-control cockpit UI' },
    { id: 'privacy.aggregate_default', label: 'Revenue Ops is aggregate by default' },
    { id: 'privacy.detail_reason', label: 'User-level detail requires an operational reason' },
    { id: 'privacy.prohibited_fields', label: 'Raw clip, private, payment, and financial fields are blocked from staff payloads' },
    { id: 'funnel.first_usable_analysis', label: 'First usable analysis metric' },
    { id: 'funnel.upgrade_intent_real_actions', label: 'Upgrade intent counts real attempts and excludes passive impressions' },
    { id: 'funnel.checkout_truth', label: 'Checkout started and confirmed derive from server/webhook truth' },
    { id: 'funnel.pro_active_churn_quota', label: 'Pro active, churn/cancellation, and quota-limit states are visible' },
    { id: 'support.domains', label: 'Payment, entitlement, auth, quota, analysis, webhook, and admin-grant domains' },
    { id: 'support.safe_summary', label: 'Safe pasteable support summary with stable reason codes' },
    { id: 'support.billing_detail', label: 'Admin billing detail surfaces diagnosis near resolver truth' },
    { id: 'paid_flow.test_mode_matrix', label: 'Stripe test-mode paid-flow evidence matrix' },
    { id: 'paid_flow.production_matrix', label: 'Stripe production evidence is separate and explicit' },
    { id: 'paid_flow.safe_degradation', label: 'Paid-flow failures close risky actions while preserving confirmed Pro access and Free usefulness' },
    { id: 'launch.founder_beta_gate', label: 'Founder/Beta launch gate' },
    { id: 'launch.public_paid_gate', label: 'Public paid launch gate' },
    { id: 'launch.no_go_copy', label: 'NO-GO states show blocker, impact, owner, runbook, missing evidence, and smallest next step' },
    { id: 'launch.compliance_copy', label: 'Compliance copy avoids perfect sensitivity, guaranteed rank, and PUBG/KRAFTON affiliation claims' },
    { id: 'playwright.desktop_matrix', label: 'Desktop Revenue Ops cockpit evidence matrix' },
    { id: 'playwright.mobile_matrix', label: 'Mobile Revenue Ops cockpit evidence matrix' },
    { id: 'commands.phase12_focused', label: 'Focused Phase 12 Vitest and Playwright checks' },
    { id: 'commands.monetization', label: 'Monetization gate' },
    { id: 'commands.typecheck', label: 'TypeScript gate' },
    { id: 'commands.vitest', label: 'Full Vitest gate' },
    { id: 'commands.benchmark_gate', label: 'Benchmark gate' },
    { id: 'commands.build', label: 'Production build gate' },
    { id: 'commands.readiness_local', label: 'Local readiness gate' },
    { id: 'commands.readiness_deploy', label: 'Deploy readiness gate or explicit external blocker' },
    { id: 'commands.verify_phase12', label: 'Phase 12 Revenue Ops verifier self-run' },
];

const DEFAULT_CHECKLIST_PATH = '.planning/phases/12-revenue-operations-hardening/12-VERIFY-CHECKLIST.md';
const VALID_STATUSES = new Set<Phase12RevenueOpsEvidenceStatus>([
    'PASS',
    'WARN',
    'FAIL',
    'BLOCKED',
    'PENDING',
    'MISSING',
]);

function normalizeCell(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
}

function parseMarkdownRow(line: string): readonly string[] {
    return line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(normalizeCell);
}

function parseEvidenceRows(checklistText: string): readonly ParsedEvidenceRow[] {
    return checklistText
        .split(/\r?\n/)
        .filter((line) => line.trim().startsWith('|'))
        .map(parseMarkdownRow)
        .filter((cells) => cells.length >= 7)
        .filter((cells) => cells[0] !== undefined && !/^[-: ]+$/.test(cells[0]))
        .map((cells) => {
            const firstCell = cells[0] ?? '';
            const remainingGap = cells[cells.length - 2] ?? '';
            const status = cells.at(-1) ?? '';

            return {
                id: firstCell.replace(/`/g, ''),
                remainingGap: remainingGap.replace(/`/g, ''),
                status: status.replace(/`/g, '').toUpperCase(),
            };
        })
        .filter((row) => row.id.includes('.'));
}

function parseDeclaredFinalStatus(checklistText: string): Phase12RevenueOpsFinalStatus | null {
    const line = checklistText
        .split(/\r?\n/)
        .find((candidate) => /^Final status:/i.test(candidate.trim()));

    if (!line) {
        return null;
    }

    const value = line.replace(/^Final status:/i, '').replace(/\.$/, '').trim().toLowerCase();

    if (value === 'delivered') {
        return 'Delivered';
    }

    if (value === 'partially delivered') {
        return 'Partially delivered';
    }

    if (value === 'blocked') {
        return 'Blocked';
    }

    return null;
}

function findEvidenceRow(
    parsedRows: readonly ParsedEvidenceRow[],
    rowId: string,
): ParsedEvidenceRow | undefined {
    return parsedRows.find((row) => row.id === rowId);
}

function hasExplicitGap(row: ParsedEvidenceRow): boolean {
    const normalized = row.remainingGap.trim().toLowerCase();

    return normalized.length > 0
        && normalized !== 'none'
        && normalized !== 'nenhum'
        && normalized !== '-';
}

export function verifyPhase12RevenueOps(
    input: VerifyPhase12RevenueOpsInput = {},
): Phase12RevenueOpsReport {
    const rootDir = input.rootDir ?? process.cwd();
    const checklistPath = input.checklistPath ?? DEFAULT_CHECKLIST_PATH;
    const requiredRows = input.requiredRows ?? requiredPhase12RevenueOpsEvidenceRows;
    const absoluteChecklistPath = path.join(rootDir, checklistPath);
    const checklistExists = existsSync(absoluteChecklistPath);
    const checklistText = checklistExists ? readFileSync(absoluteChecklistPath, 'utf8') : '';
    const parsedRows = parseEvidenceRows(checklistText);
    const declaredFinalStatus = parseDeclaredFinalStatus(checklistText);
    const missingDocuments = checklistExists ? [] : [checklistPath];
    const missingEvidenceRows = requiredRows
        .filter((row) => findEvidenceRow(parsedRows, row.id) === undefined)
        .map((row) => row.id);
    const rowsWithStatus = requiredRows
        .map((row) => findEvidenceRow(parsedRows, row.id))
        .filter((row): row is ParsedEvidenceRow => row !== undefined);
    const missingStatusRows = rowsWithStatus
        .filter((row) => !VALID_STATUSES.has(row.status as Phase12RevenueOpsEvidenceStatus))
        .map((row) => row.id);
    const rowsMarkedMissing = rowsWithStatus
        .filter((row) => row.status === 'MISSING')
        .map((row) => row.id);
    const failedRows = rowsWithStatus
        .filter((row) => row.status === 'FAIL')
        .map((row) => row.id);
    const blockedRows = rowsWithStatus
        .filter((row) => row.status === 'BLOCKED')
        .map((row) => row.id);
    const warningRows = rowsWithStatus
        .filter((row) => row.status === 'WARN')
        .map((row) => row.id);
    const pendingRows = rowsWithStatus
        .filter((row) => row.status === 'PENDING')
        .map((row) => row.id);
    const rowsNeedingExplicitGaps = rowsWithStatus
        .filter((row) => (
            row.status === 'WARN'
            || row.status === 'FAIL'
            || row.status === 'BLOCKED'
            || row.status === 'PENDING'
            || row.status === 'MISSING'
        ))
        .filter((row) => !hasExplicitGap(row))
        .map((row) => row.id);
    const evidenceFileValid = missingDocuments.length === 0
        && missingEvidenceRows.length === 0
        && missingStatusRows.length === 0
        && rowsMarkedMissing.length === 0;
    const finalStatus: Phase12RevenueOpsFinalStatus = !evidenceFileValid
        || failedRows.length > 0
        || blockedRows.length > 0
        ? 'Blocked'
        : warningRows.length > 0 || pendingRows.length > 0
            ? 'Partially delivered'
            : 'Delivered';
    const statusDeclarationValid = declaredFinalStatus === finalStatus;
    const blockersExplicit = rowsNeedingExplicitGaps.length === 0;

    return {
        finalStatus,
        declaredFinalStatus,
        checkedRows: requiredRows.length,
        evidenceFileValid,
        statusDeclarationValid,
        blockersExplicit,
        missingDocuments,
        missingEvidenceRows,
        missingStatusRows,
        rowsMarkedMissing,
        failedRows,
        blockedRows,
        warningRows,
        pendingRows,
        rowsNeedingExplicitGaps,
    };
}

function formatList(values: readonly string[]): string {
    return values.length > 0 ? values.map((value) => `- ${value}`).join('\n') : '- None';
}

export function formatPhase12RevenueOpsReport(report: Phase12RevenueOpsReport): string {
    return [
        '# Phase 12 Revenue Ops Evidence Verification',
        '',
        `Evidence file valid: **${report.evidenceFileValid ? 'yes' : 'no'}**`,
        `Status declaration valid: **${report.statusDeclarationValid ? 'yes' : 'no'}**`,
        `Blockers explicit: **${report.blockersExplicit ? 'yes' : 'no'}**`,
        `Declared status: **${report.declaredFinalStatus ?? 'missing'}**`,
        `Final status: **${report.finalStatus}**`,
        `Rows checked: ${report.checkedRows}`,
        '',
        '## Blocking Evidence File Gaps',
        '',
        '### Missing documents',
        formatList(report.missingDocuments),
        '',
        '### Missing evidence rows',
        formatList(report.missingEvidenceRows),
        '',
        '### Rows without a valid status',
        formatList(report.missingStatusRows),
        '',
        '### Rows marked MISSING',
        formatList(report.rowsMarkedMissing),
        '',
        '## Honest Status Rows',
        '',
        '### FAIL rows',
        formatList(report.failedRows),
        '',
        '### BLOCKED rows',
        formatList(report.blockedRows),
        '',
        '### WARN rows',
        formatList(report.warningRows),
        '',
        '### PENDING rows',
        formatList(report.pendingRows),
        '',
        '### Rows needing explicit remaining gaps',
        formatList(report.rowsNeedingExplicitGaps),
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
    const report = verifyPhase12RevenueOps();
    console.log(formatPhase12RevenueOpsReport(report));
    process.exit(report.evidenceFileValid && report.statusDeclarationValid && report.blockersExplicit ? 0 : 1);
}

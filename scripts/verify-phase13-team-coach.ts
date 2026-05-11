import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type Phase13TeamCoachEvidenceStatus = 'PASS' | 'WARN' | 'FAIL' | 'BLOCKED' | 'PENDING' | 'MISSING';
export type Phase13TeamCoachFinalStatus = 'Delivered' | 'Partially delivered' | 'Blocked';

export interface Phase13TeamCoachEvidenceRow {
    readonly id: string;
    readonly label: string;
}

export interface Phase13TeamCoachReport {
    readonly finalStatus: Phase13TeamCoachFinalStatus;
    readonly declaredFinalStatus: Phase13TeamCoachFinalStatus | null;
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

export interface VerifyPhase13TeamCoachInput {
    readonly rootDir?: string;
    readonly checklistPath?: string;
    readonly requiredRows?: readonly Phase13TeamCoachEvidenceRow[];
}

interface ParsedEvidenceRow {
    readonly id: string;
    readonly remainingGap: string;
    readonly status: string;
}

export const requiredPhase13TeamCoachEvidenceRows: readonly Phase13TeamCoachEvidenceRow[] = [
    { id: 'implementation.validation_scaffold', label: 'Wave 0 Team Coach validation scaffold exists and is executable' },
    { id: 'implementation.contracts_access_projection', label: 'Team contracts, access policy, and lock projection' },
    { id: 'implementation.workspaces_invites_seats', label: 'Workspace, invite, membership, seat, and audit persistence/actions' },
    { id: 'implementation.consent_report_redaction', label: 'Player consent and team-safe report redaction' },
    { id: 'implementation.review_packets_links', label: 'Review packets and revocable private links' },
    { id: 'implementation.cockpit_dossier_workflow', label: 'Coach cockpit, player dossier, notes, and review workflow' },
    { id: 'implementation.workspace_ui', label: 'Mesa do Coach workspace and dossier UI' },
    { id: 'implementation.packet_print_export', label: 'Packet route and print/export surface' },
    { id: 'implementation.product_handoffs', label: 'Analyze, history, dashboard, Spray Lab, Ciclo Pro, and Social Pro handoffs' },
    { id: 'implementation.moderation_controls', label: 'Admin packet disable and moderation controls' },
    { id: 'access.separate_team_entitlement', label: 'Team access is separate from solo Pro and Social Pro' },
    { id: 'access.server_owned_membership', label: 'Membership, roles, consent, shares, and packets are server-owned' },
    { id: 'privacy.player_consent', label: 'Player consent gates Team review and export' },
    { id: 'privacy.team_safe_redaction', label: 'Team outputs preserve honesty fields and redact private account data' },
    { id: 'privacy.no_private_account_data', label: 'Billing, payment, support, raw analysis, and private history are excluded' },
    { id: 'export.revocation', label: 'Shares, packets, and links are revocable' },
    { id: 'seats.foundation_no_billing', label: 'Seat foundation exists without self-serve billing or proration claims' },
    { id: 'copy.no_false_team', label: 'Copy avoids certification, rank proof, guaranteed improvement, and PUBG/KRAFTON affiliation claims' },
    { id: 'playwright.desktop_matrix', label: 'Desktop Mesa do Coach browser evidence matrix' },
    { id: 'playwright.mobile_matrix', label: 'Mobile Mesa do Coach browser evidence matrix' },
    { id: 'commands.phase13_focused', label: 'Focused Phase 13 tests' },
    { id: 'commands.monetization', label: 'Monetization gate' },
    { id: 'commands.community', label: 'Community gate' },
    { id: 'commands.typecheck', label: 'TypeScript gate' },
    { id: 'commands.vitest', label: 'Full Vitest gate' },
    { id: 'commands.benchmark_gate', label: 'Benchmark gate' },
    { id: 'commands.build', label: 'Production build gate' },
    { id: 'commands.verify_phase13', label: 'Phase 13 Team Coach verifier self-run' },
];

const DEFAULT_CHECKLIST_PATH = '.planning/phases/13-team-and-coach-expansion/13-VERIFY-CHECKLIST.md';
const VALID_STATUSES = new Set<Phase13TeamCoachEvidenceStatus>([
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
        .map((cells) => ({
            id: (cells[0] ?? '').replace(/`/g, ''),
            remainingGap: (cells[cells.length - 2] ?? '').replace(/`/g, ''),
            status: (cells.at(-1) ?? '').replace(/`/g, '').toUpperCase(),
        }))
        .filter((row) => row.id.includes('.'));
}

function parseDeclaredFinalStatus(checklistText: string): Phase13TeamCoachFinalStatus | null {
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

export function verifyPhase13TeamCoach(
    input: VerifyPhase13TeamCoachInput = {},
): Phase13TeamCoachReport {
    const rootDir = input.rootDir ?? process.cwd();
    const checklistPath = input.checklistPath ?? DEFAULT_CHECKLIST_PATH;
    const requiredRows = input.requiredRows ?? requiredPhase13TeamCoachEvidenceRows;
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
        .filter((row) => !VALID_STATUSES.has(row.status as Phase13TeamCoachEvidenceStatus))
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
    const finalStatus: Phase13TeamCoachFinalStatus = !evidenceFileValid
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

export function formatPhase13TeamCoachReport(report: Phase13TeamCoachReport): string {
    return [
        '# Phase 13 Team Coach Evidence Verification',
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
    const report = verifyPhase13TeamCoach();
    console.log(formatPhase13TeamCoachReport(report));
    process.exit(report.evidenceFileValid && report.statusDeclarationValid && report.blockersExplicit ? 0 : 1);
}

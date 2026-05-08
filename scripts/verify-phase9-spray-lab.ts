import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type Phase9EvidenceStatus = 'PASS' | 'PARTIAL' | 'BLOCKED' | 'PENDING' | 'MISSING';
export type Phase9FinalStatus = 'Delivered' | 'Partially delivered' | 'Blocked';

export interface Phase9EvidenceRow {
    readonly id: string;
    readonly label: string;
}

export interface Phase9SprayLabReport {
    readonly finalStatus: Phase9FinalStatus;
    readonly declaredFinalStatus: Phase9FinalStatus | null;
    readonly checkedRows: number;
    readonly evidenceFileValid: boolean;
    readonly statusDeclarationValid: boolean;
    readonly blockersExplicit: boolean;
    readonly missingDocuments: readonly string[];
    readonly missingEvidenceRows: readonly string[];
    readonly missingStatusRows: readonly string[];
    readonly rowsMarkedMissing: readonly string[];
    readonly blockedRows: readonly string[];
    readonly partialRows: readonly string[];
    readonly pendingRows: readonly string[];
    readonly rowsNeedingExplicitGaps: readonly string[];
}

interface VerifyPhase9SprayLabInput {
    readonly rootDir?: string;
    readonly checklistPath?: string;
    readonly requiredRows?: readonly Phase9EvidenceRow[];
}

interface ParsedEvidenceRow {
    readonly id: string;
    readonly remainingGap: string;
    readonly status: string;
}

export const requiredPhase9EvidenceRows: readonly Phase9EvidenceRow[] = [
    { id: 'contracts.lab_session', label: 'Lab session contract' },
    { id: 'lanes.catalog', label: 'Lane catalog' },
    { id: 'fidelity.scoring', label: 'Fidelity scoring' },
    { id: 'index.contextual', label: 'Contextual index' },
    { id: 'persistence.sessions', label: 'Session persistence' },
    { id: 'projection.free_pro', label: 'Free and Pro projection' },
    { id: 'ui.session_runner', label: 'Session runner UI' },
    { id: 'validation.preload', label: 'Compatible validation preload' },
    { id: 'repair.blocked_states', label: 'Repair blocked states' },
    { id: 'dashboard.command', label: 'Dashboard command center' },
    { id: 'history.audit', label: 'History audit continuity' },
    { id: 'coach.handoff', label: 'Coach handoff' },
    { id: 'benchmark.snapshots', label: 'Benchmark snapshots' },
    { id: 'goldens.coach_copy', label: 'Coach golden and copy safety' },
    { id: 'playwright.desktop_mobile', label: 'Desktop and mobile browser evidence' },
    { id: 'commands.typecheck', label: 'TypeScript gate' },
    { id: 'commands.vitest', label: 'Vitest gate' },
    { id: 'commands.benchmark_gate', label: 'Benchmark gate command' },
    { id: 'commands.verify_phase9', label: 'Phase 9 verifier command' },
    { id: 'commands.build', label: 'Production build command' },
];

const DEFAULT_CHECKLIST_PATH = '.planning/phases/09-pubg-spray-lab-session-runner-and-benchmark/09-VERIFY-CHECKLIST.md';
const VALID_STATUSES = new Set<Phase9EvidenceStatus>([
    'PASS',
    'PARTIAL',
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

function parseDeclaredFinalStatus(checklistText: string): Phase9FinalStatus | null {
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

export function verifyPhase9SprayLab(
    input: VerifyPhase9SprayLabInput = {},
): Phase9SprayLabReport {
    const rootDir = input.rootDir ?? process.cwd();
    const checklistPath = input.checklistPath ?? DEFAULT_CHECKLIST_PATH;
    const requiredRows = input.requiredRows ?? requiredPhase9EvidenceRows;
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
        .filter((row) => !VALID_STATUSES.has(row.status as Phase9EvidenceStatus))
        .map((row) => row.id);
    const rowsMarkedMissing = rowsWithStatus
        .filter((row) => row.status === 'MISSING')
        .map((row) => row.id);
    const blockedRows = rowsWithStatus
        .filter((row) => row.status === 'BLOCKED')
        .map((row) => row.id);
    const partialRows = rowsWithStatus
        .filter((row) => row.status === 'PARTIAL')
        .map((row) => row.id);
    const pendingRows = rowsWithStatus
        .filter((row) => row.status === 'PENDING')
        .map((row) => row.id);
    const rowsNeedingExplicitGaps = rowsWithStatus
        .filter((row) => (
            row.status === 'PARTIAL'
            || row.status === 'PENDING'
            || row.status === 'BLOCKED'
            || row.status === 'MISSING'
        ))
        .filter((row) => !hasExplicitGap(row))
        .map((row) => row.id);
    const evidenceFileValid = missingDocuments.length === 0
        && missingEvidenceRows.length === 0
        && missingStatusRows.length === 0
        && rowsMarkedMissing.length === 0;
    const finalStatus: Phase9FinalStatus = !evidenceFileValid || blockedRows.length > 0
        ? 'Blocked'
        : partialRows.length > 0 || pendingRows.length > 0
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
        blockedRows,
        partialRows,
        pendingRows,
        rowsNeedingExplicitGaps,
    };
}

function formatList(values: readonly string[]): string {
    return values.length > 0 ? values.map((value) => `- ${value}`).join('\n') : '- None';
}

export function formatPhase9SprayLabReport(report: Phase9SprayLabReport): string {
    return [
        '# Phase 9 Spray Lab Evidence Verification',
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
        '### BLOCKED rows',
        formatList(report.blockedRows),
        '',
        '### PARTIAL rows',
        formatList(report.partialRows),
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
    const report = verifyPhase9SprayLab();
    console.log(formatPhase9SprayLabReport(report));
    process.exit(report.evidenceFileValid && report.statusDeclarationValid && report.blockersExplicit ? 0 : 1);
}

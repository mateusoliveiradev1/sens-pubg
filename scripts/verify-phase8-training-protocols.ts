import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type Phase8EvidenceStatus = 'PASS' | 'PARTIAL' | 'BLOCKED' | 'PENDING' | 'MISSING';
export type Phase8FinalStatus = 'Delivered' | 'Partial' | 'Blocked';

export interface Phase8EvidenceRow {
    readonly id: string;
    readonly label: string;
}

export interface Phase8TrainingProtocolReport {
    readonly finalStatus: Phase8FinalStatus;
    readonly checkedRows: number;
    readonly evidenceFileValid: boolean;
    readonly missingDocuments: readonly string[];
    readonly missingEvidenceRows: readonly string[];
    readonly missingStatusRows: readonly string[];
    readonly rowsMarkedMissing: readonly string[];
    readonly blockedRows: readonly string[];
    readonly partialRows: readonly string[];
    readonly pendingRows: readonly string[];
}

interface VerifyPhase8TrainingProtocolsInput {
    readonly rootDir?: string;
    readonly checklistPath?: string;
    readonly requiredRows?: readonly Phase8EvidenceRow[];
}

interface ParsedEvidenceRow {
    readonly id: string;
    readonly status: string;
}

export const requiredEvidenceRows: readonly Phase8EvidenceRow[] = [
    {
        id: 'contract.complete_protocol',
        label: 'Complete protocol contract',
    },
    {
        id: 'drills.family_matrix',
        label: 'Drill family matrix',
    },
    {
        id: 'downgrade.matrix',
        label: 'Evidence downgrade matrix',
    },
    {
        id: 'projection.free_pro',
        label: 'Free and Pro projection',
    },
    {
        id: 'preparation.safety_copy',
        label: 'Preparation and safety copy',
    },
    {
        id: 'persistence.snapshot_revision',
        label: 'Snapshot and revision persistence',
    },
    {
        id: 'outcomes.extended_statuses',
        label: 'Extended outcome statuses',
    },
    {
        id: 'validation.compatible_clip',
        label: 'Compatible clip validation',
    },
    {
        id: 'transfer.real_match',
        label: 'Real-match and TDM transfer',
    },
    {
        id: 'llm.immutable_facts',
        label: 'LLM immutable facts',
    },
    {
        id: 'goldens.coach',
        label: 'Coach golden matrix',
    },
    {
        id: 'benchmark.gate',
        label: 'Benchmark gate truth',
    },
    {
        id: 'ui.post_analysis',
        label: 'Post-analysis protocol UI',
    },
    {
        id: 'ui.dashboard_history',
        label: 'Dashboard and history protocol UI',
    },
    {
        id: 'copy.safety',
        label: 'Copy safety',
    },
    {
        id: 'commands.typecheck',
        label: 'TypeScript gate',
    },
    {
        id: 'commands.vitest',
        label: 'Vitest gate',
    },
    {
        id: 'commands.benchmark_gate',
        label: 'Benchmark gate command',
    },
];

const DEFAULT_CHECKLIST_PATH = '.planning/phases/08-complete-training-protocols/08-VERIFY-CHECKLIST.md';
const VALID_STATUSES = new Set<Phase8EvidenceStatus>([
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
        .filter((cells) => cells.length >= 2)
        .filter((cells) => cells[0] !== undefined && !/^[-: ]+$/.test(cells[0]))
        .map((cells) => {
            const firstCell = cells[0] ?? '';
            const lastCell = cells.at(-1) ?? '';

            return {
                id: firstCell.replace(/`/g, ''),
                status: lastCell.replace(/`/g, '').toUpperCase(),
            };
        })
        .filter((row) => row.id.includes('.'));
}

function findEvidenceRow(
    parsedRows: readonly ParsedEvidenceRow[],
    rowId: string,
): ParsedEvidenceRow | undefined {
    return parsedRows.find((row) => row.id === rowId);
}

export function verifyPhase8TrainingProtocols(
    input: VerifyPhase8TrainingProtocolsInput = {},
): Phase8TrainingProtocolReport {
    const rootDir = input.rootDir ?? process.cwd();
    const checklistPath = input.checklistPath ?? DEFAULT_CHECKLIST_PATH;
    const requiredRows = input.requiredRows ?? requiredEvidenceRows;
    const absoluteChecklistPath = path.join(rootDir, checklistPath);
    const checklistExists = existsSync(absoluteChecklistPath);
    const checklistText = checklistExists ? readFileSync(absoluteChecklistPath, 'utf8') : '';
    const parsedRows = parseEvidenceRows(checklistText);
    const missingDocuments = checklistExists ? [] : [checklistPath];
    const missingEvidenceRows = requiredRows
        .filter((row) => findEvidenceRow(parsedRows, row.id) === undefined)
        .map((row) => row.id);
    const rowsWithStatus = requiredRows
        .map((row) => findEvidenceRow(parsedRows, row.id))
        .filter((row): row is ParsedEvidenceRow => row !== undefined);
    const missingStatusRows = rowsWithStatus
        .filter((row) => !VALID_STATUSES.has(row.status as Phase8EvidenceStatus))
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
    const evidenceFileValid = missingDocuments.length === 0
        && missingEvidenceRows.length === 0
        && missingStatusRows.length === 0
        && rowsMarkedMissing.length === 0;
    const finalStatus: Phase8FinalStatus = !evidenceFileValid || blockedRows.length > 0
        ? 'Blocked'
        : partialRows.length > 0 || pendingRows.length > 0
            ? 'Partial'
            : 'Delivered';

    return {
        finalStatus,
        checkedRows: requiredRows.length,
        evidenceFileValid,
        missingDocuments,
        missingEvidenceRows,
        missingStatusRows,
        rowsMarkedMissing,
        blockedRows,
        partialRows,
        pendingRows,
    };
}

function formatList(values: readonly string[]): string {
    return values.length > 0 ? values.map((value) => `- ${value}`).join('\n') : '- None';
}

export function formatPhase8TrainingProtocolReport(report: Phase8TrainingProtocolReport): string {
    return [
        '# Phase 8 Training Protocol Evidence Verification',
        '',
        `Evidence file valid: **${report.evidenceFileValid ? 'yes' : 'no'}**`,
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
    const report = verifyPhase8TrainingProtocols();
    console.log(formatPhase8TrainingProtocolReport(report));
    process.exit(report.evidenceFileValid ? 0 : 1);
}

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type Phase11SocialProEvidenceStatus = 'PASS' | 'PARTIAL' | 'BLOCKED' | 'PENDING' | 'MISSING';
export type Phase11SocialProFinalStatus = 'Delivered' | 'Partially delivered' | 'Blocked';

export interface Phase11SocialProEvidenceRow {
    readonly id: string;
    readonly label: string;
}

export interface Phase11SocialProReport {
    readonly finalStatus: Phase11SocialProFinalStatus;
    readonly declaredFinalStatus: Phase11SocialProFinalStatus | null;
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

export interface VerifyPhase11SocialProInput {
    readonly rootDir?: string;
    readonly checklistPath?: string;
    readonly requiredRows?: readonly Phase11SocialProEvidenceRow[];
}

interface ParsedEvidenceRow {
    readonly id: string;
    readonly remainingGap: string;
    readonly status: string;
}

export const requiredPhase11SocialProEvidenceRows: readonly Phase11SocialProEvidenceRow[] = [
    { id: 'free.public_feed', label: 'Free public feed remains open' },
    { id: 'free.public_posts_profiles', label: 'Free public posts and profiles remain readable' },
    { id: 'free.normal_engagement', label: 'Free likes, comments, follows, and normal saves remain open where already open' },
    { id: 'pro.report_lifecycle', label: 'Pro-only shareable report creation, editing, and lifecycle controls' },
    { id: 'pro.private_links', label: 'Pro-only private report link creation and controls' },
    { id: 'pro.library', label: 'Pro private library and collection organization' },
    { id: 'pro.creator_analytics', label: 'Pro creator analytics access and safe aggregate data' },
    { id: 'pro.badge_controls', label: 'Server-derived Pro badge access and tooltip truth' },
    { id: 'redaction.public_safe_snapshot', label: 'Public-safe report redaction removes private data' },
    { id: 'redaction.required_honesty', label: 'Required confidence, coverage, blockers, limited support, and disclaimers stay visible' },
    { id: 'visibility.public_unlisted', label: 'Public versus unlisted report visibility is enforced' },
    { id: 'visibility.profile_public_report_listing', label: 'Public profiles list only published public Social Pro reports' },
    { id: 'visibility.profile_report_exclusion', label: 'Public profiles exclude link-private, unlisted, hidden, disabled, archived, deleted, and moderated Social Pro reports' },
    { id: 'links.revocation_regeneration_expiration', label: 'Private links revoke, regenerate, and optionally expire' },
    { id: 'access.cancellation_behavior', label: 'Canceled or lost Pro can read existing safe reports but cannot mutate Pro controls' },
    { id: 'moderation.audit_reasons', label: 'Pro report moderation reasons and audit trail' },
    { id: 'analytics.upgrade_intent_privacy', label: 'Upgrade intent analytics are real-action and privacy-minimal' },
    { id: 'redaction.profile_report_card_honesty', label: 'Public profile Social Pro report cards preserve redaction, confidence, coverage, blockers, validation state, limited support, and no-overclaim disclaimer' },
    { id: 'pro.badge_surface_placement', label: 'Pro badge placement is proven on report detail, Pro social hub, creator cards, public profile, and post author surfaces' },
    { id: 'playwright.public_states_desktop', label: 'Desktop public, private-link, revoked, hidden, Free, Pro hub, badge, analytics, library, and handoff states' },
    { id: 'playwright.public_states_mobile', label: 'Mobile public, private-link, revoked, hidden, Free, Pro hub, badge, analytics, library, and handoff states' },
    { id: 'commands.typecheck', label: 'TypeScript gate' },
    { id: 'commands.vitest', label: 'Full Vitest gate' },
    { id: 'commands.community_unit', label: 'Community unit gate' },
    { id: 'commands.community_e2e', label: 'Community e2e gate' },
    { id: 'commands.community_visual', label: 'Community visual gate' },
    { id: 'commands.monetization', label: 'Monetization gate' },
    { id: 'commands.benchmark_gate', label: 'Benchmark gate' },
    { id: 'commands.build', label: 'Production build gate' },
    { id: 'commands.verify_phase11', label: 'Phase 11 Social Pro verifier self-run' },
];

const DEFAULT_CHECKLIST_PATH = '.planning/phases/11-social-pro-community-premium/11-VERIFY-CHECKLIST.md';
const VALID_STATUSES = new Set<Phase11SocialProEvidenceStatus>([
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

function parseDeclaredFinalStatus(checklistText: string): Phase11SocialProFinalStatus | null {
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

export function verifyPhase11SocialPro(
    input: VerifyPhase11SocialProInput = {},
): Phase11SocialProReport {
    const rootDir = input.rootDir ?? process.cwd();
    const checklistPath = input.checklistPath ?? DEFAULT_CHECKLIST_PATH;
    const requiredRows = input.requiredRows ?? requiredPhase11SocialProEvidenceRows;
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
        .filter((row) => !VALID_STATUSES.has(row.status as Phase11SocialProEvidenceStatus))
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
    const finalStatus: Phase11SocialProFinalStatus = !evidenceFileValid || blockedRows.length > 0
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

export function formatPhase11SocialProReport(report: Phase11SocialProReport): string {
    return [
        '# Phase 11 Social Pro Evidence Verification',
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
    const report = verifyPhase11SocialPro();
    console.log(formatPhase11SocialProReport(report));
    process.exit(report.evidenceFileValid && report.statusDeclarationValid && report.blockersExplicit ? 0 : 1);
}

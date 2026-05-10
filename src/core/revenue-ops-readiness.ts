import {
    isRevenueOpsEvidenceEnvironment,
    isRevenueOpsEvidenceStatus,
    type RevenueOpsEvidenceEnvironment,
    type RevenueOpsEvidenceRow,
    type RevenueOpsEvidenceStatus,
    type RevenueOpsFinalStatus,
    type RevenueOpsLaunchBlocker,
    type RevenueOpsOperationalStatus,
} from '../types/revenue-ops';

type EvidenceOwner = RevenueOpsLaunchBlocker['owner'];
type GateScope = 'founder_beta' | 'public_paid' | 'both';

export interface RevenueOpsEvidenceRowDefinition {
    readonly id: string;
    readonly label: string;
    readonly environment: RevenueOpsEvidenceEnvironment;
    readonly owner: EvidenceOwner;
    readonly gate: GateScope;
    readonly expectedState: string;
    readonly rollback: string;
}

export interface RevenueOpsEvidenceInputRow extends Partial<Omit<RevenueOpsEvidenceRow, 'environment' | 'status'>> {
    readonly id: string;
    readonly environment?: string | null;
    readonly status?: string | null;
}

export interface NormalizedRevenueOpsEvidenceRow extends RevenueOpsEvidenceRow {
    readonly validationIssues: readonly string[];
}

export interface RevenueOpsReadinessGroup {
    readonly status: RevenueOpsOperationalStatus;
    readonly rowIds: readonly string[];
    readonly blockers: readonly RevenueOpsLaunchBlocker[];
}

export interface RevenueOpsSafeDegradationSummary {
    readonly status: RevenueOpsOperationalStatus;
    readonly checkoutClosed: boolean;
    readonly preserveConfirmedPaidAccess: boolean;
    readonly keepFreeUseful: boolean;
    readonly grantProToEveryone: boolean;
    readonly historyPreserved: boolean;
    readonly billingSupportRoutesVisible: boolean;
    readonly blocker: RevenueOpsLaunchBlocker | null;
}

export interface BuildPaidLaunchReadinessMatrixInput {
    readonly evidence?: readonly RevenueOpsEvidenceInputRow[];
}

export interface EvaluateRevenueOpsLaunchGatesInput extends BuildPaidLaunchReadinessMatrixInput {
    readonly checkoutEnabled?: boolean;
    readonly entitlementSafeMode?: boolean;
    readonly preserveConfirmedPaidAccess?: boolean;
    readonly grantProToEveryone?: boolean;
    readonly keepFreeUseful?: boolean;
    readonly historyPreserved?: boolean;
    readonly billingSupportRoutesVisible?: boolean;
    readonly missingEvidence?: readonly string[];
}

export interface RevenueOpsPaidLaunchReadinessMatrix {
    readonly version: 'revenue-ops-launch-readiness-v1';
    readonly rows: readonly NormalizedRevenueOpsEvidenceRow[];
    readonly rowsNeedingExplicitGaps: readonly string[];
    readonly missingMandatoryRows: readonly string[];
    readonly stripe: {
        readonly test: RevenueOpsReadinessGroup;
        readonly production: RevenueOpsReadinessGroup;
    };
    readonly founderBetaLaunch: RevenueOpsReadinessGroup;
    readonly publicPaidLaunch: RevenueOpsReadinessGroup;
    readonly finalStatus: RevenueOpsFinalStatus;
}

export interface RevenueOpsLaunchGateEvaluation extends RevenueOpsPaidLaunchReadinessMatrix {
    readonly safeDegradation: RevenueOpsSafeDegradationSummary;
}

export const revenueOpsEvidenceRowDefinitions: readonly RevenueOpsEvidenceRowDefinition[] = [
    {
        id: 'implementation.validation_scaffold',
        label: 'Wave 0 validation scaffold exists and is executable',
        environment: 'internal',
        owner: 'engineering',
        gate: 'both',
        expectedState: 'Phase 12 verifier and RED matrix are registered.',
        rollback: 'Keep Phase 12 status blocked and rerun the validation scaffold.',
    },
    {
        id: 'implementation.funnel_contract',
        label: 'Privacy-safe funnel contracts and aggregation helpers',
        environment: 'internal',
        owner: 'engineering',
        gate: 'both',
        expectedState: 'Revenue Ops metrics are aggregate, privacy-safe, and server-derived.',
        rollback: 'Disable cockpit launch claims until funnel contracts pass.',
    },
    {
        id: 'implementation.support_diagnosis',
        label: 'Support-domain diagnosis model',
        environment: 'internal',
        owner: 'support',
        gate: 'both',
        expectedState: 'Support diagnosis separates payment, entitlement, auth, quota, analysis, webhook, and grants.',
        rollback: 'Use existing admin billing support notes only.',
    },
    {
        id: 'implementation.pro_cause_tree',
        label: 'Explicit Pro no-access first-cause tree',
        environment: 'internal',
        owner: 'support',
        gate: 'both',
        expectedState: 'Pro access diagnosis reports the first true cause without mutating paid state.',
        rollback: 'Route cases to admin reconciliation until the cause tree is passing.',
    },
    {
        id: 'implementation.role_boundaries',
        label: 'Support read/note/request boundaries and admin-only mutations',
        environment: 'internal',
        owner: 'admin',
        gate: 'both',
        expectedState: 'Support cannot grant, revoke, suspend, reconcile, or edit paid truth.',
        rollback: 'Disable risky staff actions and leave paid mutations admin-only.',
    },
    {
        id: 'implementation.readiness_gates',
        label: 'Paid launch readiness gate model',
        environment: 'internal',
        owner: 'engineering',
        gate: 'both',
        expectedState: 'Beta/public gates derive from hard evidence rows, not readiness percentages.',
        rollback: 'Keep paid launch no-go until gate model passes.',
    },
    {
        id: 'implementation.cockpit_ui',
        label: 'Staff-only Revenue Ops launch-control cockpit UI',
        environment: 'internal',
        owner: 'ops',
        gate: 'both',
        expectedState: 'Admin cockpit presents go/no-go, blockers, owner, evidence, and next action.',
        rollback: 'Use docs and admin billing route until cockpit evidence passes.',
    },
    {
        id: 'privacy.aggregate_default',
        label: 'Revenue Ops is aggregate by default',
        environment: 'internal',
        owner: 'engineering',
        gate: 'both',
        expectedState: 'Revenue Ops surfaces aggregate metrics before user-level detail.',
        rollback: 'Hide user-level detail unless a concrete support reason is supplied.',
    },
    {
        id: 'privacy.detail_reason',
        label: 'User-level detail requires an operational reason',
        environment: 'internal',
        owner: 'support',
        gate: 'both',
        expectedState: 'User-level detail is opened only with an approved operational reason.',
        rollback: 'Disable detail drill-in until reason enforcement passes.',
    },
    {
        id: 'privacy.prohibited_fields',
        label: 'Raw clip, private, payment, and financial fields are blocked from staff payloads',
        environment: 'internal',
        owner: 'engineering',
        gate: 'both',
        expectedState: 'Raw clip, private, payment, card, bank, address, and private revenue fields are rejected.',
        rollback: 'Remove unsafe fields and rerun privacy tests.',
    },
    {
        id: 'funnel.first_usable_analysis',
        label: 'First usable analysis metric',
        environment: 'internal',
        owner: 'ops',
        gate: 'both',
        expectedState: 'Activation counts only first usable analysis completion.',
        rollback: 'Remove activation metric from launch cockpit.',
    },
    {
        id: 'funnel.upgrade_intent_real_actions',
        label: 'Upgrade intent counts real attempts and excludes passive impressions',
        environment: 'internal',
        owner: 'ops',
        gate: 'both',
        expectedState: 'Upgrade intent is limited to real action attempts.',
        rollback: 'Do not use upgrade-intent counts for launch decisions.',
    },
    {
        id: 'funnel.checkout_truth',
        label: 'Checkout started and confirmed derive from server/webhook truth',
        environment: 'internal',
        owner: 'engineering',
        gate: 'both',
        expectedState: 'Checkout confirmation derives from webhook/subscription truth.',
        rollback: 'Keep success URL copy in pending/support mode.',
    },
    {
        id: 'funnel.pro_active_churn_quota',
        label: 'Pro active, churn/cancellation, and quota-limit states are visible',
        environment: 'internal',
        owner: 'ops',
        gate: 'both',
        expectedState: 'Pro, churn/cancel, and quota-limit states are inspectable as aggregate signals.',
        rollback: 'Treat funnel health as unknown and keep public launch no-go.',
    },
    {
        id: 'support.domains',
        label: 'Payment, entitlement, auth, quota, analysis, webhook, and admin-grant domains',
        environment: 'internal',
        owner: 'support',
        gate: 'both',
        expectedState: 'Support domains are explicit and stable.',
        rollback: 'Route unresolved cases to admin billing detail.',
    },
    {
        id: 'support.safe_summary',
        label: 'Safe pasteable support summary with stable reason codes',
        environment: 'internal',
        owner: 'support',
        gate: 'both',
        expectedState: 'Support summaries avoid private payment, clip, and raw analysis data.',
        rollback: 'Disable copy-summary action until sanitizer tests pass.',
    },
    {
        id: 'support.billing_detail',
        label: 'Admin billing detail surfaces diagnosis near resolver truth',
        environment: 'internal',
        owner: 'admin',
        gate: 'both',
        expectedState: 'Billing detail shows support diagnosis without overriding resolver truth.',
        rollback: 'Keep existing billing detail route and no public launch claim.',
    },
    {
        id: 'paid_flow.test_mode_matrix',
        label: 'Stripe test-mode paid-flow evidence matrix',
        environment: 'stripe_test',
        owner: 'ops',
        gate: 'both',
        expectedState: 'Stripe test checkout, webhook, portal, cancellation, failure, refund, admin, and safe-mode rows pass.',
        rollback: 'Keep checkout disabled and rerun the Stripe test checklist.',
    },
    {
        id: 'paid_flow.production_matrix',
        label: 'Stripe production evidence is separate and explicit',
        environment: 'stripe_production',
        owner: 'stripe',
        gate: 'public_paid',
        expectedState: 'Production Stripe evidence passes independently of test-mode evidence.',
        rollback: 'Keep public paid launch no-go and disable risky checkout.',
    },
    {
        id: 'paid_flow.safe_degradation',
        label: 'Paid-flow failures close risky actions while preserving confirmed Pro access and Free usefulness',
        environment: 'internal',
        owner: 'engineering',
        gate: 'both',
        expectedState: 'Safe degradation closes new checkout, preserves confirmed Pro, keeps Free useful, and points to a runbook.',
        rollback: 'Disable unsafe flags and rerun monetization invariant tests.',
    },
    {
        id: 'launch.founder_beta_gate',
        label: 'Founder/Beta launch gate',
        environment: 'stripe_test',
        owner: 'founder',
        gate: 'founder_beta',
        expectedState: 'Founder/Beta launch has explicit test-mode, support, privacy, and runbook evidence.',
        rollback: 'Keep founder beta grant-only or blocked.',
    },
    {
        id: 'launch.public_paid_gate',
        label: 'Public paid launch gate',
        environment: 'stripe_production',
        owner: 'founder',
        gate: 'public_paid',
        expectedState: 'Public paid launch has explicit production, deploy, support, compliance, and smoke evidence.',
        rollback: 'Keep public checkout closed.',
    },
    {
        id: 'launch.no_go_copy',
        label: 'NO-GO states show blocker, impact, owner, runbook, missing evidence, and smallest next step',
        environment: 'internal',
        owner: 'ops',
        gate: 'both',
        expectedState: 'Every no-go has actionable blocker copy and a smallest next verification step.',
        rollback: 'Do not render launch CTA without no-go explanation.',
    },
    {
        id: 'launch.compliance_copy',
        label: 'Compliance copy avoids perfect sensitivity, guaranteed rank, and PUBG/KRAFTON affiliation claims',
        environment: 'manual',
        owner: 'ops',
        gate: 'public_paid',
        expectedState: 'Paid launch copy is independent from PUBG/KRAFTON and avoids guaranteed outcome claims.',
        rollback: 'Block public launch copy until compliance row passes.',
    },
    {
        id: 'playwright.desktop_matrix',
        label: 'Desktop Revenue Ops cockpit evidence matrix',
        environment: 'local',
        owner: 'engineering',
        gate: 'both',
        expectedState: 'Desktop browser evidence covers Revenue Ops cockpit states.',
        rollback: 'Keep cockpit browser evidence pending.',
    },
    {
        id: 'playwright.mobile_matrix',
        label: 'Mobile Revenue Ops cockpit evidence matrix',
        environment: 'local',
        owner: 'engineering',
        gate: 'both',
        expectedState: 'Mobile browser evidence covers Revenue Ops cockpit states without overflow.',
        rollback: 'Keep mobile cockpit evidence pending.',
    },
    {
        id: 'commands.phase12_focused',
        label: 'Focused Phase 12 Vitest and Playwright checks',
        environment: 'local',
        owner: 'engineering',
        gate: 'both',
        expectedState: 'Focused Revenue Ops tests pass.',
        rollback: 'Fix focused Revenue Ops regressions before launch decisions.',
    },
    {
        id: 'commands.monetization',
        label: 'Monetization gate',
        environment: 'local',
        owner: 'engineering',
        gate: 'both',
        expectedState: 'Monetization tests pass.',
        rollback: 'Fix paid access/quota/billing regressions.',
    },
    {
        id: 'commands.typecheck',
        label: 'TypeScript gate',
        environment: 'local',
        owner: 'engineering',
        gate: 'both',
        expectedState: 'TypeScript passes.',
        rollback: 'Fix type errors before launch decisions.',
    },
    {
        id: 'commands.vitest',
        label: 'Full Vitest gate',
        environment: 'local',
        owner: 'engineering',
        gate: 'both',
        expectedState: 'Full Vitest passes.',
        rollback: 'Fix repository regressions before launch decisions.',
    },
    {
        id: 'commands.benchmark_gate',
        label: 'Benchmark gate',
        environment: 'local',
        owner: 'engineering',
        gate: 'both',
        expectedState: 'Analysis benchmark gate passes without weakened truth behavior.',
        rollback: 'Fix benchmark regressions before paid launch claims.',
    },
    {
        id: 'commands.build',
        label: 'Production build gate',
        environment: 'local',
        owner: 'engineering',
        gate: 'both',
        expectedState: 'Production build passes.',
        rollback: 'Fix build regressions before launch decisions.',
    },
    {
        id: 'commands.readiness_local',
        label: 'Local readiness gate',
        environment: 'local',
        owner: 'engineering',
        gate: 'both',
        expectedState: 'Local browser-first readiness passes.',
        rollback: 'Fix local readiness blockers before launch decisions.',
    },
    {
        id: 'commands.readiness_deploy',
        label: 'Deploy readiness gate or explicit external blocker',
        environment: 'deploy',
        owner: 'ops',
        gate: 'public_paid',
        expectedState: 'Deploy readiness passes or records an explicit external blocker.',
        rollback: 'Keep public launch no-go until deploy evidence passes.',
    },
    {
        id: 'commands.verify_phase12',
        label: 'Phase 12 Revenue Ops verifier self-run',
        environment: 'local',
        owner: 'engineering',
        gate: 'both',
        expectedState: 'Phase 12 verifier passes with honest final status.',
        rollback: 'Fix checklist evidence or status declaration.',
    },
] as const;

export const revenueOpsEvidenceRowIds = revenueOpsEvidenceRowDefinitions.map((row) => row.id);

const STATUS_RANK: Record<RevenueOpsEvidenceStatus, number> = {
    PASS: 0,
    WARN: 1,
    PENDING: 2,
    BLOCKED: 3,
    MISSING: 4,
    FAIL: 5,
};

function definitionFor(rowId: string): RevenueOpsEvidenceRowDefinition | undefined {
    return revenueOpsEvidenceRowDefinitions.find((definition) => definition.id === rowId);
}

function normalizeEvidenceEnvironment(
    value: string | null | undefined,
    definition: RevenueOpsEvidenceRowDefinition | undefined,
): RevenueOpsEvidenceEnvironment {
    const normalized = (value ?? '').trim().toLowerCase();

    if (normalized === 'test' || normalized === 'stripe-test' || normalized === 'stripe_test') {
        return 'stripe_test';
    }

    if (
        normalized === 'prod'
        || normalized === 'production'
        || normalized === 'stripe-production'
        || normalized === 'stripe_production'
    ) {
        return 'stripe_production';
    }

    if (isRevenueOpsEvidenceEnvironment(normalized)) {
        return normalized;
    }

    return definition?.environment ?? 'internal';
}

function normalizeEvidenceStatus(value: string | null | undefined): RevenueOpsEvidenceStatus {
    const normalized = (value ?? '').trim().toUpperCase();

    return isRevenueOpsEvidenceStatus(normalized) ? normalized : 'MISSING';
}

function hasText(value: string | null | undefined): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function hasExplicitGap(value: string | null | undefined): boolean {
    if (!hasText(value)) {
        return false;
    }

    const normalized = value.trim().toLowerCase();

    return normalized !== 'none' && normalized !== 'nenhum' && normalized !== '-';
}

function rowLooksInheritedFromTest(row: RevenueOpsEvidenceInputRow): boolean {
    const text = [
        row.expectedState,
        row.observedEvidence,
        row.remainingGap,
    ].filter(Boolean).join(' ').toLowerCase();

    return text.includes('inherit') && text.includes('test');
}

function validateRow(
    row: RevenueOpsEvidenceInputRow,
    definition: RevenueOpsEvidenceRowDefinition | undefined,
    environment: RevenueOpsEvidenceEnvironment,
    status: RevenueOpsEvidenceStatus,
): readonly string[] {
    const issues: string[] = [];

    if (!hasText(row.expectedState)) {
        issues.push('expectedState is required');
    }

    if (!hasText(row.observedEvidence)) {
        issues.push('observedEvidence is required');
    }

    if (!hasText(row.actor)) {
        issues.push('actor/test account is required');
    }

    if (!hasText(row.checkedAt)) {
        issues.push('checkedAt date is required');
    }

    if (!hasText(row.owner)) {
        issues.push('owner is required');
    }

    if (!hasText(row.rollback)) {
        issues.push('rollback is required');
    }

    if (status !== 'PASS' && !hasExplicitGap(row.remainingGap)) {
        issues.push('remainingGap is required for non-pass evidence');
    }

    if (definition?.environment === 'stripe_production' && environment !== 'stripe_production') {
        issues.push('production evidence must use stripe_production environment');
    }

    if (row.id.toLowerCase().includes('production') && environment !== 'stripe_production') {
        issues.push('production evidence cannot be recorded as test evidence');
    }

    if (environment === 'stripe_production' && rowLooksInheritedFromTest(row)) {
        issues.push('production evidence cannot inherit test-mode PASS');
    }

    return issues;
}

function normalizeEvidenceRow(row: RevenueOpsEvidenceInputRow): NormalizedRevenueOpsEvidenceRow {
    const definition = definitionFor(row.id);
    const environment = normalizeEvidenceEnvironment(row.environment, definition);
    const inputStatus = normalizeEvidenceStatus(row.status);
    const validationIssues = validateRow(row, definition, environment, inputStatus);
    const status: RevenueOpsEvidenceStatus = validationIssues.length > 0 && inputStatus === 'PASS'
        ? 'BLOCKED'
        : inputStatus;

    return {
        id: row.id,
        environment,
        expectedState: row.expectedState ?? definition?.expectedState ?? '',
        observedEvidence: row.observedEvidence ?? '',
        actor: row.actor ?? '',
        checkedAt: row.checkedAt ?? '',
        owner: row.owner ?? definition?.owner ?? 'ops',
        rollback: row.rollback ?? definition?.rollback ?? '',
        status,
        remainingGap: row.remainingGap ?? '',
        validationIssues,
    };
}

function createBlocker(input: {
    readonly id: string;
    readonly status: RevenueOpsOperationalStatus;
    readonly blocker: string;
    readonly impact: string;
    readonly owner: EvidenceOwner;
    readonly runbook?: string;
    readonly missingEvidence: string;
    readonly smallestNextStep: string;
}): RevenueOpsLaunchBlocker {
    return {
        runbook: 'docs/revenue-ops-launch-readiness.md',
        ...input,
    };
}

function worstEvidenceStatus(rows: readonly NormalizedRevenueOpsEvidenceRow[]): RevenueOpsEvidenceStatus | null {
    if (rows.length === 0) {
        return null;
    }

    return rows.reduce<RevenueOpsEvidenceStatus>(
        (worst, row) => STATUS_RANK[row.status] > STATUS_RANK[worst] ? row.status : worst,
        'PASS',
    );
}

function evidenceStatusToOperationalStatus(
    status: RevenueOpsEvidenceStatus | null,
): RevenueOpsOperationalStatus {
    switch (status) {
        case 'PASS':
            return 'PASS';
        case 'WARN':
        case 'PENDING':
            return 'WARN';
        case 'FAIL':
            return 'FAIL';
        case 'BLOCKED':
        case 'MISSING':
        case null:
            return 'BLOCKED';
    }
}

function groupForRows(
    rows: readonly NormalizedRevenueOpsEvidenceRow[],
    groupId: string,
    missingMessage: string,
): RevenueOpsReadinessGroup {
    const status = evidenceStatusToOperationalStatus(worstEvidenceStatus(rows));
    const blockers = status === 'PASS' || status === 'WARN'
        ? []
        : [
            createBlocker({
                id: `${groupId}.blocked`,
                status,
                blocker: missingMessage,
                impact: 'Launch status cannot pass without explicit evidence for this group.',
                owner: groupId.includes('production') ? 'stripe' : 'ops',
                missingEvidence: rows.length === 0
                    ? missingMessage
                    : rows.filter((row) => row.status !== 'PASS').map((row) => row.id).join(', '),
                smallestNextStep: 'Add a dated evidence row with actor, observed evidence, rollback, result, and remaining gap.',
            }),
        ];

    return {
        status,
        rowIds: rows.map((row) => row.id),
        blockers,
    };
}

function requiredDefinitionsForGate(scope: GateScope): readonly RevenueOpsEvidenceRowDefinition[] {
    return revenueOpsEvidenceRowDefinitions.filter((definition) => (
        definition.gate === scope || definition.gate === 'both'
    ));
}

function rowsForDefinitions(
    rows: readonly NormalizedRevenueOpsEvidenceRow[],
    definitions: readonly RevenueOpsEvidenceRowDefinition[],
): readonly NormalizedRevenueOpsEvidenceRow[] {
    const definitionIds = new Set(definitions.map((definition) => definition.id));

    return rows.filter((row) => definitionIds.has(row.id));
}

function missingDefinitions(
    rows: readonly NormalizedRevenueOpsEvidenceRow[],
    definitions: readonly RevenueOpsEvidenceRowDefinition[],
): readonly RevenueOpsEvidenceRowDefinition[] {
    const rowIds = new Set(rows.map((row) => row.id));

    return definitions.filter((definition) => !rowIds.has(definition.id));
}

function gateGroup(
    rows: readonly NormalizedRevenueOpsEvidenceRow[],
    definitions: readonly RevenueOpsEvidenceRowDefinition[],
    gateId: string,
    gateLabel: string,
): RevenueOpsReadinessGroup {
    const matchingRows = rowsForDefinitions(rows, definitions);
    const missing = missingDefinitions(rows, definitions);
    const worstStatus = worstEvidenceStatus(matchingRows);
    const operationalStatus = missing.length > 0
        ? 'NO-GO'
        : worstStatus === 'FAIL'
            ? 'FAIL'
            : worstStatus === 'BLOCKED' || worstStatus === 'MISSING' || worstStatus === null
                ? 'NO-GO'
                : worstStatus === 'WARN' || worstStatus === 'PENDING'
                    ? 'WARN'
                    : 'PASS';
    const nonPassingRows = matchingRows.filter((row) => row.status !== 'PASS');
    const blockers = operationalStatus === 'PASS' || operationalStatus === 'WARN'
        ? []
        : [
            createBlocker({
                id: `${gateId}.no_go`,
                status: operationalStatus,
                blocker: `${gateLabel} is missing hard launch evidence.`,
                impact: 'Real charging remains blocked until paid-flow evidence is complete.',
                owner: gateId.includes('public') ? 'founder' : 'ops',
                missingEvidence: [
                    ...missing.map((definition) => definition.id),
                    ...nonPassingRows.map((row) => row.id),
                ].join(', '),
                smallestNextStep: missing.length > 0
                    ? `Record evidence for ${missing[0]?.id}.`
                    : `Resolve ${nonPassingRows[0]?.id}.`,
            }),
        ];

    return {
        status: operationalStatus,
        rowIds: matchingRows.map((row) => row.id),
        blockers,
    };
}

function deriveFinalStatus(
    founderBetaLaunch: RevenueOpsReadinessGroup,
    publicPaidLaunch: RevenueOpsReadinessGroup,
): RevenueOpsFinalStatus {
    if (
        founderBetaLaunch.status === 'PASS'
        && publicPaidLaunch.status === 'PASS'
    ) {
        return 'Delivered';
    }

    if (founderBetaLaunch.status === 'WARN' || publicPaidLaunch.status === 'WARN') {
        return 'Partially delivered';
    }

    return 'Blocked';
}

export function buildPaidLaunchReadinessMatrix(
    input: BuildPaidLaunchReadinessMatrixInput = {},
): RevenueOpsPaidLaunchReadinessMatrix {
    const rows = (input.evidence ?? []).map(normalizeEvidenceRow);
    const rowsNeedingExplicitGaps = rows
        .filter((row) => row.status !== 'PASS')
        .filter((row) => !hasExplicitGap(row.remainingGap))
        .map((row) => row.id);
    const missingMandatoryRows = missingDefinitions(rows, revenueOpsEvidenceRowDefinitions)
        .map((definition) => definition.id);
    const stripeTestRows = rows.filter((row) => row.environment === 'stripe_test');
    const stripeProductionRows = rows.filter((row) => row.environment === 'stripe_production');
    const founderBetaLaunch = gateGroup(
        rows,
        requiredDefinitionsForGate('founder_beta'),
        'founder_beta_launch',
        'Founder/Beta launch',
    );
    const publicPaidLaunch = gateGroup(
        rows,
        requiredDefinitionsForGate('public_paid'),
        'public_paid_launch',
        'Public paid launch',
    );

    return {
        version: 'revenue-ops-launch-readiness-v1',
        rows,
        rowsNeedingExplicitGaps,
        missingMandatoryRows,
        stripe: {
            test: groupForRows(
                stripeTestRows,
                'stripe_test',
                'Stripe test-mode paid-flow evidence is missing or blocked.',
            ),
            production: groupForRows(
                stripeProductionRows,
                'stripe_production',
                'Stripe production evidence is separate and must not inherit test-mode PASS.',
            ),
        },
        founderBetaLaunch,
        publicPaidLaunch,
        finalStatus: deriveFinalStatus(founderBetaLaunch, publicPaidLaunch),
    };
}

function deriveSafeDegradation(input: EvaluateRevenueOpsLaunchGatesInput): RevenueOpsSafeDegradationSummary {
    const checkoutClosed = input.checkoutEnabled === false || input.entitlementSafeMode === true;
    const preserveConfirmedPaidAccess = input.preserveConfirmedPaidAccess !== false;
    const keepFreeUseful = input.keepFreeUseful !== false;
    const grantProToEveryone = input.grantProToEveryone === true;
    const historyPreserved = input.historyPreserved !== false;
    const billingSupportRoutesVisible = input.billingSupportRoutesVisible !== false;
    const missingEvidence = input.missingEvidence ?? [];
    const unsafe = grantProToEveryone || !preserveConfirmedPaidAccess || !keepFreeUseful
        || !historyPreserved || !billingSupportRoutesVisible;
    const incidentActive = checkoutClosed || missingEvidence.length > 0;
    const status: RevenueOpsOperationalStatus = unsafe
        ? 'FAIL'
        : incidentActive
            ? 'NO-GO'
            : 'PASS';
    const blocker = status === 'PASS'
        ? null
        : createBlocker({
            id: unsafe ? 'safe_degradation.unsafe' : 'safe_degradation.active',
            status,
            blocker: unsafe
                ? 'Safe degradation invariants are violated.'
                : 'Paid-flow safe degradation is active or evidence is missing.',
            impact: unsafe
                ? 'Incident handling could incorrectly mutate paid truth or user history.'
                : 'New risky paid actions remain closed while confirmed paid access and Free usefulness are preserved.',
            owner: unsafe ? 'engineering' : 'ops',
            runbook: 'docs/monetization-runbooks.md#paid-launch-safe-degradation',
            missingEvidence: missingEvidence.length > 0 ? missingEvidence.join(', ') : 'Safe degradation incident evidence.',
            smallestNextStep: unsafe
                ? 'Restore preserveConfirmedPaidAccess, keepFreeUseful, historyPreserved, billingSupportRoutesVisible, and grantProToEveryone=false.'
                : 'Resolve the paid-flow blocker, record evidence, then reopen checkout deliberately.',
        });

    return {
        status,
        checkoutClosed,
        preserveConfirmedPaidAccess,
        keepFreeUseful,
        grantProToEveryone,
        historyPreserved,
        billingSupportRoutesVisible,
        blocker,
    };
}

export function evaluateRevenueOpsLaunchGates(
    input: EvaluateRevenueOpsLaunchGatesInput = {},
): RevenueOpsLaunchGateEvaluation {
    const matrix = buildPaidLaunchReadinessMatrix(input);
    const safeDegradation = deriveSafeDegradation(input);
    const publicPaidLaunch = safeDegradation.status === 'PASS'
        ? matrix.publicPaidLaunch
        : {
            ...matrix.publicPaidLaunch,
            status: matrix.publicPaidLaunch.status === 'FAIL' || safeDegradation.status === 'FAIL'
                ? 'FAIL'
                : 'NO-GO',
            blockers: [
                ...matrix.publicPaidLaunch.blockers,
                ...(safeDegradation.blocker ? [safeDegradation.blocker] : []),
            ],
        } satisfies RevenueOpsReadinessGroup;

    return {
        ...matrix,
        publicPaidLaunch,
        finalStatus: deriveFinalStatus(matrix.founderBetaLaunch, publicPaidLaunch),
        safeDegradation,
    };
}

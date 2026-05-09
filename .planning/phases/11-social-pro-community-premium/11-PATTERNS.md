# Phase 11: Social Pro Community Premium - Pattern Map

**Mapped:** 2026-05-09  
**Files analyzed:** 45 candidate new/modified files  
**Analogs found:** 44 / 45  

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/types/social-pro.ts` | model | transform | `src/types/community.ts`, `src/types/monetization.ts` | exact |
| `src/types/social-pro.test.ts` | test | transform | `src/types/community.test.ts`, `src/lib/product-entitlements.test.ts` | role-match |
| `src/types/monetization.ts` | model | transform | existing product entitlement/event unions | exact |
| `src/db/schema.ts` | model | CRUD | `communityPosts`, `communityPostAnalysisSnapshots`, `communityReports`, `monetizationAnalyticsEvents` in `src/db/schema.ts` | exact |
| `drizzle/0014_social_pro_community_premium.sql` | migration | CRUD | prior Drizzle migrations and `src/db/schema.ts` table definitions | role-match |
| `src/lib/social-pro-access.ts` | service | request-response | `src/lib/product-access-server.ts`, `src/lib/product-entitlements.ts` | exact |
| `src/lib/social-pro-link-token.ts` | utility | transform | none | no analog |
| `src/lib/social-pro-access.test.ts` | test | request-response | `src/lib/product-entitlements.test.ts` | exact |
| `src/lib/product-entitlements.ts` | service/config | request-response | existing `productProEntitlementKeys` and catalog resolver | exact |
| `src/lib/premium-projection.ts` | service | transform | existing Free/Pro projection locks | exact |
| `src/lib/product-analytics.ts` | service | event-driven | existing privacy-minimal analytics helpers | exact |
| `src/lib/product-analytics.test.ts` | test | event-driven | existing analytics privacy tests | exact |
| `src/core/social-pro-report-redaction.ts` | utility | transform | `src/core/community-post-snapshot.ts`, `src/lib/premium-projection.ts`, `src/core/measurement-truth.ts` | role-match |
| `src/core/social-pro-report-redaction.test.ts` | test | transform | `src/core/community-post-snapshot.test.ts`, `src/core/copy-safety.test.ts` | role-match |
| `src/core/social-pro-report-view-model.ts` | service | transform | `src/core/community-discovery-view-model.ts`, `src/lib/training-program-projection.ts` | role-match |
| `src/core/social-pro-creator-analytics.ts` | service | CRUD | `src/core/community-creator-metrics.ts` | exact |
| `src/core/social-pro-creator-analytics.test.ts` | test | CRUD | `src/core/community-creator-metrics.test.ts` | exact |
| `src/actions/social-pro-reports.ts` | service/action | request-response + CRUD | `src/actions/community-posts.ts`, `src/actions/training-programs.ts` | exact |
| `src/actions/social-pro-reports.test.ts` | test | request-response + CRUD | `src/actions/community-posts.test.ts` | exact |
| `src/actions/social-pro-library.ts` | service/action | request-response + CRUD | `src/actions/community-saves.ts`, `src/actions/training-programs.ts` | role-match |
| `src/actions/social-pro-library.test.ts` | test | request-response + CRUD | `src/actions/community-saves.test.ts` | exact |
| `src/actions/community-saves.test.ts` | test | request-response + CRUD | existing private save tests | exact |
| `src/actions/community-reports.ts` | service/action | request-response + CRUD | existing report target resolver | exact |
| `src/actions/community-reports.test.ts` | test | request-response + CRUD | existing report tests | exact |
| `src/actions/community-admin.ts` | service/action | request-response + CRUD | existing admin moderation/audit action | exact |
| `src/actions/community-admin.test.ts` | test | request-response + CRUD | existing moderation audit tests | exact |
| `src/app/community/report-button.tsx` | component | event-driven | existing report modal button | exact |
| `src/app/community/page.tsx` | route/component | request-response | existing community discovery hub | exact |
| `src/app/community/community-hub.module.css` | component/style | transform | existing community hub/post/profile CSS | exact |
| `src/app/community/social-pro-copy.contract.test.ts` | test | file-I/O | `src/core/copy-safety.test.ts`, `src/app/copy-claims.contract.test.ts` | exact |
| `src/app/community/reports/[token]/page.tsx` | route | request-response | `src/app/community/[slug]/page.tsx`, `src/app/ciclo-pro/page.tsx` | role-match |
| `src/app/community/reports/[token]/pro-report-detail.tsx` | component | request-response | `src/app/community/[slug]/post-detail.tsx` | role-match |
| `src/app/community/[slug]/page.tsx` | route | request-response | existing post detail route access loader | exact |
| `src/app/community/[slug]/post-detail.tsx` | component | request-response + event-driven children | existing post detail hero/actions/snapshot | exact |
| `src/app/community/users/[slug]/page.tsx` | route/component | request-response | existing public profile/trust rail/badge | exact |
| `src/app/analyze/results-dashboard.tsx` | component | event-driven | existing Ciclo Pro/Spray Lab handoffs | exact |
| `src/app/dashboard/page.tsx` | route/component | request-response | existing loop-stage/handoff cockpit | role-match |
| `src/app/history/page.tsx` | route/component | request-response | existing history premium/loop surface | role-match |
| `src/app/history/[id]/page.tsx` | route/component | request-response | existing evidence-link audit surface | role-match |
| `src/app/ciclo-pro/page.tsx` | route | request-response | server-owned projection route | exact |
| `src/app/spray-lab/page.tsx` | route | request-response | server-owned projection route | exact |
| `src/ci/phase11-social-pro-evidence.test.ts` | test | file-I/O | `src/ci/phase10-programs-evidence.test.ts` | exact |
| `scripts/verify-phase11-social-pro.ts` | utility/script | file-I/O + batch | `scripts/verify-phase10-programs.ts` | exact |
| `e2e/phase11-social-pro.spec.ts` | test | request-response/browser | `e2e/phase10.programs.spec.ts`, `e2e/community.visual-check.spec.ts` | exact |
| `package.json` | config | batch | existing `verify:phase10:programs`, community scripts | exact |

## Pattern Assignments

### `src/types/social-pro.ts`, `src/types/social-pro.test.ts` (model/test, transform)

**Analogs:** `src/types/community.ts`, `src/types/monetization.ts`, `src/types/engine.ts`

**Imports and enum contract pattern** (`src/types/community.ts` lines 1-41):
```typescript
import { z } from 'zod';

function createCommunityEnumContract<const TValues extends readonly [string, ...string[]]>(values: TValues) {
    const schema = z.enum(values);
    const valueSet = new Set<string>(values);

    return {
        values,
        schema,
        isValue(value: string): value is TValues[number] {
            return valueSet.has(value);
        },
        parse(value: string): TValues[number] {
            return schema.parse(value);
        },
    };
}
```

**Visibility/status values to copy** (`src/types/community.ts` lines 44-69):
```typescript
const postStatusContract = createCommunityEnumContract([
    'draft',
    'published',
    'hidden',
    'archived',
    'deleted',
]);

const postVisibilityContract = createCommunityEnumContract([
    'public',
    'unlisted',
    'followers_only',
    'premium_future',
]);
```

**Report evidence fields to reference** (`src/types/engine.ts` lines 1441-1461):
```typescript
export interface AnalysisResult {
    readonly id: string;
    readonly historySessionId?: string;
    readonly quota?: AnalysisSaveQuotaNotice;
    readonly premiumProjection?: PremiumProjectionSummary;
    readonly timestamp: Date;
    readonly patchVersion: string;
    readonly analysisContext?: AnalysisContextDetails;
    readonly videoQualityReport?: VideoQualityReport;
    readonly trajectory: SprayTrajectory;
    readonly loadout: WeaponLoadout;
    readonly metrics: SprayMetrics;
    readonly diagnoses: readonly Diagnosis[];
    readonly analysisDecision?: AnalysisDecision;
    readonly sensitivity: SensitivityRecommendation;
    readonly coaching: readonly CoachFeedback[];
    readonly coachPlan?: CoachPlan;
    readonly coachDecisionSnapshot?: CoachDecisionSnapshot;
    readonly coachOutcomeSnapshot?: CoachProtocolOutcomeSnapshot;
    readonly mastery?: SprayMastery;
    readonly precisionTrend?: PrecisionTrendSummary;
}
```

**Apply to Phase 11:** Define narrow contracts for report visibility (`public`, `link_private`), report status/lifecycle, link status, library item kind, collection mode, public-safe section keys, Pro report moderation reasons, safe creator analytics metrics, and report honesty fields. Keep the contract zod-backed with exported `values`, `schema`, `type`, `isValue`, and `parse`.

---

### `src/types/monetization.ts`, `src/lib/product-entitlements.ts`, `src/lib/social-pro-access.ts`, `src/lib/social-pro-access.test.ts` (model/service/test, request-response)

**Analogs:** `src/types/monetization.ts`, `src/lib/product-entitlements.ts`, `src/lib/product-access-server.ts`, `src/lib/product-entitlements.test.ts`

**Existing community product keys** (`src/types/monetization.ts` lines 49-89):
```typescript
const productEntitlementKeyContract = createMonetizationEnumContract([
    'analysis.save.free_limit',
    'analysis.save.pro_limit',
    'analysis.save.quota_warning',
    'coach.summary',
    'coach.full_plan',
    // ...
    'spray_lab.session_runner',
    'spray_lab.benchmarks',
    'community.pro_badge',
    'community.premium_report_share',
    'community.creator_attribution',
    'team.player_review',
    'team.seats',
]);

export const productEntitlementKeyValues = productEntitlementKeyContract.values;
export const productEntitlementKeySchema = productEntitlementKeyContract.schema;
export type ProductEntitlementKey = z.infer<typeof productEntitlementKeySchema>;
export const isProductEntitlementKey = productEntitlementKeyContract.isValue;
export const parseProductEntitlementKey = productEntitlementKeyContract.parse;
```

**Pro catalog pattern** (`src/lib/product-entitlements.ts` lines 114-130):
```typescript
export const productProEntitlementKeys = [
    'analysis.save.pro_limit',
    'coach.full_plan',
    'training.next_block_protocol',
    'history.full',
    'trends.compatible_full',
    'precision.evolution_lines',
    'precision.checkpoints',
    'metrics.advanced',
    'coach.outcome_capture',
    'coach.validation_loop',
    'programs.guided_weekly',
    'programs.guided_monthly',
    'spray_lab.session_runner',
    'spray_lab.benchmarks',
    'billing.portal_access',
] as const satisfies readonly ProductEntitlementKey[];
```

**Catalog status/gating pattern** (`src/lib/product-entitlements.ts` lines 146-200):
```typescript
export const productDefaultEntitlementCatalog = productEntitlementKeyValues.map(
    (key): ProductEntitlementDefinition => {
        if (defaultFreeKeySet.has(key)) {
            return {
                key,
                status: 'active',
                tier: 'free',
                surface: key.split('.')[0] ?? 'product',
                labelKey: `monetization.entitlement.${key}`,
                internalDescription: `Default free entitlement: ${key}`,
                introducedPhase: '05',
                ownerDomain: 'product',
                gatingMode: 'default_free',
            };
        }

        if (proKeySet.has(key)) {
            return {
                key,
                status: 'active',
                tier: 'pro',
                surface: key.split('.')[0] ?? 'product',
                labelKey: `monetization.entitlement.${key}`,
                internalDescription: `Phase 5 Pro entitlement: ${key}`,
                introducedPhase: '05',
                ownerDomain: 'product',
                gatingMode: 'requires_pro',
            };
        }

        return {
            key,
            status: 'planned',
            tier: 'future',
            surface: key.split('.')[0] ?? 'future',
            labelKey: `monetization.entitlement.${key}`,
            internalDescription: `Planned future monetization entitlement: ${key}`,
            introducedPhase: '05',
            ownerDomain: 'future',
            gatingMode: 'planned_future',
        };
    },
);
```

**Server access resolver** (`src/lib/product-access-server.ts` lines 13-27):
```typescript
export async function resolveServerProductAccess(
    userId: string | null | undefined,
): Promise<ProductAccessResolution> {
    if (!userId) {
        return resolveProductAccess();
    }

    try {
        return (await resolveAnalysisSaveAccessWithResolution({
            repository: createDrizzleQuotaLedgerRepository(db),
            userId,
        })).access;
    } catch {
        return resolveProductAccess({ userId });
    }
}
```

**Entitlement check** (`src/lib/product-entitlements.ts` lines 504-509):
```typescript
export function hasProductEntitlement(
    resolution: ProductAccessResolution,
    key: ProductEntitlementKey,
): boolean {
    return resolution.features[key]?.granted ?? false;
}
```

**Tests to copy** (`src/lib/product-entitlements.test.ts` lines 30-52, 89-135, 137-181):
```typescript
it('returns useful free access without Pro-only entitlements by default', async () => {
    const result = resolveProductAccess({ now });

    expect(result).toMatchObject({
        effectiveTier: 'free',
        accessState: 'free',
        source: 'default_free',
        billingStatus: 'none',
    });
    expect(hasProductEntitlement(result, 'coach.summary')).toBe(true);
    expect(hasProductEntitlement(result, 'coach.full_plan')).toBe(false);
});

it('grants Pro and founder access for active Stripe subscriptions and preserves canceling access through period end', async () => {
    const pro = resolveProductAccess({ now, subscription: { status: 'active', tier: 'pro', currentPeriodStart: yesterday, currentPeriodEnd: tomorrow } });
    expect(pro).toMatchObject({ effectiveTier: 'pro', accessState: 'pro_active', source: 'stripe_subscription', billingStatus: 'active' });
    expect(hasProductEntitlement(pro, 'coach.full_plan')).toBe(true);
});

it('does not grant Pro for canceled subscriptions', async () => {
    const result = resolveProductAccess({ now, subscription: { status: 'canceled', tier: 'pro' } });
    expect(result.accessState).toBe('canceled');
    expect(result.effectiveTier).toBe('free');
    expect(hasProductEntitlement(result, 'coach.full_plan')).toBe(false);
});
```

**Apply to Phase 11:** Activate/refine `community.pro_badge`, `community.premium_report_share`, `community.creator_attribution`, and add explicit keys if needed for `community.pro_library`, `community.creator_analytics`, `community.private_report_links`, and `community.advanced_context`. The Social Pro access wrapper should call `resolveServerProductAccess`, then expose booleans by `hasProductEntitlement`; no client state and no `community-entitlements.ts` future scaffold should grant Phase 11 Pro access.

---

### `src/lib/premium-projection.ts` and UI lock copy consumers (service, transform)

**Analog:** `src/lib/premium-projection.ts`

**Feature copy maps** (`src/lib/premium-projection.ts` lines 79-109):
```typescript
const FREE_VISIBLE_COPY: Partial<Record<ProductEntitlementKey, string>> = {
    'coach.full_plan': 'resumo do coach, foco primario, confianca, cobertura e bloqueios continuam visiveis no Free',
    'training.next_block_protocol': 'foco, duracao, passos essenciais, preparo compacto, validacao basica, confianca, cobertura e bloqueios continuam visiveis no Free',
    'programs.guided_weekly': 'proximo passo, uma missao semanal basica, blockers, evidencia e CTA do Ciclo Pro continuam visiveis no Free',
    'spray_lab.session_runner': 'sessao guiada basica, checklist, timer simples, score provisorio e CTA de validacao continuam visiveis no Free',
};

const PRO_VALUE_COPY: Partial<Record<ProductEntitlementKey, string>> = {
    'training.next_block_protocol': 'Pro adiciona reps, local, alvo, criterios, preparacao completa, auditoria, revisao, validacao compativel e transferencia real',
    'programs.guided_monthly': 'Pro organiza o Ciclo Pro de 30 dias com quatro semanas, checkpoints, recuperacao, historico e continuidade auditavel',
    'spray_lab.benchmarks': 'Pro adiciona indice validado, benchmark por contexto e comparacoes entre suas sessoes e clips compativeis',
};
```

**Projection summary** (`src/lib/premium-projection.ts` lines 202-227):
```typescript
export function createPremiumProjectionSummary(
    access: ProductAccessResolution,
    result?: AnalysisResult,
): PremiumProjectionSummary {
    const featureValues = Object.values(access.features);
    const visibleFeatureKeys = featureValues
        .filter((feature) => feature.granted)
        .map((feature) => feature.key);
    const hiddenFeatureKeys = featureValues
        .filter((feature) => !feature.granted)
        .map((feature) => feature.key);

    return {
        tier: access.effectiveTier,
        accessState: access.accessState,
        billingStatus: access.billingStatus,
        quota: access.quota,
        locks: buildLocks(access, result),
        visibleFeatureKeys,
        hiddenFeatureKeys,
        canSeeFullCoachPlan: hasProductEntitlement(access, FULL_COACH_FEATURE),
        canSeeFullHistory: hasProductEntitlement(access, HISTORY_FEATURE),
        canSeeAdvancedMetrics: hasProductEntitlement(access, ADVANCED_METRICS_FEATURE),
        canCaptureCoachOutcome: hasProductEntitlement(access, OUTCOME_FEATURE),
    };
}
```

**Apply to Phase 11:** Add Social Pro lock copy only for real Pro actions: generate/update report, Pro library save, private link controls, creator analytics, badge/report controls, and advanced context. Keep copy in the same posture: "Free still shows public truth; Pro adds organization/report/library/Ciclo continuity." Do not add generic feed banners or count passive impressions as upgrade intent.

---

### `src/db/schema.ts`, `drizzle/0014_social_pro_community_premium.sql` (model/migration, CRUD)

**Analogs:** Community post/snapshot, moderation, analytics, and program persistence tables in `src/db/schema.ts`

**Community post table pattern** (`src/db/schema.ts` lines 1074-1105):
```typescript
export const communityPosts = pgTable(
    'community_posts',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        authorId: uuid('author_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        communityProfileId: uuid('community_profile_id')
            .notNull()
            .references(() => communityProfiles.id, { onDelete: 'cascade' }),
        slug: text('slug').notNull(),
        type: text('type').$type<CommunityPostType>().notNull(),
        status: text('status').$type<CommunityPostStatus>().notNull().default('draft'),
        visibility: text('visibility').$type<CommunityPostVisibility>().notNull().default('public'),
        title: text('title').notNull(),
        excerpt: text('excerpt').notNull(),
        bodyMarkdown: text('body_markdown').notNull(),
        sourceAnalysisSessionId: uuid('source_analysis_session_id').references(() => analysisSessions.id, {
            onDelete: 'set null',
        }),
        requiredEntitlementKey: text('required_entitlement_key').$type<CommunityEntitlementKey>(),
        publishedAt: timestamp('published_at', { mode: 'date' }),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [uniqueIndex('community_posts_slug_uidx').on(table.slug)],
);
```

**Immutable snapshot JSON pattern** (`src/db/schema.ts` lines 1127-1162):
```typescript
export const communityPostAnalysisSnapshots = pgTable('community_post_analysis_snapshots', {
    postId: uuid('post_id')
        .notNull()
        .references(() => communityPosts.id, { onDelete: 'cascade' })
        .primaryKey(),
    analysisSessionId: uuid('analysis_session_id')
        .notNull()
        .references(() => analysisSessions.id),
    analysisResultId: text('analysis_result_id').notNull(),
    analysisTimestamp: timestamp('analysis_timestamp', { mode: 'string', withTimezone: true }).notNull(),
    analysisResultSchemaVersion: integer('analysis_result_schema_version').notNull(),
    patchVersion: text('patch_version').notNull(),
    weaponId: text('weapon_id').notNull(),
    metricsSnapshot: jsonb('metrics_snapshot')
        .notNull()
        .$type<CommunityPostAnalysisSnapshot['metricsSnapshot']>(),
    diagnosesSnapshot: jsonb('diagnoses_snapshot')
        .notNull()
        .$type<CommunityPostAnalysisSnapshot['diagnosesSnapshot']>(),
    coachingSnapshot: jsonb('coaching_snapshot')
        .notNull()
        .$type<CommunityPostAnalysisSnapshot['coachingSnapshot']>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});
```

**Moderation tables** (`src/db/schema.ts` lines 1813-1854):
```typescript
export const communityReports = pgTable('community_reports', {
    id: uuid('id').defaultRandom().primaryKey(),
    entityType: text('entity_type').$type<CommunityReportEntityType>().notNull(),
    entityId: uuid('entity_id').notNull(),
    reportedByUserId: uuid('reported_by_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'no action' }),
    reasonKey: text('reason_key').notNull(),
    details: text('details'),
    status: text('status').$type<CommunityReportStatus>().notNull().default('open'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    reviewedAt: timestamp('reviewed_at', { mode: 'date' }),
    reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id, {
        onDelete: 'set null',
    }),
});

export const communityModerationActions = pgTable('community_moderation_actions', {
    id: uuid('id').defaultRandom().primaryKey(),
    entityType: text('entity_type').$type<CommunityReportEntityType>().notNull(),
    entityId: uuid('entity_id').notNull(),
    actionKey: text('action_key').notNull(),
    actorUserId: uuid('actor_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'no action' }),
    notes: text('notes'),
    metadata: jsonb('metadata').notNull().default('{}').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});
```

**Analytics table** (`src/db/schema.ts` lines 2075-2098):
```typescript
export const monetizationAnalyticsEvents = pgTable(
    'monetization_analytics_events',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
        eventType: text('event_type').$type<MonetizationEventType>().notNull(),
        surface: text('surface'),
        featureKey: text('feature_key').$type<ProductEntitlementKey>(),
        accessState: text('access_state').$type<ProductAccessState>(),
        metadata: jsonb('metadata').notNull().default('{}').$type<Record<string, unknown>>(),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        index('monetization_analytics_events_type_created_idx').on(table.eventType, table.createdAt),
        index('monetization_analytics_events_user_created_idx').on(table.userId, table.createdAt),
    ],
);
```

**Apply to Phase 11:** Use dedicated Social Pro report/library/link tables instead of overloading `community_posts`. Store current public-safe report snapshot plus lifecycle/audit records. Link-private reports need visibility/status fields, revocation/regeneration, optional expiration, and admin disable/hide. Library tables should be private by default and indexed by `userId`, context keys, item kind, and updated time. Add typed JSON payloads for safe report snapshots and library context only.

---

### `src/core/social-pro-report-redaction.ts`, `src/core/social-pro-report-view-model.ts`, tests (utility/service/test, transform)

**Analogs:** `src/core/community-post-snapshot.ts`, `src/types/engine.ts`, `src/core/measurement-truth.ts`, `src/lib/training-program-projection.ts`

**Snapshot shape and clone pattern** (`src/core/community-post-snapshot.ts` lines 24-40, 47-75):
```typescript
export interface CommunityPostAnalysisSnapshot {
    readonly analysisSessionId: string;
    readonly analysisResultId: string;
    readonly analysisTimestamp: string;
    readonly analysisResultSchemaVersion: typeof COMMUNITY_POST_ANALYSIS_SNAPSHOT_SCHEMA_VERSION;
    readonly patchVersion: string;
    readonly weaponId: string;
    readonly scopeId: string;
    readonly distance: number;
    readonly metricsSnapshot: SprayMetrics;
    readonly diagnosesSnapshot: readonly Diagnosis[];
    readonly coachingSnapshot: CommunityPostAnalysisCoachingSnapshot;
    readonly sensSnapshot: SensitivityRecommendation;
    readonly trackingSnapshot: SprayTrajectory;
}

function cloneSnapshotValue<TValue>(value: TValue): TValue {
    return JSON.parse(JSON.stringify(value)) as TValue;
}
```

**Protocol audit fields to preserve** (`src/types/engine.ts` lines 669-703):
```typescript
export interface TrainingProtocolAudit {
    readonly createdAt: string;
    readonly analysisDecisionLevel?: AnalysisDecisionLevel;
    readonly primaryFocusArea: CoachFocusArea;
    readonly secondaryFocusAreas: readonly CoachFocusArea[];
    readonly confidence: number;
    readonly coverage: number;
    readonly source: 'deterministic_coach';
}

export interface CompleteTrainingProtocol {
    readonly version: CompleteTrainingProtocolVersion;
    readonly id: string;
    readonly title: string;
    readonly summary: string;
    readonly validation: TrainingProtocolValidationPlan;
    readonly transfer: TrainingProtocolTransferPlan;
    readonly downgrade: TrainingProtocolDowngrade;
    readonly audit: TrainingProtocolAudit;
    readonly freeSummary: readonly string[];
    readonly proSections: readonly string[];
    readonly llmRewriteAllowed: boolean;
}
```

**Required honesty/blocker pattern** (`src/core/measurement-truth.ts` lines 236-248):
```typescript
for (const reason of input.analysisDecision?.blockerReasons ?? []) {
    blocked.push(`Decision ladder blocker: ${reason}.`);
}

if (evidence.coverage < MIN_ACTIONABLE_EVIDENCE) {
    blocked.push('Cobertura abaixo de 60% nao sustenta uma recomendacao agressiva.');
}

if (evidence.confidence < MIN_ACTIONABLE_EVIDENCE) {
    blocked.push('Confianca abaixo de 60% exige validacao antes de qualquer mudanca.');
}
```

**Free/Pro projection with evidence refs** (`src/lib/training-program-projection.ts` lines 153-179, 208-239):
```typescript
function projectEvidence(cycle: TrainingProgramCycleSnapshot): TrainingProgramProjectedEvidence {
    const refs: TrainingProgramEvidenceReference[] = [];

    if (cycle.evidenceSummary.savedAnalysisId) {
        refs.push({
            kind: 'analysis',
            id: cycle.evidenceSummary.savedAnalysisId,
            href: `/history/${cycle.evidenceSummary.savedAnalysisId}`,
        });
    }

    return {
        summary: cycle.evidenceSummary.summary,
        confidence: cycle.evidenceSummary.confidence,
        coverage: cycle.evidenceSummary.coverage,
        blockers: cycle.evidenceSummary.blockers,
        reasonCodes: cycle.reasonCodes,
        evidenceRefs: refs,
    };
}

export function projectTrainingProgramForAccess(
    input: ProjectTrainingProgramForAccessInput,
): TrainingProgramProjection {
    const canUseGuidedWeekly = hasProductEntitlement(input.access, TRAINING_PROGRAM_WEEKLY_FEATURE);
    const canUseGuidedMonthly = hasProductEntitlement(input.access, TRAINING_PROGRAM_MONTHLY_FEATURE);
    // ...
    return {
        tier: input.access.effectiveTier,
        accessState: input.access.accessState,
        canSeeNextStep: true,
        canSeeFullThirtyDayCycle: canUseGuidedMonthly,
        depth: canUseGuidedMonthly ? 'full_30_day_cycle' : 'basic_next_step',
        freeValueCopy: 'O Free te mostra o proximo passo real, uma missao basica, blockers, evidencia e CTA do Ciclo Pro sem dados falsos.',
        proValueCopy: 'O Pro organiza sua evolucao em um Ciclo Pro de 30 dias completo, adaptativo e auditavel com quatro semanas, checkpoints, reparo, recuperacao e continuidade de linha ativa.',
        locks,
        nextStep: cycle?.nextCta ?? defaultNextStep(),
        basicMission: basicMission ? projectMission(basicMission) : null,
        evidence: cycle ? projectEvidence(cycle) : null,
        fullCycle: canUseGuidedMonthly && cycle ? projectFullCycle(cycle) : null,
    };
}
```

**Apply to Phase 11:** Build a public-safe allowlist from owned source evidence. Redact private account fields, internal notes, whole history, private collection contents, payment state, private readers, hidden history, and sensitive preparation/health notes. Controls may toggle only public-safe sections; required confidence, coverage, blockers, inconclusive/limited support, and no-overclaim copy must always be present in the report projection.

---

### `src/actions/social-pro-reports.ts`, `src/actions/social-pro-reports.test.ts` (service/action/test, request-response + CRUD)

**Analogs:** `src/actions/community-posts.ts`, `src/actions/training-programs.ts`

**Server action imports/auth/rate limit** (`src/actions/community-posts.ts` lines 1-23, 220-241):
```typescript
'use server';

import { and, eq } from 'drizzle-orm';

import { hydrateAnalysisResultFromHistory } from '@/app/history/analysis-result-hydration';
import { auth } from '@/auth';
import { createCommunityPostAnalysisSnapshot } from '@/core/community-post-snapshot';
import { db } from '@/db';
import { checkCommunityActionRateLimit } from '@/lib/rate-limit';

export async function publishAnalysisSessionToCommunity(
    input: PublishAnalysisSessionToCommunityInput,
): Promise<PublishAnalysisSessionToCommunityResult> {
    const session = await auth();
    if (!session?.user?.id) {
        return {
            success: false,
            error: 'Nao autenticado.',
        };
    }

    const rateLimitResult = await checkCommunityActionRateLimit({
        action: 'community.post.publish',
        userId: session.user.id,
    });

    if (!rateLimitResult.success) {
        return {
            success: false,
            error: 'Muitos posts em pouco tempo. Tente novamente.',
        };
    }
```

**Owned source load** (`src/actions/community-posts.ts` lines 243-268):
```typescript
const [storedAnalysisSession] = await db
    .select({
        id: analysisSessions.id,
        weaponId: analysisSessions.weaponId,
        scopeId: analysisSessions.scopeId,
        patchVersion: analysisSessions.patchVersion,
        stance: analysisSessions.stance,
        attachments: analysisSessions.attachments,
        distance: analysisSessions.distance,
        fullResult: analysisSessions.fullResult,
    })
    .from(analysisSessions)
    .where(
        and(
            eq(analysisSessions.id, input.analysisSessionId),
            eq(analysisSessions.userId, session.user.id),
        ),
    )
    .limit(1) as StoredPublishableAnalysisSession[];

if (!storedAnalysisSession) {
    return {
        success: false,
        error: 'Sessao nao encontrada.',
    };
}
```

**Insert current entity plus snapshot** (`src/actions/community-posts.ts` lines 318-372):
```typescript
const analysisSnapshot = createCommunityPostAnalysisSnapshot({
    analysisResult,
    session: toSnapshotSourceSession({
        ...storedAnalysisSession,
        weaponId: publishedWeaponId,
    }),
});
const slug = buildAnalysisSnapshotPostSlug(communityProfile.slug, storedAnalysisSession.id);
const publishedAt = input.status === 'published' ? new Date() : null;

const [createdPost] = await db
    .insert(communityPosts)
    .values({
        authorId: session.user.id,
        communityProfileId: communityProfile.id,
        slug,
        type: 'analysis_snapshot',
        status: input.status,
        visibility: input.visibility ?? 'public',
        title: input.title.trim(),
        excerpt: input.excerpt.trim(),
        bodyMarkdown: input.bodyMarkdown.trim(),
        sourceAnalysisSessionId: storedAnalysisSession.id,
        publishedAt,
    })
    .returning({
        id: communityPosts.id,
        slug: communityPosts.slug,
        status: communityPosts.status,
    });

await db
    .insert(communityPostAnalysisSnapshots)
    .values({
        postId: createdPost!.id,
        analysisSessionId: analysisSnapshot.analysisSessionId,
        analysisResultId: analysisSnapshot.analysisResultId,
        analysisTimestamp: analysisSnapshot.analysisTimestamp,
        analysisResultSchemaVersion: analysisSnapshot.analysisResultSchemaVersion,
    });
```

**Cross-surface revalidation pattern** (`src/actions/training-programs.ts` lines 381-390, 915-924):
```typescript
function revalidateTrainingProgramPaths(baseAnalysisSessionId: string | null): void {
    revalidatePath('/ciclo-pro');
    revalidatePath('/dashboard');
    revalidatePath('/history');
    revalidatePath('/spray-lab');
    revalidatePath('/analyze');

    if (baseAnalysisSessionId) {
        revalidatePath(`/history/${baseAnalysisSessionId}`);
    }
}

await insertCycleGraph(userId, baseSession.id, cycle, protocolRevision?.id);

revalidateTrainingProgramPaths(baseSession.id);

return { success: true, value: cycle };
```

**Tests to copy** (`src/actions/community-posts.test.ts` lines 241-342):
```typescript
it('requires auth before attempting to publish an analysis session', async () => {
    mocks.auth.mockResolvedValue(null);

    const result = await publishAnalysisSessionToCommunity({
        analysisSessionId: 'session-1',
        title: 'Published spray analysis',
        excerpt: 'Snapshot excerpt',
        bodyMarkdown: 'Snapshot body',
        status: 'draft',
    });

    expect(result).toEqual({
        success: false,
        error: 'Nao autenticado.',
    });
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
});

it('persists a draft post and its immutable analysis snapshot for an owned session', async () => {
    const result = await publishAnalysisSessionToCommunity({
        analysisSessionId: 'session-1',
        title: 'Draft spray analysis',
        excerpt: 'Draft excerpt',
        bodyMarkdown: 'Draft body',
        status: 'draft',
    });

    expect(result).toEqual({
        success: true,
        postId: 'post-1',
        slug: 'player-one-session-1',
        status: 'draft',
    });
    expect(mocks.snapshotValues).toHaveBeenCalledWith(expect.objectContaining({
        postId: 'post-1',
        analysisSessionId: 'session-1',
        analysisResultId: 'analysis-1',
        patchVersion: '35.1',
    }));
});
```

**Apply to Phase 11:** `create/updateSocialProReportAction` should authenticate, rate-limit, resolve server product access, require report entitlement, reload owned analysis/protocol/Lab/program/history sources, generate a public-safe snapshot, insert report + snapshot + lifecycle/audit rows, then revalidate `/community`, report route, profile, dashboard/history/Ciclo/Spray Lab/Analyze surfaces as affected. Tests must cover unauthenticated, Free, canceled/past-due-blocked, Pro, ownership, redaction, visibility, link revocation/regeneration/expiration, moderation disabled/hidden, and cancellation behavior where existing reports remain readable.

---

### `src/actions/social-pro-library.ts`, `src/actions/social-pro-library.test.ts`, `src/actions/community-saves.test.ts` (service/action/test, CRUD)

**Analog:** `src/actions/community-saves.ts`, `src/actions/community-saves.test.ts`

**Private save action pattern** (`src/actions/community-saves.ts` lines 27-49, 51-68, 70-111):
```typescript
export async function setCommunityPostSave(
    input: SetCommunityPostSaveInput,
): Promise<SetCommunityPostSaveResult> {
    const session = await auth();

    if (!session?.user?.id) {
        return {
            success: false,
            error: 'Nao autenticado.',
        };
    }

    const rateLimitResult = await checkCommunityActionRateLimit({
        action: 'community.post.save',
        userId: session.user.id,
    });

    if (!rateLimitResult.success) {
        return {
            success: false,
            error: 'Muitos salvamentos em pouco tempo. Tente novamente.',
        };
    }

    const normalizedSlug = input.slug.trim();
    const [storedPost] = await db
        .select({
            authorId: communityPosts.authorId,
            id: communityPosts.id,
            status: communityPosts.status,
            visibility: communityPosts.visibility,
        })
        .from(communityPosts)
        .where(eq(communityPosts.slug, normalizedSlug))
        .limit(1);

    if (input.saved) {
        await db
            .insert(communityPostSaves)
            .values({
                postId: storedPost.id,
                userId: session.user.id,
            })
            .onConflictDoNothing({
                target: [communityPostSaves.postId, communityPostSaves.userId],
            });
    } else {
        await db
            .delete(communityPostSaves)
            .where(
                and(
                    eq(communityPostSaves.postId, storedPost.id),
                    eq(communityPostSaves.userId, session.user.id),
                ),
            );
    }

    return {
        success: true,
        postId: storedPost.id,
        saved: input.saved,
    };
}
```

**Private save test pattern** (`src/actions/community-saves.test.ts` lines 102-148):
```typescript
it('creates a private save idempotently without exposing any public counter', async () => {
    const result = await setCommunityPostSave({
        slug: 'beryl-control-lab',
        saved: true,
    });

    expect(result).toEqual({
        success: true,
        postId: 'post-1',
        saved: true,
    });
    expect(result).not.toHaveProperty('saveCount');
    expect(mocks.saveValues).toHaveBeenCalledWith({
        postId: 'post-1',
        userId: 'user-1',
    });
    expect(mocks.onConflictDoNothing).toHaveBeenCalledWith({
        target: [communityPostSaves.postId, communityPostSaves.userId],
    });
});
```

**Apply to Phase 11:** Keep normal community saves unchanged and free. Add separate Pro library actions/tables for context-aware collections and saved drills/reports/posts/Lab/program/validation references. The Pro library action must resolve product access server-side and write only private user-owned rows. Use idempotent insert/update semantics for automatic collections and manual curation. Tests must assert Free normal saves still pass and Free Pro-library writes fail with useful lock data.

---

### `src/core/social-pro-creator-analytics.ts`, `src/core/social-pro-creator-analytics.test.ts`, `src/lib/product-analytics.ts` (service/test, CRUD + event-driven)

**Analogs:** `src/core/community-creator-metrics.ts`, `src/lib/product-analytics.ts`, tests

**Safe public aggregate query pattern** (`src/core/community-creator-metrics.ts` lines 41-106):
```typescript
function buildPublishedPublicAuthorPostsWhere(authorId: string) {
    return and(
        eq(communityPosts.authorId, authorId),
        eq(communityPosts.status, 'published'),
        eq(communityPosts.visibility, 'public'),
    );
}

export async function getCommunityCreatorMetrics(
    input: GetCommunityCreatorMetricsInput,
): Promise<CommunityCreatorMetrics> {
    const normalizedAuthorId = input.authorId.trim();

    if (!normalizedAuthorId) {
        return createEmptyCommunityCreatorMetrics(normalizedAuthorId);
    }

    // Basic creator analytics intentionally stay on persisted community tables only.
    const [postCountRow] = await db
        .select({
            count: count(),
        })
        .from(communityPosts)
        .where(buildPublishedPublicAuthorPostsWhere(normalizedAuthorId))
        .limit(1);

    const [likeCountRow] = await db
        .select({
            count: count(),
        })
        .from(communityPosts)
        .innerJoin(communityPostLikes, eq(communityPostLikes.postId, communityPosts.id))
        .where(buildPublishedPublicAuthorPostsWhere(normalizedAuthorId))
        .limit(1);

    return {
        authorId: normalizedAuthorId,
        postCount: resolveCountValue(postCountRow),
        likeCount: resolveCountValue(likeCountRow),
        commentCount: resolveCountValue(commentCountRow),
        copyCount: resolveCountValue(copyCountRow),
    };
}
```

**Analytics metadata sanitizer** (`src/lib/product-analytics.ts` lines 14-43, 104-118, 162-174):
```typescript
const SAFE_METADATA_KEYS = new Set([
    'userId',
    'surface',
    'featureKey',
    'accessState',
    'quotaState',
    'priceKey',
    'billingStatus',
    'reasonCode',
    'cohortTag',
    'creatorCode',
    'eventSource',
    'route',
    'ctaId',
    'lockReason',
    'loopStage',
    'guidanceReason',
]);

const PROHIBITED_KEY_PATTERN = /video|frame|trajectory|filename|file_name|analysisPayload|fullResult|full_result|privateNote|note|card|cpf|document|address|bank/i;

export function sanitizeProductAnalyticsMetadata(
    metadata: Record<string, unknown> = {},
): Record<string, string | number | boolean | null> {
    const sanitized: Record<string, string | number | boolean | null> = {};

    for (const [key, value] of Object.entries(metadata)) {
        if (!SAFE_METADATA_KEYS.has(key) || hasProhibitedShape(key, value) || !isScalar(value)) {
            continue;
        }

        sanitized[key] = value;
    }

    return sanitized;
}

export async function recordProductEvent(
    input: ProductAnalyticsEventInput,
    repository?: ProductAnalyticsRepository,
): Promise<void> {
    try {
        const resolvedRepository = repository ?? createDrizzleProductAnalyticsRepository(
            (await import('@/db')).db,
        );

        await resolvedRepository.recordProductEvent(sanitizeProductAnalyticsEvent(input));
    } catch (error) {
        console.error('[product-analytics] event dropped:', error);
    }
}
```

**Analytics/test patterns** (`src/lib/product-analytics.test.ts` lines 33-63; `src/core/community-creator-metrics.test.ts` lines 63-128):
```typescript
it('drops unknown, nested, and prohibited clip/payment fields from metadata', () => {
    expect(sanitizeProductAnalyticsMetadata({
        surface: 'analysis',
        featureKey: 'coach.full_plan',
        videoUrl: 'private-video.mp4',
        frames: [1, 2, 3],
        trajectory: { points: [] },
        filename: 'clip.mp4',
        privateNote: 'sensitive',
        cardNumber: '4242',
        cpf: '123',
        address: 'Rua X',
        quotaUsed: 3,
    })).toEqual({
        surface: 'analysis',
        featureKey: 'coach.full_plan',
        quotaUsed: 3,
    });
});

it('aggregates persisted basic metrics for the author without coupling creator analytics to premium', async () => {
    const result = await getCommunityCreatorMetrics({ authorId: 'author-1' });
    expect(result).toEqual({ authorId: 'author-1', postCount: 2, likeCount: 12, commentCount: 4, copyCount: 9 });
    expect(likesWhereQuery.sql).not.toContain('feature_entitlements');
    expect(likesWhereQuery.sql).not.toContain('user_entitlements');
});
```

**Apply to Phase 11:** Creator analytics should aggregate safe public social impact plus generated report counts and analysis/training click-through counts. Do not expose private reader identities, private link readers, private collection contents, raw private analysis payloads, payment data, funnel/revenue metrics, or financial conversion. Upgrade-intent events should be emitted only for real actions/CTA clicks.

---

### `src/actions/community-reports.ts`, `src/actions/community-admin.ts`, tests, `src/app/community/report-button.tsx` (moderation, request-response + event-driven)

**Analogs:** Existing community reporting/admin moderation

**Report target resolver and action** (`src/actions/community-reports.ts` lines 33-74, 76-133):
```typescript
async function resolveCommunityReportTarget(
    entityType: CommunityReportEntityType,
    entityId: string,
): Promise<boolean> {
    switch (entityType) {
        case 'post': {
            const [storedPost] = await db
                .select({ id: communityPosts.id })
                .from(communityPosts)
                .where(eq(communityPosts.id, entityId))
                .limit(1);

            return Boolean(storedPost);
        }
        case 'comment': {
            const [storedComment] = await db
                .select({ id: communityPostComments.id })
                .from(communityPostComments)
                .where(eq(communityPostComments.id, entityId))
                .limit(1);

            return Boolean(storedComment);
        }
        case 'profile': {
            const [storedProfile] = await db
                .select({ id: communityProfiles.id })
                .from(communityProfiles)
                .where(eq(communityProfiles.id, entityId))
                .limit(1);

            return Boolean(storedProfile);
        }
        default:
            return false;
    }
}

export async function createCommunityReport(
    input: CreateCommunityReportInput,
): Promise<CreateCommunityReportResult> {
    const session = await auth();
    // auth, trim, rate limit, targetExists
    await db.insert(communityReports).values({
        entityType: input.entityType,
        entityId: normalizedEntityId,
        reportedByUserId: session.user.id,
        reasonKey: normalizedReasonKey,
        details: normalizedDetails,
        status: 'open',
    });

    return {
        success: true,
        status: 'open',
    };
}
```

**Admin gate and audit trail** (`src/actions/community-admin.ts` lines 69-82, 154-260):
```typescript
async function getAdminSession(): Promise<CommunityAdminSession> {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== 'admin') {
        return {
            ok: false,
        };
    }

    return {
        ok: true,
        userId: session.user.id,
    };
}

export async function applyCommunityModerationAction(
    input: ApplyCommunityModerationActionInput,
): Promise<ApplyCommunityModerationActionResult> {
    const adminSession = await getAdminSession();
    // validate report/action

    if (input.actionKey === 'hide') {
        await hideReportedEntity(storedReport.entityType, storedReport.entityId);
        await excludeCommunityEntityFromGamification({
            entityType: storedReport.entityType,
            entityId: storedReport.entityId,
        });
    }

    await db.insert(communityModerationActions).values({
        entityType: storedReport.entityType,
        entityId: storedReport.entityId,
        actionKey: input.actionKey,
        actorUserId: adminSession.userId,
        notes: normalizedNotes,
        metadata: {
            reportId: storedReport.id,
            reportReasonKey: storedReport.reasonKey,
            reportStatus,
        },
    });

    await db.insert(auditLogs).values({
        adminId: adminSession.userId,
        action: input.actionKey === 'hide' ? 'COMMUNITY_MODERATION_HIDE' : 'COMMUNITY_MODERATION_DISMISS',
        target: storedReport.entityId,
        details: {
            reportId: storedReport.id,
            entityType: storedReport.entityType,
            actionKey: input.actionKey,
        },
    });

    revalidatePath('/admin/community');
    revalidatePath('/admin/logs');
}
```

**Client report UI pattern** (`src/app/community/report-button.tsx` lines 19-36, 69-95, 146-208):
```typescript
const reportReasonOptions = [
    { value: 'spam', label: 'Spam ou repeticao' },
    { value: 'abuse', label: 'Assedio ou abuso' },
    { value: 'misleading', label: 'Informacao enganosa' },
    { value: 'other', label: 'Outro motivo' },
] as const;

const handleSubmit = () => {
    setStatusMessage(null);
    setErrorMessage(null);

    startTransition(async () => {
        try {
            const result = await createCommunityReport({
                entityType,
                entityId,
                reasonKey,
                details,
            });

            if (!result.success) {
                setErrorMessage(resolveReportErrorMessage(result.error, subjectLabel));
                return;
            }

            setReasonKey(reportReasonOptions[0].value);
            setDetails('');
            setIsOpen(false);
            setStatusMessage('Report enviado. O item foi registrado para revisao.');
        } catch {
            setErrorMessage('Nao foi possivel enviar o report agora.');
        }
    });
};
```

**Tests to copy** (`src/actions/community-admin.test.ts` lines 272-338):
```typescript
it('hides the reported entity, updates the report and writes moderation plus audit trails', async () => {
    const result = await applyCommunityModerationAction({
        reportId: 'report-1',
        actionKey: 'hide',
        notes: 'Ocultado apos revisao manual.',
    });

    expect(result).toEqual({
        success: true,
        reportId: 'report-1',
        reportStatus: 'actioned',
        entityType: 'post',
        entityId: 'post-1',
        actionKey: 'hide',
    });
    expect(mocks.postSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'hidden' }));
    expect(mocks.moderationActionValues).toHaveBeenCalledWith({
        entityType: 'post',
        entityId: 'post-1',
        actionKey: 'hide',
        actorUserId: 'admin-1',
        notes: 'Ocultado apos revisao manual.',
        metadata: { reportId: 'report-1', reportReasonKey: 'spam', reportStatus: 'actioned' },
    });
    expect(mocks.auditLogValues).toHaveBeenCalledWith({
        adminId: 'admin-1',
        action: 'COMMUNITY_MODERATION_HIDE',
        target: 'post-1',
        details: { reportId: 'report-1', entityType: 'post', actionKey: 'hide' },
    });
});
```

**Apply to Phase 11:** Extend report entity support to Social Pro reports/links and add Pro report-specific reasons: `exposicao_indesejada`, `dados_sensiveis`, `claim_enganosa`, `falsa_autoridade`, `abuso_badge_pro`, `uso_indevido_contexto_premium`. Admin actions should hide/disable reports and revoke/disable abusive links without silent deletion. Every action must leave moderation action rows and audit logs.

---

### `src/app/community/page.tsx`, `src/app/community/community-hub.module.css`, report/profile/post UI files (route/component/style, request-response)

**Analogs:** Existing community hub, profile, post detail, and CSS module

**Community route loader** (`src/app/community/page.tsx` lines 1-20, 44, 1102-1128):
```typescript
import type { Metadata } from 'next';
import Link from 'next/link';

import { auth } from '@/auth';
import {
    getCommunityDiscoveryViewModel,
    type CommunityDiscoveryViewModel,
} from '@/core/community-discovery-view-model';
import { Header } from '@/ui/components/header';

import { CommunityFilters } from './community-filters';
import styles from './community-hub.module.css';

export const dynamic = 'force-dynamic';

export default async function CommunityPage({ searchParams }: { searchParams?: Promise<CommunityPageSearchParams> }) {
    const resolvedSearchParams = searchParams ? await searchParams : {};
    const selectedFilters = parseDiscoveryFilters(resolvedSearchParams);
    const session = await auth();
    const viewModel = await getCommunityDiscoveryViewModel({
        filters: selectedFilters,
        viewerUserId: session?.user?.id ?? null,
    });
    const isSparsePublicMode = viewModel.publicDensity.mode === 'sparse';
    const hasNowBand = hasNowMainContent || hasNowAsideContent;
}
```

**Band integration pattern** (`src/app/community/page.tsx` lines 1131-1226):
```tsx
return (
    <>
        <Header />

        <div className="page">
            <main className={`container ${styles.pageStack}`}>
                <SquadBoard viewModel={viewModel} />

                <CommunityFilters clearHref={clearHref} filters={viewModel.filters} />

                {isSparsePublicMode ? (
                    <>
                        <CommunityFeed feed={viewModel.feed} />

                        {hasNowBand ? (
                            <CommunityBand
                                kicker="Agora"
                                section="community-now-band"
                                summary="Seu progresso, a janela ativa e os objetivos que realmente mudam a proxima rodada."
                                title="O que mexe no seu treino agora"
                            >
                                {/* compact content */}
                            </CommunityBand>
                        ) : null}

                        {hasExploreAsideContent ? (
                            <CommunityBand
                                kicker="Explorar"
                                section="community-explore-band"
                                summary="Quando houver mais contexto util, siga jogadores e abra os recortes que ajudam seu proximo treino."
                                title="Onde vale aprofundar depois"
                            >
                                {/* creator highlights, prompt panels */}
                            </CommunityBand>
                        ) : null}
                    </>
                ) : null}
            </main>
        </div>
    </>
);
```

**Post detail route access and public-safe loader** (`src/app/community/[slug]/page.tsx` lines 1-27, 251-358):
```typescript
import React from 'react';
import { and, count, eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { auth } from '@/auth';
import { db } from '@/db';
import { getCommunityPostReadAccess } from '@/lib/community-access';
import { Header } from '@/ui/components/header';

import { PostDetail, type CommunityPostDetailData } from './post-detail';

export const dynamic = 'force-dynamic';

const access = getCommunityPostReadAccess({
    post: {
        authorId: storedPost.authorId,
        status: storedPost.status,
        requiredEntitlementKey: storedPost.requiredEntitlementKey,
    },
    viewer: {
        userId: viewerUserId,
    },
});

if (!access.canRead) {
    return null;
}

return {
    id: storedPost.id,
    slug: storedPost.slug,
    status: storedPost.status,
    title: storedPost.title,
    excerpt: storedPost.excerpt,
    authorProfile: storedPost.authorProfileVisibility === 'public'
        ? {
            displayName: storedPost.authorProfileDisplayName,
            profileSlug: storedPost.authorProfileSlug,
            profileHref: `/community/users/${storedPost.authorProfileSlug}`,
            creatorProgramStatus: storedPost.authorCreatorProgramStatus,
        }
        : null,
    viewerCanReport: Boolean(viewerUserId),
    snapshot: {
        patchVersion: storedPost.snapshotPatchVersion,
        weaponId: storedPost.snapshotWeaponId,
        scopeId: storedPost.snapshotScopeId,
        distance: storedPost.snapshotDistance,
        diagnoses: storedPost.snapshotDiagnoses,
    },
};
```

**Post hero/action/snapshot UI** (`src/app/community/[slug]/post-detail.tsx` lines 218-292, 320-388):
```tsx
const creatorBadge = post.authorProfile
    ? formatCommunityCreatorStatusBadge(post.authorProfile.creatorProgramStatus)
    : null;
const reportDisabledReason = post.viewerCanReport
    ? null
    : 'Entre na sua conta para reportar conteudo da comunidade.';

return (
    <div className={styles.postDetailStack}>
        <section className={`glass-card ${styles.postHeroBoard}`} data-community-section="post-hero">
            <div className={styles.postHeroGrid}>
                <div className={styles.postHeroCopy}>
                    <span className={styles.boardEyebrow}>Post publico</span>
                    <h1 className={styles.profileTitle}>{post.title}</h1>
                    <p className={styles.profileLead}>{post.excerpt}</p>
                    <div className={styles.profileActionDeck}>
                        <CopySensButton slug={post.slug} />
                        <LikeButton initialLikeCount={post.engagement.likeCount} initialLiked={post.engagement.viewerHasLiked} slug={post.slug} />
                        <SaveButton initialSaved={post.engagement.viewerHasSaved} slug={post.slug} />
                        <ReportButton entityId={post.id} entityType="post" subjectLabel="este post" />
                    </div>
                </div>
            </div>
        </section>

        <section className={`glass-card ${styles.postNarrativePanel}`} data-community-section="post-narrative">
            <h2 className={styles.sectionTitle}>Resumo e diagnosticos</h2>
            <article className={styles.postBodyPlate}>
                <span className={styles.sectionKicker}>Resumo rapido</span>
                <p className={styles.postBodyCopy}>{post.bodyMarkdown}</p>
            </article>
            <div className={styles.diagnosisGrid}>
                {post.snapshot.diagnoses.map((diagnosis) => (
                    <DiagnosisCard key={`${diagnosis.type}-${diagnosis.description}`} diagnosis={diagnosis} />
                ))}
            </div>
        </section>
    </div>
);
```

**Profile trust/badge pattern** (`src/app/community/users/[slug]/page.tsx` lines 260-281, 349-374):
```tsx
<div
    aria-label="Sinais publicos explicaveis do perfil"
    className={styles.trustSignalRail}
    data-community-layout="stable-trust-rail"
    data-community-section="profile-trust-rail"
>
    {signals.map((signal) => (
        <article
            key={signal.key}
            aria-label={`${signal.label}: ${signal.reason}`}
            className={styles.trustSignalPlate}
            data-community-signal="community-trust-signal"
        >
            <span className={styles.trustSignalLabel}>{signal.label}</span>
            <p className={styles.trustSignalReason}>{signal.reason}</p>
        </article>
    ))}
</div>

{creatorBadge ? (
    <span className={styles.creatorBadge}>{creatorBadge.label}</span>
) : (
    <span className={styles.authorMeta}>Jogador da comunidade</span>
)}
```

**Badge formatter pattern to adjust for Pro** (`src/core/community-public-formatting.ts` lines 103-125):
```typescript
export function formatCommunityCreatorStatusBadge(
    status: CommunityCreatorProgramStatus,
): CommunityCreatorStatusBadge | null {
    switch (status) {
        case 'approved':
            return {
                label: 'Creator aprovado',
                status,
            };
        case 'waitlist':
            return {
                label: 'Creator em avaliacao',
                status,
            };
        case 'suspended':
            return {
                label: 'Creator suspenso',
                status,
            };
        case 'none':
            return null;
    }
}
```

**CSS layout/responsive pattern** (`src/app/community/community-hub.module.css` lines 160-210, 357-398, 1228-1311, 1354-1476):
```css
.heroPulseGrid,
.bandGrid {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.72fr);
    gap: var(--space-lg);
}

.heroPulseItem,
.bandShell {
    min-width: 0;
    border: 1px solid var(--glass-border);
    border-radius: 8px;
    background: var(--glass-bg);
}

.creatorGrid,
.promptGrid,
.relatedGrid,
.trendGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-md);
}

.postHeroGrid {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(0, 1.12fr) minmax(280px, 0.56fr);
    gap: var(--space-xl);
    align-items: stretch;
}

@media (max-width: 1023px) {
    .bandGrid,
    .postHeroGrid,
    .creatorGrid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 767px) {
    .bandShell,
    .postHeroBoard {
        padding: var(--space-md);
    }

    .profileActionDeck {
        display: grid;
        grid-template-columns: 1fr;
    }
}
```

**Apply to Phase 11:** Add a compact Social Pro cockpit inside `/community` using the existing band/section pattern, not a separate dashboard and not a feed-wide banner. Report pages should copy post detail route patterns but render the polished technical dossier: public summary, audit/evidence timeline, and Pro continuity/actions. Pro badge should be formatted as active access only with tooltip/copy like `Pro: acesso aos recursos premium do Sens PUBG`, never creator authority.

---

### Contextual handoffs: `src/app/analyze/results-dashboard.tsx`, `src/app/dashboard/page.tsx`, `src/app/history/page.tsx`, `src/app/history/[id]/page.tsx`, `src/app/ciclo-pro/page.tsx`, `src/app/spray-lab/page.tsx` (routes/components, request-response + event-driven)

**Analogs:** Existing Ciclo Pro/Spray Lab handoffs and projection routes

**Result handoff pattern** (`src/app/analyze/results-dashboard.tsx` lines 1114-1144):
```typescript
const sprayLabProtocolId = coachPlan?.completeProtocol?.id ?? coachPlan?.actionProtocols[0]?.id ?? null;
const sprayLabValidationHref = activeSession.historySessionId
    ? `/spray-lab?sourceSessionId=${encodeURIComponent(activeSession.historySessionId)}${sprayLabProtocolId ? `&protocolId=${encodeURIComponent(sprayLabProtocolId)}` : ''}`
    : '/analyze';
const reportBlocked = verdictModel.scoreTone === 'error'
    || quotaNotice?.tone === 'error'
    || verdictModel.actionLabel === 'Capturar de novo'
    || verdictModel.actionLabel === 'Incerto'
    || trainingProgramEntry.state === 'ciclo_reparo';
const visibleTruthLabel = `Confianca ${Math.round(trackingOverview.confidence * 100)}%, cobertura ${Math.round(trackingOverview.coverage * 100)}%, bloqueadores ${verdictModel.blockedReasons.length}.`;

const handleTrainingProgramEntry = () => {
    if (!activeSession.historySessionId || trainingProgramEntry.cta.disabled) {
        setProgramActionFeedback('Salve a analise antes de pedir que o servidor crie o ciclo.');
        return;
    }

    startProgramActionTransition(async () => {
        const created = await createTrainingProgramCycleAction({
            baseAnalysisSessionId: activeSession.historySessionId!,
        });
        if (!created.success) {
            setProgramActionFeedback(created.error);
            return;
        }
        window.location.assign(`/ciclo-pro?cycleId=${encodeURIComponent(created.value.id)}`);
    });
};
```

**Server-owned route projection pattern** (`src/app/ciclo-pro/page.tsx` lines 64-96; `src/app/spray-lab/page.tsx` lines 120-164):
```typescript
export default async function CicloProPage({
    searchParams,
}: {
    readonly searchParams?: Promise<CicloProSearchParams>;
}): Promise<React.JSX.Element> {
    const session = await auth();
    const userId = session?.user?.id ?? null;
    const params = await resolveSearchParams(searchParams);
    const access = await resolveServerProductAccess(userId);
    const programState = await resolveProgramCycle({ userId, params });
    const projection = projectTrainingProgramForAccess({
        access,
        cycle: programState.cycle,
    });
    const model = buildCicloProViewModel({
        projection,
        loadError: programState.loadError,
    });

    return (
        <div className={styles.shell}>
            <Header />
            <main className={styles.main}>
                <PageCommandHeader
                    body={model.body}
                    evidenceItems={model.evidenceItems}
                    primaryAction={model.primaryAction}
                    roleLabel={model.roleLabel}
                    title={model.title}
                />
```

**History evidence link pattern** (`src/app/history/[id]/page.tsx` lines 272-312):
```typescript
const refs = [
    ...(cycle.evidenceSummary.savedAnalysisId ? [{
        kind: 'analysis' as const,
        id: cycle.evidenceSummary.savedAnalysisId,
        href: `/history/${cycle.evidenceSummary.savedAnalysisId}`,
    }] : []),
    ...cycle.weeks.flatMap((week) => week.missions.flatMap((mission) => mission.evidenceRefs)),
    ...cycle.checkpoints.flatMap((checkpoint) => [
        ...(checkpoint.evidenceSummary.sprayLabSession ? [{
            kind: 'spray_lab_session' as const,
            id: checkpoint.evidenceSummary.sprayLabSession.id,
            href: `/spray-lab?sessionId=${checkpoint.evidenceSummary.sprayLabSession.id}`,
        }] : []),
        ...(checkpoint.evidenceSummary.validationLink ? [{
            kind: 'validation_link' as const,
            id: checkpoint.evidenceSummary.validationLink.id,
            href: `/analyze?mode=validation&validationLinkId=${checkpoint.evidenceSummary.validationLink.id}`,
        }] : []),
    ]),
];
```

**Apply to Phase 11:** Contextual `generate report`, `save to Pro library`, `continue Ciclo Pro`, `open Spray Lab`, `record validation`, and `resolve blockers` actions should pass source IDs only. Server actions/loaders must reload owned records before writing or rendering. The report generation CTA should be blocked for unsaved/inconclusive/repair states when honesty requires it, while still showing confidence/coverage/blockers.

---

### `scripts/verify-phase11-social-pro.ts`, `src/ci/phase11-social-pro-evidence.test.ts`, `package.json` (script/test/config, file-I/O + batch)

**Analogs:** `scripts/verify-phase10-programs.ts`, `src/ci/phase10-programs-evidence.test.ts`, `package.json`

**Verifier structure** (`scripts/verify-phase10-programs.ts` lines 1-73, 151-221, 227-282):
```typescript
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type Phase10EvidenceStatus = 'PASS' | 'PARTIAL' | 'BLOCKED' | 'PENDING' | 'MISSING';
export type Phase10FinalStatus = 'Delivered' | 'Partially delivered' | 'Blocked';

export const requiredPhase10EvidenceRows: readonly Phase10EvidenceRow[] = [
    { id: 'contracts.program_cycle', label: 'Program cycle contracts' },
    { id: 'projection.free_pro', label: 'Free and Pro projection' },
    { id: 'actions.ownership', label: 'Authenticated action ownership' },
    { id: 'ui.program_route', label: 'Dedicated program route' },
    { id: 'playwright.program_matrix', label: 'Program browser matrix' },
    { id: 'commands.typecheck', label: 'TypeScript gate' },
    { id: 'commands.verify_phase10', label: 'Phase 10 verifier command' },
];

export function verifyPhase10Programs(
    input: VerifyPhase10ProgramsInput = {},
): Phase10ProgramsReport {
    const rootDir = input.rootDir ?? process.cwd();
    const checklistPath = input.checklistPath ?? DEFAULT_CHECKLIST_PATH;
    const requiredRows = input.requiredRows ?? requiredPhase10EvidenceRows;
    const absoluteChecklistPath = path.join(rootDir, checklistPath);
    const checklistExists = existsSync(absoluteChecklistPath);
    const checklistText = checklistExists ? readFileSync(absoluteChecklistPath, 'utf8') : '';
    const parsedRows = parseEvidenceRows(checklistText);
    const declaredFinalStatus = parseDeclaredFinalStatus(checklistText);
    const missingDocuments = checklistExists ? [] : [checklistPath];
    const missingEvidenceRows = requiredRows
        .filter((row) => findEvidenceRow(parsedRows, row.id) === undefined)
        .map((row) => row.id);
    const evidenceFileValid = missingDocuments.length === 0
        && missingEvidenceRows.length === 0
        && missingStatusRows.length === 0
        && rowsMarkedMissing.length === 0;
    const finalStatus: Phase10FinalStatus = !evidenceFileValid || blockedRows.length > 0
        ? 'Blocked'
        : partialRows.length > 0 || pendingRows.length > 0
            ? 'Partially delivered'
            : 'Delivered';

    return {
        finalStatus,
        declaredFinalStatus,
        checkedRows: requiredRows.length,
        evidenceFileValid,
        statusDeclarationValid,
        blockersExplicit,
        missingDocuments,
        missingEvidenceRows,
    };
}

if (isDirectRun()) {
    const report = verifyPhase10Programs();
    console.log(formatPhase10ProgramsReport(report));
    process.exit(report.evidenceFileValid && report.statusDeclarationValid && report.blockersExplicit ? 0 : 1);
}
```

**CI evidence test pattern** (`src/ci/phase10-programs-evidence.test.ts` lines 1-18, 21-45, 47-61, 96-138):
```typescript
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    requiredPhase10EvidenceRows,
    verifyPhase10Programs,
    type Phase10EvidenceRow,
} from '../../scripts/verify-phase10-programs';

function writeChecklist(root: string, rows: readonly Phase10EvidenceRow[], statusById: Readonly<Record<string, string>> = {}) {
    writeFileSync(join(root, checklistPath), [
        '# Phase 10 Checklist',
        '',
        '| Row ID | Evidence | Command/Test | Result | Artifact path | Remaining gap | Status |',
        '|---|---|---|---|---|---|---|',
        ...rows.map((row) => `| \`${row.id}\` | ${row.label} | fixture command | fixture result | fixture artifact | None | ${statusById[row.id] ?? 'PASS'} |`),
    ].join('\n'));
}

it('passes when every required row has evidence and status', () => {
    const root = createWorkspace();
    writeChecklist(root, requiredPhase10EvidenceRows);
    const report = verifyPhase10Programs({ rootDir: root, checklistPath });
    expect(report.evidenceFileValid).toBe(true);
    expect(report.finalStatus).toBe('Delivered');
});

it('keeps the npm script registered', () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
        readonly scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['verify:phase10:programs']).toBe('tsx scripts/verify-phase10-programs.ts');
});
```

**Package script pattern** (`package.json` lines 38-47):
```json
"test:community:unit": "npx vitest run src/ci/community-workflow.test.ts ... src/app/community/[slug]/page.test.tsx",
"test:community:e2e": "npx playwright test e2e/community.publish-entry.spec.ts e2e/community.publish.spec.ts e2e/community.feed.spec.ts e2e/community.comments.spec.ts e2e/community.admin.spec.ts",
"test:community:visual": "npx playwright test e2e/community.visual-check.spec.ts",
"verify:community": "npm run typecheck && npm run test:community:unit && npm run build && npm run test:community:e2e && npm run test:community:visual",
"verify:phase10:programs": "tsx scripts/verify-phase10-programs.ts",
"test:monetization": "npx vitest run src/lib/product-entitlements.test.ts ... src/app/copy-claims.contract.test.ts src/ui/components/header.contract.test.tsx"
```

**Apply to Phase 11:** `verify:phase11:social-pro` should parse a Phase 11 checklist with rows for Free public regressions, Pro-only report/library/link/analytics gates, redaction, honesty fields, public/unlisted visibility, revocation/expiration, cancellation behavior, moderation reasons/audit, upgrade-intent privacy, Playwright desktop/mobile evidence, typecheck, full Vitest, community unit/e2e/visual, monetization, benchmark, build, and verifier self-run.

---

### `e2e/phase11-social-pro.spec.ts` and community visual tests (test, request-response/browser)

**Analogs:** `e2e/phase10.programs.spec.ts`, `e2e/community.visual-check.spec.ts`

**Viewport/auth fixture pattern** (`e2e/phase10.programs.spec.ts` lines 1-40):
```typescript
import { randomUUID } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { eq } from 'drizzle-orm';

loadEnv({ path: '.env.local' });

const VIEWPORTS = {
    mobile: { width: 390, height: 844 },
    desktop: { width: 1440, height: 960 },
} as const;
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://localhost:3000';
const AUTH_SECRET = process.env.AUTH_SECRET;
const SESSION_COOKIE_NAME = 'authjs.session-token';

test.setTimeout(120_000);
```

**State matrix and handoff proof pattern** (`e2e/phase10.programs.spec.ts` lines 762-860):
```typescript
for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`Phase 10 Ciclo Pro browser proof ${label}`, () => {
        test.use({ viewport });

        test('shows no-analysis and Free locked states without fake program depth', async ({ page }) => {
            test.skip(!AUTH_SECRET, 'AUTH_SECRET is required to seed an authenticated Phase 10 fixture.');

            await page.goto('/ciclo-pro');
            await expect(page.getByRole('heading', { name: /Nenhum Ciclo Pro ativo/i })).toBeVisible();
            await expectNoHorizontalOverflow(page);
            await page.screenshot({
                fullPage: true,
                path: `test-results/phase10-no-analysis-${label}.png`,
            });

            const fixture = await seedPhase10ProgramFixture('user');
            try {
                await signInAsSeededUser(page, fixture.user);
                await page.goto(`/ciclo-pro?cycleId=${encodeURIComponent(fixture.activeCycle.id)}`);
                await expect(page.getByRole('heading', { name: /Desbloqueie o Ciclo Pro de 30 dias/i }).first()).toBeVisible();
                await expect(page.getByLabel('Missao Free do Ciclo Pro')).toBeVisible();
                await expectNoHorizontalOverflow(page);
                await page.screenshot({
                    fullPage: true,
                    path: `test-results/phase10-free-locked-${label}.png`,
                });
            } finally {
                await fixture.cleanup();
            }
        });
    });
}
```

**Community visual proof pattern** (`e2e/community.visual-check.spec.ts` lines 497-585):
```typescript
async function captureCommunityScenario(page: Page, fixture: CommunityVisualFixture, mode: CommunityVisualMode, viewport: CommunityViewport, screenshotDir: string) {
    await page.setViewportSize(viewport.size);
    const hubHref = mode === 'sparse' ? fixture.sparseHubHref : '/community';

    await page.goto(hubHref);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-community-section="squad-board"]')).toBeVisible();
    await expect(page.locator('#community-feed')).toBeVisible();
    await expectCommunityFeedOrder(page, mode, `/community ${mode} ${viewport.name}`);
    await expectNoHorizontalOverflow(page, `/community ${mode} ${viewport.name}`);
    await page.screenshot({
        fullPage: true,
        path: path.join(screenshotDir, `community-${mode}-${viewport.name}.png`),
    });

    await page.goto(`/community/users/${fixture.aceAuthor.slug}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1, name: fixture.aceAuthor.displayName })).toBeVisible();
    await expectNoHorizontalOverflow(page, `/community/users/[slug] ${mode} ${viewport.name}`);
    await page.screenshot({
        fullPage: true,
        path: path.join(screenshotDir, `community-profile-${mode}-${viewport.name}.png`),
    });
}
```

**Apply to Phase 11:** Seed Free, Pro, canceled, public report, link-private report, revoked link, expired link, hidden/disabled report, Pro hub, badge tooltip, creator analytics, Pro library, report controls, and contextual handoff states. Run each on desktop and mobile, assert no horizontal overflow, assert required honesty text is visible, assert Free public basics still work, and save screenshots under deterministic `test-results/phase11-*` names.

---

### Copy-safety tests: `src/app/community/social-pro-copy.contract.test.ts`, `src/core/social-pro-report-redaction.test.ts`

**Analogs:** `src/core/copy-safety.test.ts`, `src/app/copy-claims.contract.test.ts`

**Disallowed claim list** (`src/app/copy-claims.contract.test.ts` lines 34-49, 112-138):
```typescript
const COMMERCIAL_DISALLOWED_CLAIMS = [
    'perfect sensitivity',
    'sensibilidade perfeita',
    'guaranteed recoil',
    'recoil garantido',
    'guaranteed improvement',
    'melhora garantida',
    'guaranteed rank',
    'rank garantido',
    'official PUBG',
    'oficial PUBG',
    'KRAFTON partner',
    'parceiro KRAFTON',
    'definitive sensitivity',
    'sensibilidade definitiva',
] as const;

expect(normalized).not.toContain('melhora garantida');
expect(normalized).not.toContain('resultado garantido');
expect(normalized).not.toContain('rank garantido');
expect(normalized).not.toContain('sensibilidade perfeita');
expect(normalized).not.toContain('api pubg exclusiva');
expect(normalized).not.toContain('acesso exclusivo a api pubg');
expect(normalized).not.toContain('pubg oficial');
expect(normalized).not.toContain('krafton oficial');
```

**Phase copy scan pattern** (`src/core/copy-safety.test.ts` lines 140-190):
```typescript
const PHASE_10_PROGRAM_COPY_FILES = [
    'src/app/ciclo-pro/page.tsx',
    'src/app/ciclo-pro/ciclo-pro-view-model.ts',
    'src/lib/training-program-projection.ts',
    'src/actions/training-programs.ts',
    'src/core/training-programs.ts',
    'src/actions/dashboard.ts',
    'src/app/dashboard/page.tsx',
    'src/actions/history.ts',
    'src/app/history/page.tsx',
    'src/app/history/[id]/page.tsx',
    'src/app/analyze/results-dashboard-view-model.ts',
    'src/app/analyze/results-dashboard.tsx',
] as const;

it('blocks guarantees, affiliation claims, course framing, XP language, and TDM-as-proof claims', () => {
    for (const filePath of PHASE_10_PROGRAM_COPY_FILES) {
        const copy = normalize(readCopy(filePath));

        for (const claimPattern of DISALLOWED_PHASE_10_PROGRAM_CLAIMS) {
            expect(copy, `${filePath} should not match ${claimPattern}`).not.toMatch(claimPattern);
        }
    }
});

it('sells original Sens PUBG value through analysis, coach, history, Spray Lab, validation, and adaptive continuity', () => {
    const combinedCopy = normalize(PHASE_10_PROGRAM_COPY_FILES.map(readCopy).join('\n'));

    expect(combinedCopy).toContain('analise');
    expect(combinedCopy).toContain('coach');
    expect(combinedCopy).toContain('historico');
    expect(combinedCopy).toContain('spray lab');
    expect(combinedCopy).toContain('validacao');
    expect(combinedCopy).toContain('continuidade');
    expect(combinedCopy).toContain('adaptativo');
});
```

**Apply to Phase 11:** Scan report, badge, hub, locks, analytics, library, moderation, profile/post/report pages, and contextual handoff files. Block perfect sensitivity, guaranteed improvement/rank, global grade, official PUBG/KRAFTON affiliation, paid-user authority, creator certification by payment, TDM as technical proof, and PUBG API exclusive paid value. Require copy to mention analysis, coach, history, complete protocols, Spray Lab, Ciclo Pro, compatible validation, audit/continuity, or organization value.

## Shared Patterns

### Server-Owned Product Access
**Source:** `src/lib/product-access-server.ts`, `src/lib/product-entitlements.ts`  
**Apply to:** report creation/update, link controls, library writes, analytics reads, badge decisions, advanced context controls

Use `resolveServerProductAccess(userId)` and `hasProductEntitlement(resolution, key)` in server actions/loaders. Never trust UI state, route params, product access copy, or `community-entitlements.ts` future scaffolding as Phase 11 Pro truth.

### Public-Safe Projection And Redaction
**Source:** `src/core/community-post-snapshot.ts`, `src/core/measurement-truth.ts`, `src/lib/training-program-projection.ts`  
**Apply to:** report snapshots, public report route, private-link route, report cards, report controls

Use immutable cloned snapshots and an allowlist projection. Required honesty fields are non-optional: confidence, coverage, blockers, inconclusive/limited support, validation state, and no-overclaim copy when applicable.

### Moderation And Audit
**Source:** `src/actions/community-reports.ts`, `src/actions/community-admin.ts`, `src/core/community-moderation.ts`  
**Apply to:** public reports, link-private report abuse controls, Pro badge abuse, advanced context misuse

Reuse report -> admin action -> moderation action -> audit log. Hide/disable rather than silently delete disputed premium reports. Preserve entity records and lifecycle.

### Privacy-Minimal Analytics
**Source:** `src/lib/product-analytics.ts`, `src/core/community-creator-metrics.ts`  
**Apply to:** upgrade intent, creator analytics, report click/copy/save signals, Pro feature value signals

Metadata must be allowlisted scalar fields only. Do not log private clips, trajectories, full analysis payloads, private links/readers, payment details, private collection contents, or financial/funnel metrics.

### Community UI Integration
**Source:** `src/app/community/page.tsx`, `src/app/community/community-hub.module.css`, `src/app/community/[slug]/post-detail.tsx`  
**Apply to:** Pro hub in `/community`, report cards, report route, profile/post badge integration, library/analytics panels

Use existing `CommunityBand`, `sectionShell`, `data-community-section`, CSS module grids, 8px radii, `minmax(0, 1fr)`, and mobile one-column media queries. Keep public feed basics visually clean and open.

### Verification Gate
**Source:** `scripts/verify-phase10-programs.ts`, `src/ci/phase10-programs-evidence.test.ts`, `e2e/phase10.programs.spec.ts`  
**Apply to:** Phase 11 No False Premium verifier and Playwright evidence

Dedicated verifier parses a checklist and computes final status. CI test proves missing rows fail and package script is registered. Playwright covers desktop/mobile states with screenshots and overflow checks.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/lib/social-pro-link-token.ts` | utility/security | transform | No existing high-entropy opaque share-token helper or hashed token lifecycle exists. `randomUUID()` appears in `src/actions/training-programs.ts` for event IDs, but private report links need a stronger explicit design: unguessable token generation, stored hash or equivalent verifier, revocation/regeneration, optional expiration, and no reader identity logging. |

## Metadata

**Analog search scope:** `src/types`, `src/lib`, `src/core`, `src/actions`, `src/app/community`, `src/app/analyze`, `src/app/dashboard`, `src/app/history`, `src/app/ciclo-pro`, `src/app/spray-lab`, `src/db/schema.ts`, `src/ci`, `scripts`, `e2e`, `package.json`  
**Primary files scanned:** `rg --files` over relevant source/test/script/e2e directories plus targeted reads of analog files  
**Project skill directories:** No project-local `.codex/skills` or `.agents/skills` directories found  
**Pattern extraction date:** 2026-05-09

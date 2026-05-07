---
phase: 7
slug: premium-visual-ui-ux
status: approved
shadcn_initialized: false
preset: none
created: 2026-05-06
reviewed_at: 2026-05-06T23:41:44-03:00
---

# Phase 7 - UI Design Contract

Visual and interaction contract for Premium Visual UI UX. This phase turns the existing solo-player paid loop into a launch-grade Sens PUBG product experience: premium, clear, mobile-first, evidence-forward, and commercially honest.

This is a design contract, not implementation. Planner and executor must use it as the visual source of truth for Phase 7.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | Existing custom Tailwind/CSS module system |
| Preset | not applicable |
| Component library | none; continue local React components, CSS modules, global tokens, and App Router patterns |
| Icon library | local authored SVG system for brand, loop, evidence, and weapons; no third-party registry blocks |
| Font | Inter for UI text, JetBrains Mono for numeric evidence, audit metadata, and compact technical labels |

Sources: `src/app/globals.css`, `tailwind.config.ts`, `src/ui/components/header.tsx`, `src/ui/components/mobile-nav.tsx`, `src/ui/components/weapon-icon.tsx`, `src/app/analyze/analysis.module.css`, `src/app/pricing/page.tsx`, `src/app/billing/page.tsx`, and Phase 7 context.

shadcn gate result: `components.json` is absent. Do not initialize shadcn for Phase 7. Upstream Phase 7 context requires a local design system built from existing tokens and CSS modules, not an unrelated component kit. Registry safety remains enabled.

Research inputs:

| Source | Contract Applied |
|--------|------------------|
| Material icon guidance, `https://m1.material.io/style/icons.html` | Icons need a grid, live area, proportion rules, clarity at small sizes, and consistent execution. |
| NN/g aesthetic-usability effect, `https://www.nngroup.com/articles/aesthetic-usability-effect/` | Premium polish can increase perceived usability, but it cannot replace evidence clarity or task success. |
| NN/g usability heuristics, `https://www.nngroup.com/articles/ten-usability-heuristics/` | Feedback, consistency, user control, error recovery, and match with user language are required. |
| PUBG Developer Portal terms, `https://developer.pubg.com/tos?locale=en` | Do not use official PUBG/KRAFTON marks, extracted game assets, or UI copy implying affiliation or endorsement. |

---

## Spacing Scale

Declared values for all new Phase 7 UI. Use only these values.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, divider offsets, inline evidence glyph gaps |
| sm | 8px | Chip groups, compact metadata rows, toolbar gaps |
| md | 16px | Default component padding, field gaps, stacked controls |
| lg | 24px | Panel padding, section header groups, upload guidance groups |
| xl | 32px | Major screen regions, result/report splits, loop rail gaps |
| 2xl | 48px | Primary touch targets, large CTA rows, empty-state breathing room |
| 3xl | 64px | Page-level section transitions and first-viewport hero spacing |

Exceptions: none. Minimum touch target is 48px, which uses `2xl`. Compact chips may be 32px high, but their padding still uses this scale. Do not introduce 10px, 12px, 20px, 40px, 72px, or ad hoc values.

Layout density rules:
- Cards are for repeated items, tools, lock previews, modals, and framed metrics only.
- Do not place UI cards inside other cards. Nested detail uses rows, dividers, tabs, disclosures, or unframed panels.
- Border radius for new product surfaces is 8px. Brand marks, circular avatars, and pills may use full radius.
- Fixed-format boards, weapon grids, spray charts, loop rails, and metric tiles must define stable dimensions with aspect ratio, grid tracks, min/max constraints, or container-relative sizing.

---

## Typography

Use exactly these four sizes and two weights for new Phase 7 UI.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label | 12px | 700 | 1.4 |
| Body | 16px | 400 | 1.5 |
| Heading | 20px | 700 | 1.25 |
| Display | 28px | 700 | 1.15 |

Typography rules:
- Do not add additional font sizes or weights in new Phase 7 surfaces.
- Do not scale font size with viewport width.
- Letter spacing is `0`. Do not use negative tracking. Uppercase labels must not add tracking.
- Display type is reserved for page H1, primary result verdict, dashboard command center title, pricing offer title, and billing trust title.
- Dense panels, metric tiles, lock previews, sidebars, and mobile drawers use Heading or smaller.
- JetBrains Mono is only for numbers, percentages, benchmark/evidence IDs, quota counts, and audit timestamps.
- Keep pt-BR copy polished, direct, and future-i18n friendly; do not mix English labels like `Billing`, `Pro`, or `Submit` where a user-facing Portuguese label exists.

---

## Color

Use a premium tactical mature palette. Keep the dark PUBG/tactical DNA, but reduce template glass, neon spread, and decorative glow.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#08080c` / `var(--color-bg-primary)` | Page background, app shell base, unframed layout areas |
| Secondary (30%) | `#12121a` and `#16161f` / `var(--color-bg-card)` and `var(--color-bg-elevated)` | Panels, nav, result sections, pricing/billing surfaces, mobile drawer |
| Accent (10%) | `#ff6b00` / `var(--color-accent-primary)` | Primary CTA, active loop step, selected paid plan, current-route marker, high-intent upgrade moment |
| Pro Semantic | `#d7b56d` | Pro entitlement, founder beta, lock preview edge, premium catalog status |
| Evidence Info | `#79f0ff` | Confidence, coverage, compatible validation, focus ring, informational evidence |
| Success | `#00e676` / `var(--color-success)` | Confirmed progress, successful save, active subscription, completed positive outcome |
| Warning | `#ffc107` / `var(--color-warning)` | Weak evidence, inconclusive, quota warning, grace period, unresolved conflict |
| Destructive | `#ff3d3d` / `var(--color-error)` | Failed action errors, suspended access, dangerous local discard states only |

Accent reserved for: `Analisar meu spray`, `Gravar analise util`, `Registrar resultado do bloco`, `Validar clip compativel`, selected paid plan, active loop step, current-route marker, and the strongest post-analysis upgrade moment.

Accent is not for all links, all badges, all hover states, decorative glows, chart lines, or every card border. Cyan and Pro gold are semantic support colors, not second accents.

Color behavior:
- Weak evidence and inconclusive states must stay visible; never downgrade them to muted gray only.
- Free and Pro both look premium. Pro uses depth, continuity, and gold semantic markers, not a prettier basic shell.
- Locked previews may use Pro gold edge or icon, but must include readable explanatory copy and never fake or blur truth evidence.
- Use color plus text/icon state. No meaning may depend on color alone.

---

## Copywriting Contract

All user-facing copy is pt-BR, direct, demanding, premium, and honest. Never promise perfect sensitivity, guaranteed improvement, guaranteed rank gain, final certainty, definitive player skill, or PUBG/KRAFTON affiliation.

| Element | Copy |
|---------|------|
| Primary CTA | Analisar meu spray |
| Analysis save CTA | Gravar analise util |
| Result training CTA | Registrar resultado do bloco |
| Validation CTA | Validar clip compativel |
| Upgrade CTA | Entrar no Pro Founder |
| Pricing secondary CTA | Testar Free com um clip |
| Billing CTA | Abrir Portal Stripe |
| Empty state heading | Nenhuma linha ativa ainda |
| Empty state body | Envie um clip utilizavel para criar seu primeiro verdict, ver confianca e abrir um proximo bloco testavel. |
| Error state | Nao foi possivel concluir esta acao. Revise o clip, recarregue a pagina e tente de novo; se o erro continuar, use o historico ou o suporte de beta. |
| Destructive confirmation | Descartar clip atual: "Descartar este clip e escolher outro arquivo." Cancelamento de assinatura acontece no Portal Stripe com confirmacao da Stripe. |

Required surface labels:

| Surface | Preferred Labels |
|---------|------------------|
| Brand | Sens PUBG |
| Paid route | Planos or Assinatura Pro |
| `/pros` route | Sens dos Pros |
| Home first action | Analisar meu spray |
| Upload dropzone | Escolher clip de spray |
| Upload guidance | Grave 5 a 15 segundos, reticulo visivel, uma arma, um spray continuo. |
| Processing | Lendo frames no navegador |
| Weak evidence | Evidencia fraca |
| Inconclusive | Leitura inconclusiva |
| Pro lock | Pro desbloqueia continuidade |
| Quota warning | Poucas analises uteis restantes |
| Quota exhausted | Limite Free do mes atingido |
| Billing trust | Seu acesso Sens PUBG |

No generic CTA labels: do not use `Submit`, `OK`, `Cancel`, `Save`, `Next`, `Click here`, `Billing`, or `Pro` alone as visible labels. Use a verb plus noun or a route-specific Portuguese label.

No false-perfect copy:
- Do not say `sens perfeita`, `melhore garantido`, `suba de rank`, `100% preciso`, `certeza final`, `IA sabe sua sens`, or equivalent.
- Do say `faixa de teste`, `protocolo`, `evidencia`, `confianca`, `cobertura`, `validacao compativel`, and `bloqueado por evidencias fracas` where relevant.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required |
| third-party registries | none | not applicable - no registry usage |

Registry policy: Phase 7 must not add shadcn registry blocks or third-party UI blocks. If a future plan proposes one, it must run `npx shadcn view {block} --registry {registry_url}` and record `view passed - no flags - YYYY-MM-DD` or `developer-approved after view - YYYY-MM-DD` before use.

---

## Brand And Visual Direction

Approved route: Precision Command Center.

Visual mood:
- Premium tactical mature.
- Dense but calm operational surfaces.
- Authored, precise, and evidence-led instead of generic neon SaaS.
- Dark base with controlled microcontrast, thin dividers, restrained shadows, and semantic accents.

Logo contract:
- Rebrand app chrome and first impression from `AIMANALYZER` to `Sens PUBG`.
- Create an original precision mark combining `S`, sensitivity, recoil trail, crosshair, and evidence concepts.
- Mark must work at 16px favicon scale, 24px nav scale, 48px framed product mark, pricing trust panel, lock preview, and weapon catalog grid.
- Wordmark uses `Sens PUBG`; do not use official PUBG/KRAFTON logos, extracted assets, official typography, or affiliation language.
- Header logo must be readable on mobile without relying on tiny nav text as the only brand signal.

Brand asset states:
- Default dark shell.
- High-contrast one-color variant for favicon/mask.
- Pro gold variant for founder/billing surfaces only.
- Error/disabled variants are not needed; brand does not become warning/error chrome.

---

## Visual Hierarchy And Focal Points

Primary product focal point: the guided solo loop.

The loop is:

`Clip -> Evidencia -> Coach -> Bloco -> Resultado -> Validacao -> Checkpoint`

Each core screen has one dominant next action:

| Surface | Focal Point | Dominant Next Action | Deferred Detail |
|---------|-------------|----------------------|-----------------|
| Home | Sens PUBG loop promise and authored product visual | Analisar meu spray | Full FAQ, community, advanced proof |
| Navigation | Current loop location and paid route visibility | Route-specific next action | Admin/community secondary items |
| Analyze/upload | Clip readiness and usable-capture guidance | Escolher clip de spray | Full technical proof |
| Result | Verdict, evidence strength, next block | Gravar analise util or Registrar resultado do bloco | Full audit and raw metric details |
| Spray visualization | Real path, evidence quality, blockers | Inspect evidence or continue next block | Raw frame/debug detail |
| Dashboard | Current training command center | Fechar protocolo, validar clip, or analisar novo clip | Long history audit |
| History | Evolution/audit timeline | Abrir detalhe or validar proximo clip | Dense raw payload |
| Pricing | Pro loop value and honest founder beta | Entrar no Pro Founder | Legal/support detail |
| Billing | Tier, quota, period, and next access action | Abrir Portal Stripe or Ver Planos | Admin/support audit |
| Locks | What Pro adds at this exact moment | Entrar no Pro Founder | Full comparison table |

Icon-only actions are not allowed for primary or destructive controls. If an icon is used, pair it with visible text and an accessible name.

---

## Component Contract

New or refactored Phase 7 components should be reusable across the solo loop.

| Component Pattern | Required Use |
|-------------------|--------------|
| `AppShell` / header contract | Brand, desktop nav, mobile nav, paid route, user/billing state |
| `SensMark` / `BrandLockup` | Logo mark, wordmark, favicon/mask export basis |
| `LoopRail` | Compact current stage, next action, evidence, protocol state |
| `PageCommandHeader` | One screen role, one next action, one evidence/status row |
| `MetricTile` | Stable numeric evidence, no layout shift |
| `EvidenceChip` | Confidence, coverage, blockers, compatibility, inconclusive |
| `ProLockPreview` | Contextual locked state with honest missing value |
| `WeaponIcon` | 29 authored seed weapon silhouettes and premium fallback for non-seed weapons |
| `UploadDropzone` | Drag/select/validate/process/error/capture guidance states |
| `SprayTrailPanel` | Real trail, ideal/reference state, confidence/coverage legend |
| `PricingDecisionPanel` | Free vs Pro, founder beta, trust, limits, no guarantees |
| `BillingTrustPanel` | Tier, quota, period, state, portal/support next action |
| `EmptyState` / `ErrorState` | Short copy plus recovery path |

Do not create a new visual language for each route. Route CSS modules may own layout, but shared tokens, radii, buttons, chips, loop rail, lock previews, and typography must stay consistent.

---

## Route And Surface Contracts

### Home

- First viewport signal is `Sens PUBG`, the product mark, and the actual solo loop value.
- H1 must be the brand or literal offer/category: `Sens PUBG` or `Analise de spray para PUBG`.
- Supporting copy explains evidence-backed clip analysis and coach workflow.
- Hero should use an authored product visual or real product-state composition, not a gradient-only illustration or generic crosshair decoration.
- Show a hint of the next section on mobile and desktop.
- Free value and Pro continuity must appear without implying the Free report is ugly or useless.
- Do not make a marketing-only landing page. First screen should drive the actual usable loop.

### Navigation

- Desktop priority: `Analisar`, `Dashboard`, `Historico`, `Sens dos Pros`, `Comunidade`, `Planos`.
- Logged-in billing route label: `Assinatura`.
- Mobile nav must include `Planos` or `Assinatura Pro`; hiding the paid route on mobile is a Phase 7 bug.
- `/pros` must never be labeled just `Pro`; use `Sens dos Pros` to separate professional-player references from paid Pro.
- Nav shows current route with one subtle marker, not full orange/cyan treatment on every item.

### Analyze And Upload

- Upload is assisted, not tutorial-heavy.
- Dropzone states: empty, drag hover, file selected, validating, invalid file, poor capture guidance, processing frames, analysis ready, error, quota warning, quota exhausted.
- Metadata selection for weapon, optic, distance, and setup must feel like a guided checklist, not a raw form wall.
- Browser-first analysis must stay visible: `Lendo frames no navegador` and `Seu video nao precisa ir para o servidor para ser analisado`.
- Quality feedback is immediate and concrete: reticulo, duracao, uma arma, spray continuo, estabilidade, visibilidade.
- Mobile upload must use large touch targets, clear file picker fallback, and no horizontal overflow.

### Result Report

- First view answers: `o que aconteceu?`, `quao forte e a evidencia?`, and `qual e o proximo bloco?`
- Free sees verdict, mastery, confidence, coverage, blockers/inconclusive, and short next step.
- Pro sees full protocol, advanced metrics, compatible trend, history continuity, outcome capture, and validation prompt.
- Weak evidence blocks strong visual confidence. No hero score may look triumphant when decision ladder says weak, blocked, or inconclusive.
- The primary CTA changes by state: save, record outcome, validate, resolve quota, or resolve billing.

### Spray Visualization

- The spray path/rastro is a central proof surface, not a canvas dropped into a card.
- It must show actual path, center/anchor, coverage, confidence, frame loss, blockers, and a compact legend.
- Show ideal/reference trail only when the data actually exists. If reference is unavailable, state `Referencia tecnica indisponivel para este contexto` instead of drawing or implying a fake ideal.
- Low-evidence behavior: subdued path, warning label, visible blocker reasons, no triumphant score color.
- Mobile behavior: aspect ratio locked, legend below or tabbed, labels never overlap path or controls.
- Animation is optional and must respect `prefers-reduced-motion`.

### Dashboard

- Dashboard is the command center, not a report dump.
- Top state chooses one action: analyze new clip, close protocol, validate compatible clip, resolve quota, or resolve billing.
- Show active line, current protocol state, evidence strength, and next compatible validation.
- No empty dashboard should look broken. Empty state routes to `Analisar meu spray`.
- Dashboard must preserve truth-aware copy and never summarize commercial accuracy as ready beyond Phase 6 evidence.

### History

- History is the audit and evolution surface.
- List layout must be scannable on mobile: weapon, date, verdict, evidence, active line/checkpoint, outcome status, and one action.
- Detail layout shows full evidence: result snapshot, coach state, outcome revisions, compatible trends, blockers, calibration/readiness caveats, and saved quota/access context.
- Long lists use responsive rows or grouped timeline, never table overflow on mobile.

### Pricing

- Pricing is a purchase-decision page, not a generic table.
- It must show loop value: clip analysis, full coach plan, history trends, outcomes, validation, quotas, and founder beta support.
- It must state Free is useful: truth, confidence, coverage, blockers, short coach summary, and limited saved analyses.
- It must state Pro unlocks continuity: full protocol, advanced metrics, compatible trends, history depth, outcomes, validation, and dashboard active loop.
- Stripe trust and independence from PUBG/KRAFTON must be present without legal wall-of-text.
- Annual or future offers remain inactive unless backend truth supports them.

### Billing

- Billing becomes `Assinatura` / `Seu acesso Sens PUBG`.
- Show tier, quota used/limit, period end, billing status, access state, blockers, portal action, support guidance, and next product action.
- States required: free/no billing, active, trial/founder, grace, canceled, past due, suspended, checkout disabled, portal unavailable.
- Billing copy must say webhook/server truth grants access, not success URL or client state.

### Locks And Free/Pro

- Locks are contextual previews, not fake blurred data.
- Each lock states what is visible now, what Pro adds, and why it matters to the current loop.
- Lock states required: full coach locked, advanced metrics locked, compatible trend locked, history depth locked, outcome/validation locked, quota exhausted, billing blocked.
- No lock may hide confidence, coverage, blockers, inconclusive, or weak-evidence truth.

### Community And Admin Coherence

- Apply shared shell, tokens, typography, spacing, buttons, cards, and focus states enough to avoid product split.
- Do not redesign community feed/profile/social premium, creator analytics, private collections, export/share, or team/coach workflows in Phase 7.
- Admin billing/support can receive trust-panel polish, but full admin redesign is out of scope.

---

## Weapon SVG Contract

Phase 7 must deliver premium authored SVG silhouettes for all 29 current `weaponSeeds`.

Required seed weapons:

| Category | Weapons |
|----------|---------|
| AR | Beryl M762, M416, AUG, ACE32, AKM, SCAR-L, G36C, QBZ, K2, Groza, FAMAS, M16A4, Mk47 Mutant |
| SMG | UMP45, Vector, Micro UZI, MP5K, PP-19 Bizon, Tommy Gun, JS9, P90 |
| DMR | Mini14, Mk12, SKS, SLR, Dragunov, QBU, VSS, Mk14 |

Icon-system rules:
- Use one shared viewBox and grid for all weapon silhouettes.
- Use original authored geometry only. Do not trace official images or extracted PUBG assets.
- Preserve recognizable weapon identity through silhouette: stock, receiver, magazine, barrel, optic/rail, and category-specific proportions.
- Existing seed entries must never fall back to generic AR/SMG/DMR shapes.
- Non-seed, future, removed, or deprecated weapons may use a premium fallback plus status label.
- Status labels: `suporte completo`, `suporte visual`, `suporte tecnico limitado`, `removida`, `deprecated`.
- If the technical engine has only 15 registered weapons, UI must not imply complete technical calibration for all 29. Show support status honestly.
- Weapon icons need accessible labels and stable rendered sizes in grids, cards, nav, dashboard, history, and result reports.

Verification requirements:
- Contract test resolves every seed weapon name/ID to a non-generic silhouette.
- Visual render grid screenshot includes all 29 weapons at mobile and desktop sizes.
- Check labels, sizing, dark-surface contrast, hover/focus, and no overflow.

---

## Interaction Contract

Global:
- Every screen exposes one dominant contextual next action.
- Secondary actions are visible but visually quieter.
- Progressive disclosure is preferred over long static explanations.
- Tooltips may explain compact icons; unfamiliar icon-only actions must still have accessible names.
- All motion respects `prefers-reduced-motion`.

Upload:
- Selecting a file moves focus to validation status.
- Invalid file keeps the file picker action visible.
- Processing state must show current stage without layout jump.
- Analysis errors include next step: retry, choose another clip, correct setup, or open history.

Paid loop:
- Upgrade prompts are strongest after useful analysis or when continuity is blocked.
- Quota prompts are secondary unless quota is exhausted.
- Billing blocked state routes to `Assinatura`, not a generic error.
- Success/cancel checkout pages use product-grade receipts and next actions.

Outcome loop:
- Result, dashboard, and history share the same compact loop rail.
- Pending outcome asks to close the block before stronger coach action.
- Compatible validation action appears after self-report or when trends need proof.
- Conflicting outcome/trend lowers visual confidence and routes to validation.

---

## State Contract

| State | Visual Treatment | Required Copy / Action |
|-------|------------------|------------------------|
| First visit | Brand + loop visual, one CTA | `Analisar meu spray` |
| No profile/setup | Guided setup panel | Explain setup is needed before analysis |
| No clip | Assisted dropzone | `Escolher clip de spray` |
| Invalid clip | Warning panel, not destructive | Explain exact fix and keep picker visible |
| Weak evidence | Warning chip plus subdued metrics | Show blockers and avoid strong recommendation |
| Inconclusive | Neutral/warning verdict | Explain why and ask for better capture |
| Usable Free result | Premium report with limited continuity | Show truth, confidence, short next step |
| Pro result | Full loop rail and protocol depth | `Registrar resultado do bloco` |
| Save blocked by quota | Quota panel | `Ver Planos` or `Assinatura` |
| Pro lock | Contextual preview | `Entrar no Pro Founder` |
| Active subscription | Trust panel | `Abrir Portal Stripe` |
| Grace/past due | Warning trust panel | Resolve payment in Stripe Portal |
| Canceled | Neutral trust panel | Show access period and next action |
| Suspended | Destructive semantic state | Explain support/payment path |
| Empty dashboard | Command empty state | Analyze first clip |
| Empty history | Audit empty state | `Gravar analise util` after the first usable clip |
| Loading | Skeleton or stable receipt row | No layout shift |
| Error | Inline or panel recovery path | Problem plus action |

---

## Accessibility Contract

- Mobile and desktop must pass contrast checks for all semantic states.
- Focus is visible and uses Evidence Info cyan only for focus, not decorative hover.
- Primary controls and mobile nav items are at least 48px high.
- All SVG weapons and brand marks have text alternatives where informative.
- Decorative SVG/canvas/visual effects are `aria-hidden`.
- Spray visualization has textual summary for path quality, confidence, coverage, and blockers.
- Loop rail exposes current step and next action in readable text.
- Forms have labels, validation messages, and adjacent errors.
- Success and error receipts use `aria-live="polite"`.
- Keyboard users can open/close mobile nav, disclosures, tabs, lock previews, and billing actions.
- No text overlaps or overflows in Portuguese labels on mobile.

---

## Analytics Contract

Preserve and extend privacy-safe analytics only. Do not record private clip content, payment data, raw video, or sensitive account data.

Required event preservation:
- Activation after first usable analysis.
- Upgrade intent from limits, locks, pricing, checkout, and Pro feature attempts.
- Quota warnings and quota exhausted.
- Checkout start, success/cancel page views, webhook/billing lifecycle server events.

New Phase 7 events to consider:
- Hero CTA click.
- Upload guidance correction.
- Result lock preview opened.
- Loop rail CTA clicked.
- Pricing plan selected.
- Billing portal opened.
- Mobile paid route clicked.

Each event must use stable enums for surface, intent, tier, and state; no free-form private notes.

---

## Verification Contract

Phase 7 is not complete without No False Perfect evidence. If any material item is missing, final status must be partial or blocked with explicit gaps.

Required automated gates:
- `npm run typecheck`
- `npx vitest run`
- `npm run test:monetization`
- `npm run benchmark:gate`
- Copy claim tests covering no perfect sensitivity, no guaranteed improvement, no rank promises, no PUBG/KRAFTON affiliation.
- Header/mobile nav contract tests for `Planos` / `Assinatura Pro` and `Sens dos Pros`.
- Weapon icon contract tests for all 29 seed entries.
- Result/dashboard/history/pricing/billing contract tests for Free/Pro/lock/billing states.

Required browser/visual gates:
- Playwright desktop and mobile routes: `/`, `/analyze`, `/dashboard`, `/history`, `/history/[id]`, `/pricing`, `/billing`, `/checkout/success`, `/checkout/cancel`.
- Mobile nav screenshot proving paid route visibility.
- Spray visualization screenshot for normal, weak evidence, inconclusive, and reference-unavailable states.
- 29-weapon visual grid screenshot.
- Free, Pro, low quota, exhausted quota, checkout disabled, billing active, grace, canceled, suspended, lock, weak evidence, inconclusive, empty, loading, and error state matrix.
- Accessibility and overflow checks for mobile/desktop.

Required evidence report:
- Screen/state/asset/gate matrix.
- Commands run and result.
- Screenshot paths or report links.
- Remaining gaps.
- Final status: delivered, partial, or blocked.

---

## Pre-Populated Sources

| Source | Decisions Used |
|--------|----------------|
| `07-CONTEXT.md` | Full solo-loop scope, brand route, Free/Pro split, visual direction, 29 weapon SVG requirement, mobile nav paid-route fix, no false perfect gate |
| `.planning/PROJECT.md` | Browser-first product value, paid value, no perfect/guaranteed claims |
| `.planning/REQUIREMENTS.md` | ANALYT-01, ANALYT-02, MON-01, MON-02, MON-04 constraints |
| `.planning/ROADMAP.md` | Phase 7 goal and success criteria |
| `.planning/STATE.md` | Phase 6 partial commercial-claim boundary |
| `.planning/codebase/*` | Stack, CSS module/Tailwind pattern, testing expectations, production concerns |
| `src/app/globals.css` | Existing tokens, fonts, dark palette, spacing, button/badge patterns |
| `src/ui/components/*` | Header/mobile nav/weapon icon gaps and reuse points |
| `src/db/weapon-profile-seed.ts` | Canonical 29 visual weapon entries |
| `src/game/pubg/weapon-data.ts` | Current 15-weapon technical registry caveat |
| External references | Icon grid, usability, aesthetic clarity, and PUBG asset/affiliation safety |

User questions asked: none. Phase 7 context already answered visual direction, scope, Free/Pro posture, brand, mobile, weapon, copy, and verification decisions. Defaults applied only where the workflow template requires exact token values.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-05-06T23:41:44-03:00

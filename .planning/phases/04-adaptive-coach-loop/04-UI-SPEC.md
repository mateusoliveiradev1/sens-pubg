---
phase: 4
slug: adaptive-coach-loop
status: approved
shadcn_initialized: false
preset: none
created: 2026-05-05
reviewed_at: 2026-05-05T19:08:33-03:00
---

# Phase 4 - UI Design Contract

Visual and interaction contract for the Adaptive Coach Loop. This phase makes Coach Extremo feel like a disciplined training loop: evidence, one primary focus, a short next block, fast outcome capture, compatible validation, and full audit history.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | Existing custom Tailwind/CSS module system |
| Preset | not applicable |
| Component library | none; reuse local `glass-card`, `.btn`, badges, CSS modules, and server/client App Router patterns |
| Icon library | none installed; use existing local SVG/WeaponIcon patterns or compact text glyphs with accessible labels |
| Font | Inter for UI text, JetBrains Mono for small evidence labels and numeric audit values |

Sources: `src/app/globals.css`, `tailwind.config.ts`, `src/app/analyze/analysis.module.css`, `src/app/dashboard/page.tsx`, `src/app/history/[id]/sensitivity-acceptance-panel.tsx`.

shadcn gate result: user selected "Keep Existing" on 2026-05-05. Do not initialize shadcn or add third-party registries for this phase.

---

## Spacing Scale

Declared values for new Phase 4 UI. Use only these values.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, badge inner gaps, tight metadata rows |
| sm | 8px | Compact control gaps, chip groups, list item gaps |
| md | 16px | Default field, card, and inline panel spacing |
| lg | 24px | Coach loop panel padding and section gaps |
| xl | 32px | Major surface gaps inside analysis/dashboard/history |
| 2xl | 48px | Empty states and major audit section breaks |
| 3xl | 64px | Page-level breathing room only |

Exceptions: none. Minimum button and segmented-control touch target is 48px, which uses the standard `2xl` value. Compact inline chips may use 32px minimum height, but their padding still uses the declared scale.

---

## Typography

Use exactly these four sizes and two weights for new Phase 4 coach-loop surfaces.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label | 12px | 700 | 1.4 |
| Body | 14px | 400 | 1.6 |
| Heading | 20px | 700 | 1.25 |
| Display | 28px | 700 | 1.15 |

Typography rules:
- New Phase 4 panels must not introduce additional font sizes or custom weights.
- Label text may use JetBrains Mono and uppercase only for evidence categories, status chips, and audit metadata.
- Do not use negative letter spacing in new Phase 4 compact panels.
- Display size is reserved for the primary dashboard active-loop title or history audit title, not every card.

---

## Color

Follow the existing dark tactical palette, with color hierarchy locked for this phase.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#08080c` / `var(--color-bg-primary)` | Page background and unframed layout areas |
| Secondary (30%) | `#12121a` / `var(--color-bg-card)` with black alpha surfaces | Coach panels, history audit sections, dashboard loop containers |
| Accent (10%) | `#ff6b00` / `var(--color-accent-primary)` | Primary CTA, selected outcome option, active protocol marker, current focus edge line |
| Support Info | `#00f0ff` / `var(--color-accent-cyan)` | Focus rings, informational badges, compatible-validation hints, non-primary evidence links |
| Success | `#00e676` / `var(--color-success)` | Confirmed compatible progress and completed positive outcome |
| Warning | `#ffc107` / `var(--color-warning)` | Pending validation, neutral completion, weak evidence, unresolved conflict |
| Destructive | `#ff3d3d` / `var(--color-error)` | Worse outcome, invalid capture friction, failed action errors only |

Accent reserved for: `Registrar resultado do bloco`, selected outcome segment, active primary focus stripe, active protocol step number, and the main dashboard active-loop CTA. Do not use orange for every link, all buttons, all badges, or decorative backgrounds.

Cyan is a semantic support color, not a second accent. It is reserved for keyboard focus, compatible-validation guidance, and informational evidence badges.

---

## Copywriting Contract

All copy is pt-BR, direct, demanding, premium, and honest. Never promise perfect sensitivity, guaranteed improvement, rank gain, or final certainty.

| Element | Copy |
|---------|------|
| Primary CTA | Registrar resultado do bloco |
| Secondary CTA | Gravar validacao compativel |
| Dashboard CTA | Fechar protocolo pendente |
| History CTA | Ver auditoria do coach |
| Empty state heading | Nenhum protocolo em aberto |
| Empty state body | Rode uma analise utilizavel para o coach criar um foco principal, um bloco curto e uma validacao comparavel. |
| Error state | Nao foi possivel registrar o resultado. Recarregue a sessao e tente de novo; se o clip nao pertence a sua conta, abra o historico correto. |
| Destructive confirmation | Nao ha exclusao destrutiva na Phase 4. Correcoes de resultado sao revisoes auditaveis e usam: "Corrigir resultado e manter revisao auditavel". |

Outcome option labels:
- Comecei o bloco
- Completei sem medir
- Melhorou no treino
- Ficou igual
- Piorou no treino
- Captura invalida

Reason-code labels:
- Qualidade da captura
- Contexto incompativel
- Execucao ruim
- Variavel alterada
- Protocolo confuso
- Dor/fadiga
- Outro motivo

Conflict copy:
- User outcome improved, compatible clip worsened: "Resultado em conflito. O relato foi positivo, mas a validacao compativel piorou; faca uma validacao curta antes de avancar."
- User outcome worse, capture invalid: "Nao conte isso contra o protocolo ainda. A captura ou execucao invalidou a leitura; repita com contexto controlado."
- Repeated completed without result: "Voce completou o bloco, mas ainda falta dizer o efeito. Feche o resultado antes do coach ficar mais agressivo."

---

## Visual Hierarchy And Focal Points

Primary screen focal point: the active coach loop panel, not the full diagnostic detail. The eye should land on:

1. Coach verdict or active loop status.
2. Primary focus title.
3. Next-block protocol title and duration.
4. `Registrar resultado do bloco` or `Gravar validacao compativel`.
5. Evidence/confidence badges.

Surface hierarchy:

| Surface | Focal Point | Secondary Detail | Hidden/Deferred Detail |
|---------|-------------|------------------|------------------------|
| Post-analysis | Primary focus + next block | Tier reason, confidence, coverage, validation CTA | Outcome revisions, full memory audit |
| Dashboard | Active loop status + pending closure CTA | Short memory summary, next validation, conflict warning | Full session snapshots |
| History list | Outcome/audit badge per session | Compatible line and latest protocol state | Revision details |
| History detail | Coach snapshot timeline | Outcome revisions, conflict, compatible clips, precision checkpoints | Nothing; this is the full audit surface |

Icon-only actions are not allowed for Phase 4 outcome controls. If an icon or glyph is used, include visible text and an accessible name.

---

## Interaction Contract

Post-analysis:
- Show only the essential loop after usable analysis: coach verdict, one primary focus, up to two secondary focuses, one next-block protocol, evidence badges, and one outcome/validation CTA.
- If there is no saved session ID yet, show `Gravar analise para registrar resultado` and explain that outcome memory starts after saving.
- Do not render revision timelines or long reason forms on the immediate result surface.

Outcome capture:
- Use a segmented control or button group for the six outcome statuses.
- Status selection reveals a short reason-code checklist only when needed.
- `invalid_capture` requires one reason code before enabling `Registrar resultado do bloco`.
- Notes are optional, plain text, max one compact textarea row group, and never required for success.
- After recording, replace the form with a compact status receipt and show `Gravar validacao compativel`.

Dashboard active loop:
- If a protocol is pending, the top dashboard next action becomes `Fechar protocolo pendente`.
- If an outcome is `started`, show in-progress state, expiry hint, and a non-blocking closure CTA.
- If outcome and compatible trend conflict, show a warning band and route the CTA to validation, not stronger coach action.
- If no protocol exists, keep the current dashboard next-action model and do not invent coach memory.

History audit:
- History list shows compact status chips and latest outcome state.
- History detail shows coach snapshot, outcome records, revisions, conflicts, compatible clips, precision checkpoints, and memory explanations.
- Corrections create a new revision row visually linked to the prior result; do not visually erase the original outcome.

---

## Component Contract

Reuse existing patterns:

| Component Pattern | Required Use |
|-------------------|--------------|
| `glass-card` | Top-level coach loop, dashboard active loop, and history audit panels |
| `.btn.btn-primary` | Exactly one primary CTA per coach-loop panel |
| `.btn.btn-secondary` | Secondary validation/history navigation |
| `.btn.btn-ghost` | Low-emphasis navigation only |
| `badge badge-info/success/warning` | Evidence tier, confidence, coverage, pending, confirmed, conflict |
| CSS module classes | Analysis-specific coach loop panels and history-specific audit timeline |
| `WeaponIcon` | Weapon/loadout context when a weapon identity is visible |

Do not put cards inside cards. Nested details must be unframed rows, dividers, timelines, or compact panels with 8px radius.

Border radius for new Phase 4 framed items: 8px. This matches existing result/coach panels and keeps the coach workflow operational rather than decorative.

---

## State Contract

| State | Visual Treatment | Required Copy / Action |
|-------|------------------|------------------------|
| No usable analysis | Muted empty state, no orange CTA unless upload path is available | "Rode uma analise utilizavel..." |
| Usable coach plan, no saved session | Coach summary visible, outcome CTA disabled or replaced | "Gravar analise para registrar resultado" |
| Pending outcome | Warning badge, orange primary CTA | `Registrar resultado do bloco` |
| Started | Info badge, progress receipt, closure CTA | `Fechar protocolo pendente` |
| Completed without result | Warning badge, neutral receipt | Ask whether it improved, stayed equal, worsened, or became invalid |
| Improved self-report | Success badge plus validation warning | `Gravar validacao compativel` |
| Confirmed compatible progress | Success badge, consolidated CTA | Consolidate before changing variable |
| Worse | Destructive semantic text, not full destructive layout | Lower aggressiveness, ask for reason/validation |
| Invalid capture | Warning/destructive hybrid, reason required | Repeat compatible capture |
| Conflict | Warning band above CTA | Route to short validation; block strong action |
| Action error | Destructive text under control | Problem plus retry/path correction |

Loading states:
- Outcome write button label: `Registrando resultado...`
- Validation navigation remains available unless write is pending.
- Do not shift layout height when the action changes to loading.

---

## Accessibility Contract

- Every segmented outcome control must be reachable by keyboard and expose selected state.
- Use visible labels for all outcome buttons; do not rely on color alone.
- Use `aria-live="polite"` for success/error receipts after outcome write.
- Focus returns to the status receipt after successful write.
- Error text sits adjacent to the failed control and includes a recovery path.
- Keep touch targets at 48px minimum height for primary controls.
- Maintain text contrast against dark surfaces using existing text variables.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required |
| third-party registries | none | not applicable - no registry usage |

Registry policy: Phase 4 must not add registry blocks. If a future plan introduces one, it must run `npx shadcn view` and record `view passed - no flags - YYYY-MM-DD` or `developer-approved after view - YYYY-MM-DD` before use.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-05-05

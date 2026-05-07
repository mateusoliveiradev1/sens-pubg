# Phase 8: Complete Training Protocols - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-07T16:03:23.2642712-03:00
**Phase:** 8-Complete Training Protocols
**Areas discussed:** Complete protocol contract, PUBG-specific drills, Evidence downgrade behavior, Physical preparation and ergonomics, Validation and outcome loop, Final polish and verification

---

## Complete Protocol Contract

| Decision Point | Selected | Alternatives Considered |
|---|---|---|
| Protocol shape | New rich complete-protocol entity | Expand current nextBlock; progressive hybrid |
| Contract structure | Dual contract: technical engine contract plus premium UI view model | Complete auditable contract only; narrative premium contract |
| Default Pro detail | Polished summary with expandable audit | Everything visible; essentials only |
| Free/Pro split | Free valuable summary, Pro complete ficha | Free almost equal; Free teaser only |
| Field strictness | Rigid required fields with honest fallback | Flexible fields; best-effort premium |
| Missing context | Block only dependent decisions and guide correction | Conservative defaults; require all fields |
| Versioning | Snapshot plus explicit revision | Snapshot only; recalculate on open |
| Drill identity | Stable `drillId` plus dynamic composition | Fully dynamic; fixed library |
| Multiple focuses | One executable primary protocol; secondary notes only | Subdrills for up to three focuses; short sequence |
| Time/volume | Dose by tier and drill type | Always short; always long |
| Revision UI | Before/after comparison | Hidden history; always-open timeline |
| UI rubric | Mandatory premium ficha rubric | Layout varies per drill; ultra detailed always open |
| Free/Pro tests | Strong testable Free/Pro contract | Visual review only; UI-only gating |

**User's choice:** The user consistently selected the recommended precision/polish options and emphasized maximum polish, perfect UI, and strong tests.
**Notes:** The user wants Free to show real value, not a weak demo, while Pro unlocks the complete premium training ficha.

---

## PUBG-Specific Drills

| Decision Point | Selected | Alternatives Considered |
|---|---|---|
| Default training environment | Official Training Mode | Training Mode plus casual match; user-chosen context |
| UGC role | Optional advanced presets/maps with status | Hide until Phase 9; promote as ideal |
| Spray Lab boundary | Prepare contract for Phase 9, do not build runner | Build lab early; ignore lab |
| Drill organization | Dominant error plus PUBG context | Weapon-first; player-level-first |
| Library shape | Layered premium library with drill masters and context adapters | Huge library; only current drills |
| Variation behavior | Evidence-gated weapon/optic/distance personalization | Full 29-weapon variants; generic variants |
| Drill ficha | Precise ficha per `drillId` | Flexible ranges; simple quick instruction |
| Real match transfer | Dual validation: controlled clip plus match/TDM transfer | Match replaces clip; match is note only |
| Match checklist | Short focus-specific checklist | Free note; detailed match form |
| Difficulty | Evidence-derived, enjoyable progression | User chooses; always linear progression |
| User drill names | Premium pt-BR name plus invisible stable ID | Technical names; gamified names |
| Hard weapons | Adjust dose/criteria by weapon difficulty | Same target; separate protocols |
| Attachments | One-variable-at-a-time experiments | Full ideal loadout; no attachments |
| Optic/scope | Use clip optic and validate compatible | Always red dot first; mandatory scope progression |
| Distance | Clip distance or honest estimated range | Fixed distances; always start close |

**User's choice:** The user accepted Training Mode as default but asked whether UGC can be used. After official-reference discussion, UGC was locked as optional specific training presets/maps with status.
**Notes:** The user expects Spray Lab soon in Phase 9 and wants UGC/map-specific training to be future-ready without weakening Phase 8.

---

## Evidence Downgrade Behavior

| Decision Point | Selected | Alternatives Considered |
|---|---|---|
| Protocol strength rule | Analysis decision ladder matrix | Always give full training; only strong_analysis gets protocol |
| Weak evidence UX | Polished conservative protocol | Simple blocked state; generic protocol |
| Strong protocol blockers | Rigid blockers | Light blockers; confidence/coverage only |
| Self-report vs clip | Compatible clip wins technically | User report wins; neutral tie |
| Fatigue/pain/confusion | Downgrade to safety/learning | Count as protocol failure; ignore technically |
| Downgrade reason display | Stable reason codes plus human copy | Only human text; only codes |
| Missing metadata | Dependency blocking | Total block; estimate |
| Limited weapon support | Limit fine personalization | Block uncalibrated weapons; treat all equally |
| Variable change | Record learning, invalidate strong validation | Accept if user says it helped; block outcome |
| Downgrade CTA | Specific repair CTA | Always new clip; always Pro CTA |
| Downgrade feel | Unlock path, not punishment | Technical warning; hidden downgrade |
| Downgrade tests | Golden downgrade matrix | Simple unit tests; existing benchmark only |

**User's choice:** The user selected strict evidence behavior and repeatedly requested polished, non-punitive downgrade copy.
**Notes:** Downgrade must preserve value and guide the player to unlock stronger protocol levels.

---

## Physical Preparation And Ergonomics

| Decision Point | Selected | Alternatives Considered |
|---|---|---|
| Inclusion | Safe general preparation as protocol value | Separate from protocol; detailed physical plan |
| UI placement | `Preparar antes do spray` premium section | Side checklist; footer warning |
| Musculacao/full physical plan | Safe prep now, full module deferred | Full physical plan in Phase 8; remove physical prep |
| Pain/fatigue behavior | Stop and downgrade | Warning only; continue lower volume |
| Grip/mousepad/posture | Observable checklist only | Diagnose from video; fixed generic recommendation |
| Memory | Light reason codes | No persistence; detailed physical profile |
| Safety copy | Short, firm, integrated | Full disclaimer; tooltip only |
| Pauses/rest | Prescribed by dose/tier/drill type | Generic fixed pause; user decides |
| Validation relation | Dynamic experimental control | Only comfort; optional |
| UI display | Contextual checklist by focus | Premium prose; universal checklist |
| Privacy | Minimum necessary reason codes and optional notes | Save everything; save nothing |
| Premium feel | Adaptive by protocol | Universal checklist; safety copy only |
| Safety tests | Copy safety tests plus UI snapshots/contracts | Manual review; global disclaimer |

**User's choice:** The user wanted this to be real product value and asked if a full physical/musculacao module could be included now. We deferred the full module for safety/scope and locked safe Pro preparation inside Phase 8.
**Notes:** Safety copy must be integrated and premium, not legalistic. Pain, numbness, tingling, or persistent discomfort must stop and downgrade the block.

---

## Validation And Outcome Loop

| Decision Point | Selected | Alternatives Considered |
|---|---|---|
| Outcome shape | Structured outcomes plus short note | Improved/same/worse only; free form |
| Sequence | Close outcome -> compatible clip -> real match/TDM | Match first; only new clip |
| Compatible validation | Strict compatibility | Moderate compatibility; any new clip |
| Evidence weighting | Outcome, clip, match hierarchy | Simple average; real match weighs most |
| Validation UI | `grave o proximo clip assim` checklist | Simple CTA; long tutorial |
| Real-match record | Short transfer card | Detailed match form; free note only |
| Validated progress | Minimum convergence | Clip improved; user marked improved |
| Outcome UI | Small card loop | One large form; detailed timeline |
| E2E verification | Complete protocol-to-progress flow | Motor tests only; visual only |

**User's choice:** The user wanted real-match validation to matter. We locked dual validation: controlled compatible clip for technical evidence and real match/TDM for practical transfer.
**Notes:** Missing evidence should create promising/needs-validation states, not default failure language.

---

## Final Polish And Verification

| Decision Point | Selected | Alternatives Considered |
|---|---|---|
| No False Done | Mandatory final evidence matrix | Simple checklist; final summary only |
| Drill coverage | Coverage matrix plus goldens | Broad manual review; existing tests only |
| Free/Pro assurance | Strong contract tests | Visual QA only; UI-only branches |
| Downgrade assurance | Golden downgrade matrix | Simple unit tests; current benchmark only |
| Outcome/progress assurance | Full E2E/contract flow | Unit tests only; Playwright visual only |
| Safety assurance | Copy safety tests plus UI snapshots | Manual review only; global disclaimer |

**User's choice:** The user selected evidence matrix and strong tests throughout.
**Notes:** Phase 8 cannot be called delivered without objective evidence across protocol contract, drills, Free/Pro, downgrade, preparation, outcome, dual validation, LLM guardrails, benchmark/goldens, UI, copy safety, and gates.

---

## the agent's Discretion

- Exact TypeScript type names, database table names, UI component names, CSS module boundaries, drill ID naming convention, copy wording, threshold constants, fixture layout, and plan wave count.
- The agent may choose exact implementation shape as long as it preserves the locked product/truth decisions.

## Deferred Ideas

- Full Pro physical preparation / ergonomics / strength module with specialist review, likely connected to guided programs.
- Phase 9 Spray Lab session runner, guided drills, lab benchmarks, and deep UGC/Spray Lab implementation.
- Phase 10 weekly/monthly guided training programs.
- Team/coach expansion and report export/share flows.

## 1. Progression Schema and Core Rules

- [x] 1.1 Add schema/types for seasons, progression events, user progression aggregates, missions, squads, squad membership, and reward records in `src/db/schema.ts` and related type modules.
- [x] 1.2 Add unit tests for progression event eligibility, idempotency, cooldown windows, and exclusion of hidden or moderated content.
- [x] 1.3 Implement a central progression rule catalog and event recorder that can award or ignore XP from configured community actions.
- [x] 1.4 Implement aggregate helpers for level, XP state, mission progress, and private progression summaries from the event ledger.

## 2. Rituals, Seasons, and Recaps

- [x] 2.1 Add unit tests for weekly challenge selection using trend data with neutral fallback behavior.
- [x] 2.2 Implement active season and weekly challenge resolution with title, time window, theme, and eligible action metadata.
- [x] 2.3 Implement streak calculation and healthy re-entry logic based on meaningful participation windows instead of raw volume.
- [x] 2.4 Implement personal and squad recap builders that summarize completed rituals, unlocked rewards, and next suggested actions.

## 3. Squads and Public Rewards

- [x] 3.1 Add tests for squad creation, invite acceptance, membership limits, invalid invite handling, and shared-goal zero states.
- [x] 3.2 Implement squad actions and persistence for create, join, leave, membership visibility, and active shared-goal state.
- [x] 3.3 Implement squad goal aggregation from eligible member actions and ensure moderated or capped activity does not advance goals incorrectly.
- [x] 3.4 Implement public-safe reward records, optional display/equip behavior, and factual labels for badges, titles, and season marks.

## 4. Community Action Integration and Guardrails

- [x] 4.1 Hook publish, follow, save, copy, contextual comment, and public profile completion flows into the progression event recorder where eligible.
- [x] 4.2 Add anti-farming helpers and tests for reciprocal actions, repeated low-value engagement, and per-period progression caps.
- [x] 4.3 Ensure hidden, deleted, archived, or moderation-actioned content is excluded from future progression, challenge, squad, and reward calculations.
- [x] 4.4 Enforce privacy boundaries so private mission internals and unfinished progression data never leak into public community view models.

## 5. Community Hub and Profile Surfaces

- [x] 5.1 Add contract tests for `/community` covering viewer-aware progression summary, weekly challenge board, season context, recap modules, and anonymous fallbacks.
- [x] 5.2 Update `src/core/community-discovery-view-model.ts` and `/community` UI to render mission board, progression summary, seasonal context, recap content, and squad spotlight without replacing the public feed.
- [x] 5.3 Add contract tests for `/community/users/[slug]` covering public-safe reward strip, streak summary, squad identity, and hidden-private progression internals.
- [x] 5.4 Update the public profile view model and profile UI to render factual public rewards, squad identity, and neutral zero states when no public-safe reward data exists.
- [x] 5.5 Verify the new surfaces stay aligned with the existing PUBG Aim Analyzer visual language on desktop and mobile layouts.

## 6. Verification

- [x] 6.1 Run `npm run test:community:unit`.
- [x] 6.2 Run `npm run typecheck`.
- [x] 6.3 Run `npm run build`.
- [x] 6.4 Run `npm run test:community:e2e`.
- [x] 6.5 Verify `/community` and `/community/users/[slug]` with Playwright at desktop and mobile widths, checking progression privacy, challenge rendering, squad/reward fallbacks, and absence of console errors.

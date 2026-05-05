---
title: Architecture
mapped_at: 2026-05-05
last_mapped_commit: 2e43aa873e6577285138ef3726bbe888cf75f029
---

# Architecture

## High-Level Pattern

The app is a Next.js App Router product with a browser-first analysis engine and server-side persistence/community features.

Main architectural layers:

- `src/app`: routes, layouts, pages, route handlers, page-local components.
- `src/actions`: server actions for authenticated writes and reads.
- `src/core`: deterministic product/domain algorithms.
- `src/game/pubg`: PUBG catalogs and game math.
- `src/db`: Drizzle schema, client, seed, audit log.
- `src/lib`: shared app policies such as rate limiting, access, entitlements, and safe actions.
- `src/types`: cross-layer type contracts.
- `src/workers`: Web Worker wrapper and session state for aim tracking.
- `src/ui`: reusable UI shell and shared components.

## Request And Render Flow

Most pages are React Server Components by default. Client components are used for interactive workflows such as analysis, charts, publish buttons, comments, likes, saves, follows, and settings forms.

Examples:

- `src/app/page.tsx` is a dynamic server landing page that reads database stats.
- `src/app/analyze/page.tsx` is server-rendered and passes profile/weapon data into `AnalysisClient`.
- `src/app/analyze/analysis-client.tsx` is a client component orchestrating upload, extraction, worker tracking, diagnostics, and save.
- `src/app/community/page.tsx` is a server-rendered discovery hub.
- `src/app/admin/layout.tsx` protects admin UI server-side.

## Analysis Pipeline

The analysis pipeline is primarily local/browser-side:

1. `src/app/analyze/page.tsx` loads profile and DB weapon profiles.
2. `src/app/analyze/analysis-client.tsx` validates video and settings.
3. `src/core/video-ingestion.ts` and `src/core/frame-extraction.ts` prepare frames.
4. `src/workers/aimAnalyzer.worker.ts` sends frame work to `src/workers/aim-analyzer-session.ts`.
5. `src/core/crosshair-tracking.ts`, `global-motion-compensation.ts`, and `optic-state-detection.ts` provide tracking evidence.
6. `src/core/spray-metrics.ts`, `diagnostic-engine.ts`, `sensitivity-engine.ts`, and `coach-engine.ts` produce user-facing results.
7. `src/actions/history.ts` persists results and can enrich coach copy through `createGroqCoachClient`.

This is a good production trait: expensive video interpretation does not require backend compute for the main path.

## Persistence Model

Drizzle schema is centralized in `src/db/schema.ts`.

Major table groups:

- Auth/user tables: `users`, `accounts`, `sessions`, `verificationTokens`.
- Player setup/history: `playerProfiles`, `analysisSessions`, `sensitivityHistory`.
- PUBG data: `weaponProfiles`, `weaponRegistry`, `weaponPatchProfiles`.
- Community: `communityProfiles`, `communityPosts`, snapshots, likes, saves, comments, follows, reports, moderation actions.
- Progression/gamification: seasons, missions, squads, progression aggregates/events, rewards.
- Monetization scaffolding: `featureEntitlements`, `userEntitlements`.
- Ops/admin: `botHeartbeat`, `auditLogs`, `systemSettings`.

## Auth And Authorization

Auth lives in `src/auth.ts`.

Key traits:

- JWT sessions.
- Google and Discord providers.
- User sync to database on sign-in.
- Discord guild role sync can set admin/mod/support.
- Admin routes are protected in `src/app/admin/layout.tsx`.
- Profile/history are protected by middleware in `src/middleware.ts`.
- Community write actions generally call `auth()` and apply action-level checks.

Planning note:

- Authorization is mostly route/action-local. Production hardening should review every privileged action and route with one consistent matrix.

## Community Architecture

Community functionality is split across server actions, core view models, and App Router pages.

Important files:

- `src/actions/community-posts.ts`
- `src/actions/community-comments.ts`
- `src/actions/community-likes.ts`
- `src/actions/community-saves.ts`
- `src/actions/community-follows.ts`
- `src/actions/community-reports.ts`
- `src/actions/community-admin.ts`
- `src/core/community-discovery-view-model.ts`
- `src/core/community-public-profile-view-model.ts`
- `src/core/community-progression.ts`
- `src/core/community-rewards.ts`
- `src/lib/community-access.ts`
- `src/lib/community-entitlements.ts`

The existing docs indicate that monetization was intentionally prepared but kept inactive.

## Admin And Operations

Admin UI lives under `src/app/admin`.

Capabilities visible in code:

- User role updates via `src/actions/admin.ts`.
- Maintenance mode toggle via `src/actions/settings.ts`.
- Community moderation via `src/actions/community-admin.ts`.
- Bot health/status through API routes and admin pages.
- Audit logging through `src/db/audit-log.ts`.

## Security Layer

Security-related code:

- `src/middleware.ts` adds CSP, HSTS, frame/permissions/referrer headers, route protection, and API/auth rate limiting.
- `next.config.ts` adds base headers.
- `src/lib/rate-limit.ts` provides token-bucket rate limits.
- `src/lib/safe-action.ts` provides safe action clients.

Important production caveat:

- The rate limiter uses in-memory `Map`, so it is not durable or globally consistent in serverless/multi-instance production.

## Release Readiness Architecture

Readiness is first-class:

- `src/core/release-readiness.ts`
- `scripts/check-release-readiness.ts`
- `docs/launch-readiness-2026-04-17.md`

The readiness model separates local browser readiness, deployment readiness, and backend pipeline readiness.

This should be reused for GSD production phases.

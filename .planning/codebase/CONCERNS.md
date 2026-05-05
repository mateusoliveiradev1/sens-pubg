---
title: Concerns
mapped_at: 2026-05-05
last_mapped_commit: 2e43aa873e6577285138ef3726bbe888cf75f029
---

# Concerns

## Production Readiness Is Partly Operational

`README.md` and `docs/launch-readiness-2026-04-17.md` both say the browser-first product is technically ready, but final production still depends on operational setup:

- Real production env values.
- Production DB migrations.
- OAuth callbacks on the final domain.
- Published smoke test with `npm run smoke:deployed -- <base-url>`.
- `npm run readiness:deploy`.

This should become an early GSD phase before monetization activation.

## Backend Video Pipeline Is Not Ready

`docs/launch-readiness-2026-04-17.md` marks server-side ffmpeg/backend extraction as blocked in the current environment.

Current product strength is browser-first analysis. Do not plan backend-heavy video processing as production-ready without resolving ffmpeg/runtime/deploy constraints.

## Rate Limiting Is In-Memory

`src/lib/rate-limit.ts` uses an in-memory `Map`.

This is fine for local/dev and basic protection, but it is not sufficient as the only production abuse control in serverless or multi-instance environments because limits reset on instance restart and are not shared globally.

Likely production follow-up:

- Durable/shared rate limit store.
- Clear rate limit keys per user/IP/action.
- Observability for abuse and false positives.

## SEO Assets And Verification Have Gaps

`src/app/layout.tsx` references:

- `/og-image.png`
- `/safari-pinned-tab.svg`

Those files were not present under `public/` during this mapping.

`src/app/layout.tsx` also has `google-site-verification-placeholder`.

These are small but visible production polish gaps.

## OAuth And Discord Role Sync Need Operationalization

`src/auth.ts` hardcodes Discord role IDs inside the auth callback.

This makes role mapping less flexible across staging/prod Discord servers and harder to rotate without code changes.

Production follow-up:

- Move Discord role IDs to env or DB-backed admin settings.
- Document required Discord scopes/callbacks.
- Add a role-sync smoke or admin diagnostic.

## Monetization Is Scaffolded But Inactive

The database and policy code already include inactive monetization scaffolding:

- `featureEntitlements`
- `userEntitlements`
- `src/lib/community-entitlements.ts`
- `src/lib/community-access.ts`

Docs explicitly state that monetization was prepared but not activated. Billing, checkout, subscription provider, and enforcement should be a distinct roadmap track, not mixed into general community hardening.

## Bot API Optional State Is Ambiguous

Bot routes depend on `BOT_API_KEY`:

- `src/app/api/bot/health/route.ts`
- `src/app/api/bot/user/[discordId]/route.ts`

If `BOT_API_KEY` is absent, requests are unauthorized. This is acceptable, but admin UI should make "bot integration not configured" different from "bot offline".

## Public Dashboard Shell

`/dashboard` is not listed in `PROTECTED_ROUTES` in `src/middleware.ts`.

`src/actions/dashboard.ts` returns `null` for anonymous users, so the page may be intentionally usable as an empty/public shell. Before production polish, decide whether dashboard should redirect unauthenticated users or render a strong anonymous CTA.

## I18n Is Partial

`src/i18n` supports `pt-BR`, `en`, and `es`, but many pages still contain inline Portuguese copy.

If multilingual SEO or monetization is a goal, internationalization needs a dedicated pass. The current default-market posture appears to be Portuguese/Brazil-first.

## Security Header Duplication

Security headers are set in both `next.config.ts` and `src/middleware.ts`.

This is not automatically wrong, but production hardening should verify final emitted headers in deployed responses so CSP, HSTS, frame policy, and referrer policy are consistent.

## Local Secrets Must Stay Out Of Planning

`.env.local` exists in the repo workspace but was not read for this map. Generated planning docs should continue to use `.env.example` and code references only, not local secret values.

## Existing Docs Exceed Ingest Cap

`docs/` and `openspec/` contain 68 markdown files, while `README.md` brings the repo markdown count to 69.

GSD ingest has a 50-doc cap. Future document ingestion should use a manifest or narrower paths, likely prioritizing:

- `README.md`
- `docs/launch-readiness-2026-04-17.md`
- `docs/SDD-comunidade.md`
- `docs/COMMUNITY-EXECUTION-PLAN.md`
- `docs/SDD-analise-spray.md`
- `docs/SDD-analise-de-video.md`
- `docs/SDD-coach-extremo.md`
- Relevant current `openspec/specs/**/spec.md`

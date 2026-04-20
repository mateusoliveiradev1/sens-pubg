## 1. Contracts And Tests

- [x] 1.1 Add unit tests for a public community discovery view model covering public-only filtering, active filters, empty states and rich post card data.
- [x] 1.2 Add unit tests for public profile data covering privacy allowlist, public posts only, creator metrics, follower count and self-profile state.
- [x] 1.3 Add unit tests for highlight/reputation helpers covering featured posts, creator highlights, safe fallbacks and no misleading badge labels.
- [x] 1.4 Add or update page contract tests for `/community`, `/community/users/[slug]` and `/community/[slug]` to lock the new navigation, empty states and continuity links.
- [x] 1.5 Add visual contract assertions or snapshot-friendly markers for project-native community UI sections, avoiding generic social/dashboard naming.

## 2. Public Data View Models

- [x] 2.1 Implement `getCommunityDiscoveryViewModel` or equivalent server-first function that returns hub summary, filters, public feed cards, featured posts, creator highlights and participation prompts.
- [x] 2.2 Extend public feed data to include safe author identity, profile slug/avatar fallback data and public engagement counts without exposing private fields.
- [x] 2.3 Implement `getPublicCommunityProfileViewModel` or equivalent function that composes profile identity, follow state, public creator metrics, public links and public post summaries.
- [x] 2.4 Add helper functions for formatting public community labels, creator status, metrics and safe empty-state copy.

## 3. Community Hub UI

- [x] 3.1 Create community UI components and styles with project-native names and visuals, such as squad board, snapshot plate, loadout chips, recoil signal strip, creator plate, featured section and actionable empty state.
- [x] 3.2 Refactor `/community` to render the discovery hub from the view model while preserving existing filter query behavior.
- [x] 3.3 Upgrade discovery controls so active filters, clear action and no-result recovery are obvious on mobile and desktop.
- [x] 3.4 Ensure feed cards show author/profile link, public analysis tags, engagement signals, publish date and primary open action with stable layout.
- [x] 3.5 Verify the hub reuses the current dark glass, orange/cyan accents, mono metrics, grid/crosshair/HUD motifs and does not introduce a disconnected palette or generic SaaS feed.

## 4. Public Profile UI

- [x] 4.1 Refactor `/community/users/[slug]` around a stronger operator/creator profile header with avatar or monogram, display name, slug, headline, bio, creator badge, links, report action and community navigation.
- [x] 4.2 Add public metric cards for followers, public posts, likes, comments and copies using only public community activity.
- [x] 4.3 Upgrade the profile post showcase with richer cards, public tags, publish date, open action and no-post recovery.
- [x] 4.4 Add share/copy profile URL behavior when supported, with canonical public URL and no private identifiers.
- [x] 4.5 Verify profile visual language matches the app: technical stat plates, loadout/snapshot vocabulary, mono values, existing tokens and non-generic fallbacks.

## 5. Strength Loops And Safety

- [x] 5.1 Add contextual participation prompts for anonymous users, users without public profile and users with publishable analysis history.
- [x] 5.2 Add creator and post highlight sections based on explainable public signals and safe fallbacks when no highlights exist.
- [x] 5.3 Add continuity links from post detail to author profile and related community discovery paths when public data allows it.
- [x] 5.4 Keep report actions visible for profiles, posts and comments, and make unavailable states clear.
- [x] 5.5 Rewrite participation and highlight copy around PUBG Aim Analyzer actions: publish analysis, compare recoil, follow creator, save drill, copy preset and explore patch/weapon context.

## 6. Verification

- [x] 6.1 Update community E2E tests for hub browsing, filters, profile browsing, follow state, report visibility and empty states.
- [x] 6.2 Run `npm run test:community:unit`.
- [x] 6.3 Run `npm run typecheck`.
- [x] 6.4 Run `npm run build`.
- [x] 6.5 Run `npm run test:community:e2e`.
- [x] 6.6 Verify the new UI in Playwright at mobile and desktop widths, checking screenshots, console errors, text overflow and layout stability.
- [x] 6.7 Perform a visual DNA review against `src/app/page.module.css`, `src/app/pros/pros.module.css`, `src/ui/components/header.module.css` and `src/app/globals.css` before marking the change complete.

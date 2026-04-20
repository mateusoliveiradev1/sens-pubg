## 1. Public Profile Contracts

- [x] 1.1 Add unit tests for `buildPublicCommunityProfileViewModel` covering bio fallback from `player_profiles`, community profile override precedence, avatar fallback, normalized social links and duplicate removal.
- [x] 1.2 Add unit tests for the public setup allowlist covering aim setup, surface/grip, PUBG core and absence of private fields in the returned view model.
- [x] 1.3 Add contract tests for `/community/users/[slug]` proving public bio, public links and setup plates render when the owner has "Meu Perfil" data.
- [x] 1.4 Add regression tests proving hidden profiles, private posts, drafts and unpublished sessions are not exposed by the public profile route.

## 2. Public Profile Data Composition

- [x] 2.1 Extend `CommunityPublicProfileViewModel` types with public-safe owner identity fallbacks and `publicSetup` sections for aim setup, surface/grip and PUBG core.
- [x] 2.2 Update `getPublicCommunityProfileViewModel` to select only allowlisted fields from `community_profiles`, `users` and `player_profiles`.
- [x] 2.3 Implement identity precedence for display name, avatar, headline, bio and links according to `design.md`.
- [x] 2.4 Normalize X/Twitter and Twitch from `player_profiles` into the existing public link shape with safe URL validation and deduplication.
- [x] 2.5 Revalidate the public profile path after successful `saveProfile` when the user has a public community profile.

## 3. Public Profile UI

- [x] 3.1 Update `/community/users/[slug]/page.tsx` to render bio and links from the composed view model without generic fallback when real public data exists.
- [x] 3.2 Add aim setup, surface/grip and PUBG core plates to the public profile using stable responsive layout.
- [x] 3.3 Add setup-empty states for visitors and owner-specific completion action when the owner has no player profile data.
- [x] 3.4 Ensure profile metadata uses composed headline or bio so shared links describe the real public profile.
- [x] 3.5 Verify the public profile remains visually aligned with the current operator plate, HUD, mono metric and orange/cyan community language.

## 4. Community Growth Loops

- [x] 4.1 Add tests for a following feed source that includes only published public posts from followed public profiles.
- [x] 4.2 Implement following-feed data in the community discovery view model with clear empty states for users who follow nobody.
- [x] 4.3 Add tests and helpers for trend items by weapon, patch and diagnosis using only public posts and public engagement.
- [x] 4.4 Render a trend board on `/community` with links back to filtered discovery views.
- [x] 4.5 Add a weekly drill prompt that uses trend context when available and a stable analyze/history fallback when not.
- [x] 4.6 Add related-content links from public profile and post detail pages using public tags and safe empty behavior.

## 5. Community Trust Signals

- [x] 5.1 Add tests for factual badge rules: creator status, profile completeness, setup public, active patch, copied preset and saved drill.
- [x] 5.2 Implement trust signal helpers that return labels, reasons and counts without unsupported skill claims.
- [x] 5.3 Render trust signals on public profiles and community highlights with accessible text, not color-only indicators.
- [x] 5.4 Keep report actions visible for profiles/posts/comments and preserve login/self-profile disabled states.
- [x] 5.5 Add layout-stability checks or contract markers for metric plates and trust rails on mobile and desktop.

## 6. Verification

- [x] 6.1 Run `npm run test:community:unit`.
- [x] 6.2 Run `npm run typecheck`.
- [x] 6.3 Run `npm run build`.
- [x] 6.4 Run `npm run test:community:e2e`.
- [x] 6.5 Verify `/community` and `/community/users/[slug]` with Playwright at desktop and mobile widths, checking real bio/setup rendering, no console errors, no text overflow and stable layout.
- [x] 6.6 Review the final screenshots against the requested strong-community direction before marking implementation complete.

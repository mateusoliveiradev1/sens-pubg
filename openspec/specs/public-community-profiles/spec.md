# public-community-profiles Specification

## Purpose
TBD - created by archiving change revamp-community-experience. Update Purpose after archive.
## Requirements
### Requirement: Shareable public profile header
The system SHALL render `/community/users/[slug]` as a shareable public profile with identity, trust and social context.

#### Scenario: Visitor opens public profile
- **WHEN** a visitor opens a slug for a visible public community profile
- **THEN** the page displays display name, slug, avatar or monogram fallback, headline, bio, public links, creator status, report action and a clear path back to community discovery.

#### Scenario: Public profile has missing optional identity fields
- **WHEN** a public profile has no avatar, headline, bio, or links
- **THEN** the profile still renders with intentional fallbacks and no broken visual space.

### Requirement: Product-native profile presentation
The system SHALL present public profiles as PUBG Aim Analyzer creator/operator pages, not generic social bios.

#### Scenario: Public profile visual review
- **WHEN** a public profile page is reviewed visually
- **THEN** it uses project-native dark glass, orange/cyan accents, technical stat plates, mono numbers, creator badges, loadout/snapshot language and profile identity patterns that match the rest of the app.

#### Scenario: Profile lacks custom media
- **WHEN** a profile has no avatar or cover image
- **THEN** the fallback uses a project-native monogram or technical plate treatment instead of generic placeholder art.

### Requirement: Public creator metrics
The system SHALL show public profile metrics derived only from public community activity.

#### Scenario: Profile has public activity
- **WHEN** a profile has public posts with likes, comments, copies, saves, or followers
- **THEN** the profile displays metric cards for follower count, public post count, and available impact counts.

#### Scenario: Profile has no public activity
- **WHEN** a public profile has no public posts or engagement
- **THEN** the metrics area communicates a zero state without implying missing private data.

### Requirement: Public profile post showcase
The system SHALL display a profile's published public posts with enough analysis context to make the profile useful as a creator page.

#### Scenario: Profile has published public posts
- **WHEN** a public profile owns published public posts
- **THEN** the page lists those posts with title, excerpt, weapon, patch, diagnosis, publish date, and action to open the post.

#### Scenario: Profile has only non-public posts
- **WHEN** a profile owns drafts, hidden posts, deleted posts, followers-only posts, or unlisted posts
- **THEN** the public profile excludes those posts from the public list.

### Requirement: Follow and self-profile states
The system SHALL provide correct follow controls based on viewer authentication and ownership.

#### Scenario: Authenticated visitor views another profile
- **WHEN** an authenticated user opens another public profile
- **THEN** the profile displays a follow/unfollow control with the current follower count and viewer follow state.

#### Scenario: User views own profile
- **WHEN** an authenticated user opens their own public profile
- **THEN** the page does not offer self-follow and instead identifies the page as the user's public profile.

#### Scenario: Anonymous visitor views profile
- **WHEN** an anonymous visitor opens a public profile
- **THEN** the profile remains readable and follow-dependent actions are disabled or routed to login without hiding public content.

### Requirement: Profile sharing and external links
The system SHALL make public profiles easy to share while keeping external links safe.

#### Scenario: Visitor uses public links
- **WHEN** a visitor clicks a profile external link
- **THEN** the link opens with safe `target` and `rel` attributes and uses the stored label.

#### Scenario: Visitor copies or shares profile URL
- **WHEN** a share action is available and activated
- **THEN** the system provides the canonical public profile URL without exposing private identifiers.

### Requirement: Public profile privacy allowlist
The system MUST expose only approved public profile fields and public post summaries on profile pages.

#### Scenario: Profile owner has private account data
- **WHEN** a public profile is rendered
- **THEN** the page excludes email, auth provider data, private analysis sessions, private hardware settings unless explicitly published, and internal entitlement records.


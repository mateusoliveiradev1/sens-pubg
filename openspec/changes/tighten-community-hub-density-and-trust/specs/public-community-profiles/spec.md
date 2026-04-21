## ADDED Requirements

### Requirement: Public-safe progression identity
The system SHALL allow public profiles to show only public-safe progression signals such as displayable rewards, streak summaries, or public squad identity.

#### Scenario: Profile has public-safe progression signals
- **WHEN** a public profile has rewards, streak, or squad identity that are safe and enabled for display
- **THEN** the profile may show those signals near identity or credibility areas with factual labels

#### Scenario: Profile has only private progression detail
- **WHEN** a profile owner has mission progress, XP totals, or unfinished reward state that is not public-safe
- **THEN** the public profile omits those internals instead of exposing raw progression data

## MODIFIED Requirements

### Requirement: Shareable public profile header
The system SHALL render `/community/users/[slug]` as a shareable public profile with identity, trust, and optional public-safe progression context.

#### Scenario: Visitor opens public profile
- **WHEN** a visitor opens a slug for a visible public community profile
- **THEN** the page displays display name, slug, avatar or monogram fallback, headline, bio, public links, creator status when available, report action, and a clear path back to community discovery

#### Scenario: Public profile has missing optional identity fields
- **WHEN** a public profile has no avatar, headline, bio, or links
- **THEN** the profile still renders with intentional fallbacks and no broken visual space

#### Scenario: Public profile has public-safe rewards or streak context
- **WHEN** a public profile has displayable rewards, factual streak state, or public squad identity
- **THEN** the header or primary credibility area may include those signals without replacing the profile's main identity and recent work

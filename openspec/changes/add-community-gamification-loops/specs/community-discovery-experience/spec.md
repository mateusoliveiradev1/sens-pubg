## MODIFIED Requirements

### Requirement: Public community hub
The system SHALL render `/community` as a discovery hub with a useful first screen, community summary, discovery controls, highlighted content, public feed, clear participation paths, and viewer-aware ritual or progression surfaces when available.

#### Scenario: Visitor opens community hub
- **WHEN** any visitor opens `/community`
- **THEN** the page displays a community-focused header, a concise value statement, primary actions to explore posts or publish an analysis when eligible, and at least one content section beyond a plain chronological list

#### Scenario: Logged-in viewer has progression context
- **WHEN** an authenticated viewer with progression, missions, recap, or squad context opens `/community`
- **THEN** the hub displays those viewer-aware surfaces without hiding or replacing the public discovery feed

#### Scenario: Community has no public content
- **WHEN** no public published posts are available
- **THEN** the page displays an actionable empty state that explains how to publish or explore the product without implying a system error and may still show viewer-specific next actions when available

## ADDED Requirements

### Requirement: Seasonal and challenge discovery surfaces
The system SHALL surface weekly challenges, seasonal themes, or squad spotlights in ways that connect back to community discovery.

#### Scenario: Active challenge or season exists
- **WHEN** the system has an active weekly challenge, seasonal theme, or public squad spotlight
- **THEN** the hub displays that module with enough context to explain why it matters and where the user can act next

#### Scenario: Seasonal or challenge surface is unavailable
- **WHEN** there is no active challenge, no active season, or no public squad spotlight to show
- **THEN** the hub omits the unavailable module or renders a neutral fallback without broken containers or empty decorative frames

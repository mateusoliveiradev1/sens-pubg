## MODIFIED Requirements

### Requirement: Public community home
The system SHALL render `/community` as a public community home that quickly explains what matters now, what is happening in the community, and where the player can go next.

#### Scenario: Visitor opens community home
- **WHEN** any visitor opens `/community`
- **THEN** the first screen shows a clear community headline, a short player-facing explanation, one primary next step, and at least one public community section beyond a plain chronological feed

#### Scenario: Community has no public posts
- **WHEN** no public published posts are available
- **THEN** the page shows an honest empty state that explains how to publish or keep exploring without implying that public activity exists when it does not

#### Scenario: Community has rich public state
- **WHEN** journey, feed, discovery, trend, or highlight data are all available
- **THEN** the page composes them into a clear hierarchy instead of rendering a long stack of equal-weight sections

### Requirement: Mobile-first community layout
The system SHALL render the community home with stable, readable layouts on mobile and desktop.

#### Scenario: Mobile visitor browses community
- **WHEN** the page is viewed at 360px width
- **THEN** text fits inside containers, actions remain tappable, filters remain usable, and cards do not overflow horizontally

#### Scenario: Desktop visitor browses community
- **WHEN** the page is viewed on desktop
- **THEN** the layout uses available space for scannable sections without making the main feed feel like a small preview trapped below the fold

#### Scenario: Community has many active sections
- **WHEN** the page needs to present progress, ritual, trend, highlight, feed, and creator data together
- **THEN** the experience preserves a clear hierarchy of primary and secondary areas rather than forcing the visitor through serial modules before they understand what matters now

## ADDED Requirements

### Requirement: Clear hub hierarchy
The system SHALL organize `/community` around now, community pulse, and explore next.

#### Scenario: User opens the first fold on desktop
- **WHEN** the first fold of `/community` is rendered on desktop
- **THEN** it shows the player's current focus, one prioritized next action, and at least one public community pulse section in parallel before secondary discovery sections

#### Scenario: User opens the first fold on mobile
- **WHEN** the first fold of `/community` is rendered on mobile
- **THEN** it keeps the same priority order in a compact stack without duplicating equivalent calls to action across several panels

#### Scenario: Several overlapping modules are available
- **WHEN** challenge, drill, recap, mission, trend, and feed data are all available
- **THEN** the hub groups them into fewer composed sections that answer what to do now, why it matters, and what to explore next

### Requirement: Real public data only
The system SHALL use only real public data on `/community` and SHALL prefer honest empty states over fabricated community signals.

#### Scenario: Public trend or highlight data is missing
- **WHEN** the system cannot support a trend, highlight, creator, or pulse section with real public data
- **THEN** it omits that signal or renders an honest empty state instead of inventing counts, rankings, reasons, or activity

#### Scenario: Some public data exists and some does not
- **WHEN** the hub has only partial public community data
- **THEN** it keeps the available real signals visible and makes the missing pieces explicit without padding the page with fake content

### Requirement: Player-facing community copy
The system SHALL use short, clear, player-facing copy across the community home.

#### Scenario: Heading or CTA is rendered
- **WHEN** the home page renders titles, subtitles, labels, or calls to action
- **THEN** the language explains what the player can see or do and MUST NOT read like an internal module name or system label

#### Scenario: Empty state is rendered
- **WHEN** the page needs to explain a low-content or zero-data state
- **THEN** the copy stays direct, honest, and helpful without fake urgency or generic placeholder text

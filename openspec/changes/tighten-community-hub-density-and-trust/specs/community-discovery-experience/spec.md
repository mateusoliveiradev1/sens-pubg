## ADDED Requirements

### Requirement: Sparse public density mode
The system SHALL adapt `/community` to a compact sparse-state layout when real public content is too limited to justify a rich multi-band discovery experience.

#### Scenario: Community has only one visible public post or one visible public author
- **WHEN** `/community` is rendered with only one meaningful public post signal or only one distinct public author
- **THEN** the hub uses a compact composition that keeps the real post/feed close to the top and does not spend prime space on secondary discovery rails

#### Scenario: Secondary discovery data is mostly empty
- **WHEN** trend, creator, following, or pulse data would mostly render as empty states
- **THEN** the hub omits or collapses those sections instead of stacking multiple large empty modules

### Requirement: Seasonal and challenge discovery surfaces
The system SHALL surface weekly challenges, seasonal themes, viewer progression, or squad spotlights in ways that connect back to community discovery without burying the main feed.

#### Scenario: Active challenge or season exists
- **WHEN** the system has an active weekly challenge, seasonal theme, viewer mission context, or public squad spotlight
- **THEN** the hub displays that module with enough context to explain why it matters and where the user can act next

#### Scenario: Seasonal or challenge surface is unavailable
- **WHEN** there is no active challenge, no active season, or no public squad spotlight to show
- **THEN** the hub omits the unavailable module or renders a neutral fallback without broken containers or empty decorative frames

## MODIFIED Requirements

### Requirement: Public community hub
The system SHALL render `/community` as a discovery hub whose first view reflects the amount of real public signal available, keeps the main feed close to the top when the community is sparse, and integrates viewer-aware progression surfaces when available without replacing the public reading path.

#### Scenario: Visitor opens community hub with sparse public state
- **WHEN** any visitor opens `/community` and the public state is sparse
- **THEN** the first view shows a clear community headline, a concise value statement, one primary next step, and the real public post/feed context without elevating profile promotion as if the community already had broad public activity

#### Scenario: Logged-in viewer opens community hub with progression context
- **WHEN** an authenticated viewer opens `/community` with active missions, recap, challenge, streak, or squad context
- **THEN** the hub shows those viewer-aware surfaces in a compact, scannable way that does not hide or push away the main public discovery feed

#### Scenario: Visitor opens community hub with richer public state
- **WHEN** any visitor opens `/community` and the public state includes enough real posts, authors, and highlight signals
- **THEN** the page displays a richer discovery hierarchy with pulse, exploration, participation, and progression paths beyond a plain chronological list

#### Scenario: Community has no public content
- **WHEN** no public published posts are available
- **THEN** the page displays an actionable empty state that explains how to publish or explore the product without implying a system error or fabricated community motion and may still show viewer-specific next actions when available

### Requirement: Featured and trending surfaces
The system SHALL surface selected public posts or creators only when transparent public signals are strong enough to justify promotion and SHALL avoid giving premium placement to creator/profile promotion when the community is still too sparse.

#### Scenario: Featured creator appears
- **WHEN** a creator is promoted on `/community`
- **THEN** the hub shows transparent reasons grounded in sustained public evidence and MUST NOT promote that creator only because a single public post exists

#### Scenario: Sparse community lacks creator evidence
- **WHEN** the public state has too few posts, too few distinct authors, or too little engagement to justify creator promotion
- **THEN** creator highlight and profile-promotion sections are omitted, collapsed, or downgraded behind the main post/feed content

#### Scenario: Featured content is unavailable
- **WHEN** no item meets highlight criteria
- **THEN** the page omits the section or shows a neutral fallback without large decorative containers that make the hub feel fuller than the data supports

### Requirement: Mobile-first community layout
The system SHALL render the community hub with stable, readable layouts on mobile and desktop while keeping real content close to the first scroll even when progression surfaces are present.

#### Scenario: Mobile visitor browses sparse community
- **WHEN** the page is viewed at 360px width and the public state is sparse
- **THEN** text fits inside containers, actions remain tappable, cards do not overflow horizontally, and the visitor reaches real post/feed content without walking through a long serial stack of secondary modules

#### Scenario: Desktop visitor browses sparse community
- **WHEN** the page is viewed on desktop and the public state is sparse
- **THEN** the layout uses available space to keep the main feed or first real public post near the first scroll instead of burying it below several discovery bands

#### Scenario: Desktop visitor browses active community
- **WHEN** the page is viewed on desktop and the public state is rich
- **THEN** the layout uses available space for scannable sections without making the primary feed look like an embedded preview and without turning viewer progression into a serial wall of modules

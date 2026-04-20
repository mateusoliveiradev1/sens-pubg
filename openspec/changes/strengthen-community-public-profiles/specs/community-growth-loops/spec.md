## ADDED Requirements

### Requirement: Community SHALL provide a following-based discovery path
The system SHALL give authenticated users a way to discover recent public posts from public profiles they follow, while preserving the existing all-community discovery path.

#### Scenario: Viewer follows creators with public posts
- **WHEN** an authenticated viewer follows public profiles that have published public posts
- **THEN** the community experience can display a following feed containing only those public posts

#### Scenario: Following feed excludes private or unpublished content
- **WHEN** followed users have hidden profiles, private posts, draft posts, or unpublished posts
- **THEN** those items do not appear in the following feed

#### Scenario: Viewer follows nobody
- **WHEN** an authenticated viewer follows no public profiles
- **THEN** the following path displays an empty state that points to creator discovery

### Requirement: Community SHALL surface explainable trends
The system SHALL surface trends from public community activity using explainable public signals such as weapon, patch, diagnosis, recent posts, saves, copies, comments, and likes.

#### Scenario: Public activity creates a trend
- **WHEN** multiple public posts share the same weapon, patch, or diagnosis signal within the configured discovery window
- **THEN** the community displays a trend item with a label, count or reason, and a link back to the filtered community view

#### Scenario: Trends do not use private activity
- **WHEN** private posts, hidden profiles, drafts, or unpublished sessions contain matching signals
- **THEN** those signals do not affect the public trend board

#### Scenario: No trend data exists
- **WHEN** there is not enough public activity to form trends
- **THEN** the community displays a prompt to publish or explore analyses instead of fake trend values

### Requirement: Community SHALL provide participation prompts by viewer state
The system SHALL show participation prompts that match the viewer state: anonymous reader, logged-in user without a public profile, user with publishable analyses, or active community participant.

#### Scenario: Anonymous viewer sees account prompt
- **WHEN** a viewer is not authenticated
- **THEN** the community prompts them to sign in to follow creators, save drills, comment, and copy presets

#### Scenario: Logged-in viewer without public profile sees profile prompt
- **WHEN** a logged-in viewer has no public community profile
- **THEN** the community prompts them to complete or activate their public operator plate

#### Scenario: Viewer has publishable analysis history
- **WHEN** a logged-in viewer has analysis sessions that can become public posts
- **THEN** the community prompts them to publish a snapshot from history

### Requirement: Community SHALL support related-content continuity
The system SHALL provide continuity links from profiles and posts to related community discovery paths using public tags such as weapon, patch, diagnosis, creator, and saved/copy behavior.

#### Scenario: Public profile setup links to discovery
- **WHEN** a public profile has public posts or setup tags that map to community filters
- **THEN** the profile provides links to explore related posts in the community

#### Scenario: Public post links back to author and related posts
- **WHEN** a viewer opens a public post detail page
- **THEN** the page links to the author's public profile and to related discovery filters when public data exists

#### Scenario: Related links have no matching public data
- **WHEN** no related public content exists for a tag
- **THEN** the page omits the related link or shows a clear empty-state path without broken navigation

### Requirement: Community SHALL introduce lightweight weekly drill prompts
The system SHALL expose a lightweight weekly drill or challenge prompt based on public community context or a safe editorial fallback, without requiring real-time chat or ranking infrastructure.

#### Scenario: Trend-based drill exists
- **WHEN** a weapon, patch, or diagnosis trend is available
- **THEN** the community can display a weekly drill prompt connected to that trend

#### Scenario: No trend-based drill exists
- **WHEN** trend data is unavailable
- **THEN** the community displays a stable fallback drill prompt that invites users to analyze recoil or publish a snapshot

#### Scenario: Drill prompt links to action
- **WHEN** a viewer selects the drill prompt action
- **THEN** the system routes them to analyze, history, or filtered community discovery according to the prompt context

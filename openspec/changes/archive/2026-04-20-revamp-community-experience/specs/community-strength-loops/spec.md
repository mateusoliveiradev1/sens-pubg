## ADDED Requirements

### Requirement: Participation prompts
The system SHALL provide contextual prompts that move users from passive reading to valuable community actions.

#### Scenario: Anonymous visitor browses community
- **WHEN** an anonymous visitor views community content
- **THEN** the experience invites them to sign in to follow creators, save posts, comment, or publish their own analysis without blocking public reading.

#### Scenario: Authenticated user has no public profile
- **WHEN** an authenticated user browses community without a complete public profile
- **THEN** the experience provides a clear path to complete or activate their public community profile.

#### Scenario: Authenticated user has publishable analysis history
- **WHEN** an authenticated user can publish an analysis snapshot
- **THEN** the experience provides a path to turn that analysis into a public post.

### Requirement: Creator and post highlights
The system SHALL highlight creators and posts using explainable public community signals.

#### Scenario: Highlighted creator appears
- **WHEN** a creator is highlighted
- **THEN** the UI shows public reasons such as creator status, follower count, post count, recent public activity, copies, likes, or comments.

#### Scenario: Highlighted post appears
- **WHEN** a post is highlighted
- **THEN** the UI shows public reasons such as copied setup, strong engagement, recent activity, or relevant weapon/patch context.

### Requirement: Reputation and trust signals
The system SHALL display reputation and trust signals that are factual, lightweight and not misleading.

#### Scenario: Creator has approved status
- **WHEN** a profile has approved creator program status
- **THEN** the UI displays a creator badge without claiming skill level beyond the stored status.

#### Scenario: Post includes analysis snapshot
- **WHEN** a public post includes an analysis snapshot
- **THEN** the UI displays available technical context such as weapon, patch, scope, distance, diagnosis and snapshot freshness.

### Requirement: Domain-specific community loops
The system SHALL frame participation loops around PUBG Aim Analyzer domain actions rather than generic engagement bait.

#### Scenario: Participation prompt is shown
- **WHEN** the experience prompts a user to participate
- **THEN** the prompt references concrete player actions such as publishing an analysis, comparing recoil, sharing a setup, following a creator, saving a drill or copying a sensitivity preset.

#### Scenario: Highlight reason is shown
- **WHEN** a creator or post is highlighted
- **THEN** the reason uses domain-specific language such as copied setup, active patch, weapon focus, diagnosis match, creator impact or recent training signal.

### Requirement: Continuity links
The system SHALL connect related community surfaces so users can keep exploring.

#### Scenario: User opens a post
- **WHEN** a user views a community post
- **THEN** the post page links to the author's public profile and at least one relevant discovery path when public data allows it.

#### Scenario: User opens a profile
- **WHEN** a user views a public profile
- **THEN** the profile links back to filtered or general community discovery so the user can continue browsing.

### Requirement: Moderation visibility
The system SHALL keep report and safety actions visible on public community content.

#### Scenario: Visitor views public post or profile
- **WHEN** public community content is rendered
- **THEN** a report action is available for profiles, posts, and visible comments where supported.

#### Scenario: Report action is unavailable
- **WHEN** a report action cannot be submitted due to authentication or permissions
- **THEN** the UI communicates the disabled state or routes the user to the required next step.

### Requirement: No dead-end states
The system SHALL avoid dead-end community experiences by pairing empty or low-content states with next actions.

#### Scenario: Filter returns no results
- **WHEN** filters produce no public posts
- **THEN** the page offers actions to clear filters, explore all posts, or publish a relevant analysis.

#### Scenario: Profile has no posts
- **WHEN** a public profile has no public posts
- **THEN** the page keeps profile identity visible and offers a path back to community discovery.

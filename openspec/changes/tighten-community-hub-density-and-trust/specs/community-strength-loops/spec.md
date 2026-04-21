## MODIFIED Requirements

### Requirement: Participation prompts
The system SHALL provide contextual prompts that move users from passive reading to valuable community actions and, when relevant, into progression or ritual loops.

#### Scenario: Anonymous visitor browses community
- **WHEN** an anonymous visitor views community content
- **THEN** the experience invites them to sign in to follow creators, save posts, comment, publish their own analysis, or start community progression without blocking public reading

#### Scenario: Authenticated user has no public profile
- **WHEN** an authenticated user browses community without a complete public profile
- **THEN** the experience provides a clear path to complete or activate their public community profile and explains any progression or challenge value unlocked by doing so

#### Scenario: Authenticated user has publishable analysis history
- **WHEN** an authenticated user can publish an analysis snapshot
- **THEN** the experience provides a path to turn that analysis into a public post and, when applicable, explains that the action advances an active mission, challenge, or streak

#### Scenario: Authenticated user has active progression context
- **WHEN** an authenticated user browses community with an active mission, streak recovery state, or near-complete milestone
- **THEN** the experience surfaces the next valuable action tied to that progression context instead of only showing a generic participation CTA

### Requirement: Creator and post highlights
The system SHALL highlight creators and posts using explainable public community signals only after minimum public evidence is met and SHALL prefer promoting posts over profiles when the community is still small.

#### Scenario: Highlighted creator appears
- **WHEN** a creator is highlighted
- **THEN** the UI shows public reasons grounded in multiple or sustained public signals such as repeated public posting, follows, copies, comments, or approved creator status paired with visible activity

#### Scenario: Creator evidence is too thin
- **WHEN** a creator has only a single public post or similarly weak public evidence
- **THEN** the hub MUST NOT give that creator hero-level or early discovery promotion as if broad public credibility already existed

#### Scenario: Highlighted post appears
- **WHEN** a post is highlighted
- **THEN** the UI shows public reasons such as copied setup, strong engagement, recent activity, or relevant weapon/patch context using only real public data

### Requirement: No dead-end states
The system SHALL avoid dead-end or over-built community experiences by pairing low-content states with next actions and by collapsing unnecessary social modules when the public state is still thin.

#### Scenario: Sparse hub has partial real data
- **WHEN** the hub has one or two real public signals but not enough to justify a full social discovery stack
- **THEN** the experience keeps those real signals visible, removes redundant empty social sections, and routes the visitor toward the feed, filters, or publish path

#### Scenario: Filter returns no results
- **WHEN** filters produce no public posts
- **THEN** the page offers actions to clear filters, explore all posts, or publish a relevant analysis

#### Scenario: Profile has no posts
- **WHEN** a public profile has no public posts
- **THEN** the page keeps profile identity visible and offers a path back to community discovery

## ADDED Requirements

### Requirement: Healthy return loops
The system SHALL turn missed periods, recaps, and completed rituals into healthy next-step loops instead of dead-end or shame-based messaging.

#### Scenario: User returns after missing a ritual window
- **WHEN** an authenticated user returns after missing a streak or ritual window
- **THEN** the experience offers a neutral re-entry action such as publish, save, follow, or complete a weekly challenge without negative framing

#### Scenario: User completes a ritual or milestone
- **WHEN** an authenticated user completes a weekly challenge, mission milestone, or streak step
- **THEN** the experience immediately suggests the next meaningful action that continues contribution or discovery

### Requirement: Gamified loops stay domain-native
The system SHALL keep gamified loops grounded in PUBG Aim Analyzer actions instead of generic social reward bait.

#### Scenario: Mission or challenge copy is rendered
- **WHEN** the system renders a mission, weekly challenge, reward, or next-step prompt
- **THEN** the language references concrete player actions such as publishing analysis, correcting diagnosis, validating patch behavior, saving drills, copying presets, or helping another player with contextual feedback

#### Scenario: Reward or milestone is highlighted
- **WHEN** the system highlights a reward, streak step, or milestone
- **THEN** it explains the underlying contribution with factual language and MUST NOT imply gameplay skill that the system did not directly measure

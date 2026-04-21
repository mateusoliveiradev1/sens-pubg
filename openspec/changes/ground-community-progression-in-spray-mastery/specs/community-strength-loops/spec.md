## MODIFIED Requirements

### Requirement: Participation prompts
The system SHALL provide contextual prompts that move users from passive reading to valuable community actions while preserving one clear primary action per context.

#### Scenario: Anonymous visitor browses community
- **WHEN** an anonymous visitor views community content
- **THEN** the experience invites them to sign in to follow creators, save posts, comment, or publish their own analysis without blocking public reading

#### Scenario: Authenticated user has no public profile
- **WHEN** an authenticated user browses community without a complete public profile
- **THEN** the experience provides a clear path to complete or activate their public community profile

#### Scenario: Authenticated user has publishable analysis history
- **WHEN** an authenticated user can publish an analysis snapshot
- **THEN** the experience provides a path to turn that analysis into a public post

#### Scenario: Multiple eligible prompts exist
- **WHEN** the system can suggest several valid next actions at once
- **THEN** it chooses one primary prompt aligned to the player's current journey state and demotes the others to supporting context

### Requirement: Domain-specific community loops
The system SHALL frame participation loops around PUBG Aim Analyzer actions and around the player's growth journey rather than around generic engagement bait.

#### Scenario: Participation prompt is shown
- **WHEN** the experience prompts a user to participate
- **THEN** the prompt references concrete player actions such as publishing an analysis, comparing recoil, sharing a setup, following a creator, saving a drill, or copying a sensitivity preset

#### Scenario: Highlight reason is shown
- **WHEN** a creator or post is highlighted
- **THEN** the reason uses grounded domain language such as copied setup, active patch, weapon focus, diagnosis match, creator impact, or recent training signal

#### Scenario: Player opens a journey-aware community page
- **WHEN** the system knows the player's current focus or missing prerequisite
- **THEN** the suggested participation loop reinforces that journey state instead of presenting unrelated high-noise engagement options

### Requirement: No dead-end states
The system SHALL avoid dead-end community experiences by pairing empty or low-content states with next actions while avoiding repetitive stacks of equivalent CTAs.

#### Scenario: Filter returns no results
- **WHEN** filters produce no public posts
- **THEN** the page offers actions to clear filters, explore all posts, or publish a relevant analysis

#### Scenario: Profile has no posts
- **WHEN** a public profile has no public posts
- **THEN** the page keeps profile identity visible and offers a path back to community discovery

#### Scenario: Community has sparse content and sparse player state
- **WHEN** the user lands in a low-content or zero-state community context
- **THEN** the experience consolidates recovery actions into a calm, prioritized next step instead of rendering several empty modules with near-identical prompts

## ADDED Requirements

### Requirement: Relationship loops stay meaningful
The system SHALL strengthen relationship loops that help users return to relevant creators, posts, and focuses.

#### Scenario: User has meaningful community relationships
- **WHEN** the user follows creators, saves posts, or copies setups
- **THEN** the community pages and sections reuse those relationships to suggest relevant next content, creators, or focuses

#### Scenario: User has no relationships yet
- **WHEN** the user has not followed, saved, or copied anything
- **THEN** the system offers a lightweight path to establish the first high-value relationship without overwhelming the page with social onboarding

### Requirement: Community prompts are grounded in real state
The system SHALL base prompts, recaps, and return loops on actual player or public community state.

#### Scenario: Real return context exists
- **WHEN** the product knows that the player has a real eligible action, a followed creator update, a saved post, or a valid analysis path
- **THEN** the prompt can reference that state directly

#### Scenario: No strong return context exists
- **WHEN** the product does not have enough real state to support a personalized prompt
- **THEN** it falls back to a generic but honest next step and MUST NOT invent urgency, hidden activity, or fake social proof

### Requirement: Community loops remain calm
The system SHALL keep community loops restrained even when rituals, recaps, or rewards are available.

#### Scenario: User returns after missing a ritual window
- **WHEN** a returning user has missed a challenge, streak window, or mission cadence
- **THEN** the experience offers a reentry path without punitive copy or loss framing

#### Scenario: User has several active prompts and sections
- **WHEN** the hub could show multiple reward, ritual, or prompt panels
- **THEN** the UX preserves one primary next action and treats the remaining loops as supporting information

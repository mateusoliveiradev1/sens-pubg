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

## ADDED Requirements

### Requirement: Healthy return loops
The system SHALL turn missed periods, recaps, and completed rituals into healthy next-step loops instead of dead-end or shame-based messaging.

#### Scenario: User returns after missing a ritual window
- **WHEN** an authenticated user returns after missing a streak or ritual window
- **THEN** the experience offers a neutral re-entry action such as publish, save, follow, or complete a weekly challenge without negative framing

#### Scenario: User completes a ritual or milestone
- **WHEN** an authenticated user completes a weekly challenge, mission milestone, or streak step
- **THEN** the experience immediately suggests the next meaningful action that continues contribution or discovery

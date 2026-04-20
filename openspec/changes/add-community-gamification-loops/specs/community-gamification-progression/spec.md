## ADDED Requirements

### Requirement: Auditable progression events
The system SHALL register eligible community actions as auditable progression events before awarding XP, mission credit, or reward progress.

#### Scenario: Eligible action creates one progression event
- **WHEN** an authenticated user completes an eligible public community action and that action passes dedupe and cooldown rules
- **THEN** the system records exactly one progression event with actor, beneficiary when applicable, entity reference, event type, timestamp, and an idempotency fingerprint before applying credit

#### Scenario: Ineligible action does not create credit
- **WHEN** an action references hidden, deleted, archived, moderated, non-public, or otherwise ineligible community content
- **THEN** the system does not award progression credit for that action and excludes it from progression totals

#### Scenario: Duplicate action inside cooldown is ignored
- **WHEN** the same actor repeats the same eligible action against the same target inside the configured cooldown window
- **THEN** the system keeps only the first eligible event for progression credit and ignores the duplicate for XP and mission advancement

### Requirement: Progression uses high-value domain actions
The system SHALL advance community progression from configured PUBG Aim Analyzer actions that represent useful participation rather than vanity engagement alone.

#### Scenario: Publishing useful analysis advances progression
- **WHEN** a user publishes an eligible public post or analysis snapshot
- **THEN** the system advances progression for that author according to the configured publish rule

#### Scenario: Contextual contribution advances progression
- **WHEN** a user completes a contribution rule that requires contextual feedback, setup sharing, save-worthy content, or copy-worthy content
- **THEN** the system advances progression only if the underlying action satisfies that rule's context and uniqueness constraints

#### Scenario: Low-value engagement is not the main progression source
- **WHEN** a progression rule is evaluated for a low-signal engagement such as repeated vanity interactions
- **THEN** the system either applies no progression credit or caps the credit below the primary high-value actions

### Requirement: Personal progression summary
The system SHALL provide logged-in users with a current summary of their community progression state.

#### Scenario: User with progress opens community
- **WHEN** an authenticated user with existing progression opens the community hub or their public profile
- **THEN** the experience shows current level, current XP state, active mission count, streak state when available, and the next meaningful action or milestone

#### Scenario: New user has no progression yet
- **WHEN** an authenticated user without progression history opens the community hub
- **THEN** the experience shows a zero-state progression summary with a clear first action such as complete profile, publish analysis, or save a drill

### Requirement: Progression privacy boundaries
The system MUST keep raw personal progression details private unless they are explicitly represented by public-safe rewards or badges.

#### Scenario: Viewer sees own detailed progress
- **WHEN** an authenticated user views their own progression surfaces
- **THEN** the experience may show raw mission progress, streak recovery state, and next-step guidance for that viewer

#### Scenario: Other visitors do not see private progress internals
- **WHEN** another user or anonymous visitor views a public profile or public community surface
- **THEN** the experience does not expose private mission state, private progress totals, or unfinished reward progress for someone else

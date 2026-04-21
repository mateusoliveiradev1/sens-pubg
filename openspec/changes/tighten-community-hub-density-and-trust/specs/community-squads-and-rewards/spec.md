## ADDED Requirements

### Requirement: Lightweight squads
The system SHALL support lightweight community squads focused on shared progression rather than real-time chat.

#### Scenario: User creates or joins squad
- **WHEN** an eligible authenticated user creates a squad or accepts a valid squad invite
- **THEN** the system adds that user to a squad with the configured member limit and exposes the squad identity on the user's community surfaces as allowed

#### Scenario: Squad cannot exceed limits
- **WHEN** a squad is full or an invite is invalid, expired, or revoked
- **THEN** the system blocks the join attempt and explains the next valid path without creating partial membership

### Requirement: Shared squad goals
The system SHALL allow squads to progress through shared weekly or seasonal goals derived from eligible member actions.

#### Scenario: Member contribution advances squad goal
- **WHEN** a squad member completes an eligible action that counts toward an active squad goal
- **THEN** the system advances the squad goal according to the configured contribution rule

#### Scenario: Squad with no eligible progress still remains actionable
- **WHEN** a squad has no eligible progress for the active goal window
- **THEN** the system shows a neutral zero-state with the next squad action instead of an empty or broken progress panel

### Requirement: Public social rewards
The system SHALL expose public-safe rewards such as badges, titles, or season marks without claiming gameplay skill that was not measured.

#### Scenario: User earned public-safe reward
- **WHEN** a user or squad earns a public-safe reward and chooses to display it when display is optional
- **THEN** the reward may appear on the public profile, post surfaces, or community highlights with factual labeling

#### Scenario: User does not display reward
- **WHEN** a reward is optional to display and the owner has not enabled or equipped it
- **THEN** the reward does not appear publicly even though the system may retain the earned record privately

### Requirement: Reward safety guardrails
The system MUST protect squad and reward progress from abuse, moderation conflicts, and reciprocal farming.

#### Scenario: Moderated content loses reward value
- **WHEN** the post, comment, or profile activity used to justify a squad reward or public badge becomes hidden, deleted, or moderation-actioned
- **THEN** the system excludes that activity from future reward qualification and from public justification text

#### Scenario: Reciprocal farming is capped or ignored
- **WHEN** reward qualification depends on repeated actions between the same small set of accounts beyond the allowed threshold
- **THEN** the system caps or ignores that contribution for reward and squad progress calculations

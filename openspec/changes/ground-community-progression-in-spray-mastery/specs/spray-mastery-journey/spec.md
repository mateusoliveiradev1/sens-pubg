## ADDED Requirements

### Requirement: Spray mastery is the primary progression narrative
The system SHALL frame community progression around the player's spray mastery journey rather than around social engagement counts alone.

#### Scenario: Logged-in player opens a community page
- **WHEN** the system can derive eligible analysis or history evidence for that player
- **THEN** the experience presents a spray mastery state with current stage, focus context, and a next meaningful action before secondary social progress

#### Scenario: Player has no reliable mastery evidence yet
- **WHEN** the system cannot derive a trustworthy spray mastery state
- **THEN** it shows a neutral zero-state journey and recommends the smallest evidence-building action without inventing stage, skill, or confidence claims

### Requirement: Mastery stages are discrete and explainable
The system SHALL represent spray progression through discrete, explainable stages and milestones.

#### Scenario: Player has enough evidence to move stages
- **WHEN** recent analysis and practice signals satisfy the configured stage thresholds
- **THEN** the system advances the mastery stage and records the supporting milestone context

#### Scenario: Player inspects stage meaning
- **WHEN** the interface explains the current stage or next milestone
- **THEN** it uses factual language tied to analysis frequency, focus continuity, review evidence, or mastery gaps instead of prestige wording or opaque labels

### Requirement: Social activity amplifies but does not replace mastery
The system SHALL treat social contribution as a supporting amplifier to the mastery journey.

#### Scenario: Player publishes or comments after meaningful training evidence
- **WHEN** eligible social contribution occurs alongside valid mastery evidence
- **THEN** the experience may reflect that contribution as secondary reinforcement of the journey

#### Scenario: Player accumulates social actions without mastery evidence
- **WHEN** the player performs social actions that lack supporting spray evidence
- **THEN** those actions MUST NOT be enough to fully advance the primary mastery journey by themselves

### Requirement: Public mastery signals stay limited
The system SHALL expose only mastery signals that are safe to show on public community pages.

#### Scenario: Another visitor views the player's public community pages
- **WHEN** a public profile, creator card, or community highlight shows mastery information
- **THEN** it may display items that are safe to show publicly, such as stage label, focus weapon, or recent milestone copy, and MUST exclude raw private progression internals

#### Scenario: Player views their own journey
- **WHEN** a logged-in player views their private-facing community state
- **THEN** the product may show richer milestone progress and next-step guidance than what appears publicly

### Requirement: Mastery copy and UX remain calm
The system SHALL present mastery progression with player-facing language and without extreme gamification framing.

#### Scenario: Journey UI is rendered
- **WHEN** a stage, milestone, or return loop is shown
- **THEN** the experience avoids dominance language, urgency spam, punitive streak framing, reward inflation, or internal system labels that make the community feel manipulative

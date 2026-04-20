## ADDED Requirements

### Requirement: Weekly challenge board
The system SHALL provide a weekly challenge board that turns current community context into concrete return actions.

#### Scenario: Weekly challenge is available
- **WHEN** an active weekly challenge exists for the current week
- **THEN** the community hub shows the challenge title, short rationale, eligible actions, and a path to the relevant analysis, profile, or discovery surface

#### Scenario: Weekly challenge uses community context
- **WHEN** recent public trends by weapon, patch, diagnosis, or creator activity are available
- **THEN** the weekly challenge may derive its focus from those trends instead of using a generic prompt

#### Scenario: Weekly challenge fallback is needed
- **WHEN** there is not enough trend data to define a contextual weekly challenge
- **THEN** the system shows a neutral fallback challenge or editorial prompt without rendering an empty decorative module

### Requirement: Seasonal cadence
The system SHALL support timeboxed community seasons that organize progression and ritual surfaces.

#### Scenario: Active season exists
- **WHEN** a season is active
- **THEN** the system shows its title, time window, and theme on the relevant community surfaces that reference seasonal progress

#### Scenario: No active season exists
- **WHEN** no season is active
- **THEN** the system falls back to evergreen community progression language without claiming seasonal ranking or seasonal rewards

### Requirement: Weekly recap and re-entry
The system SHALL give users a weekly recap when activity exists and a healthy re-entry prompt when activity lapses.

#### Scenario: User has weekly activity
- **WHEN** an authenticated user has eligible community activity in the current or previous weekly window
- **THEN** the system provides a recap summarizing what they completed, what they unlocked, and one suggested next action

#### Scenario: User missed a weekly window
- **WHEN** an authenticated user returns after missing a weekly ritual window
- **THEN** the system offers a neutral re-entry prompt with a clear next action instead of using shaming language or fake urgency

### Requirement: Streak cadence is tied to meaningful return
The system SHALL tie streak continuation to meaningful weekly participation rather than raw action volume.

#### Scenario: User continues streak with meaningful action
- **WHEN** a user completes at least one eligible streak action in consecutive active windows
- **THEN** the system advances the user's streak by one step

#### Scenario: User misses required participation window
- **WHEN** a user does not complete the minimum eligible participation inside the required active window
- **THEN** the system resets or pauses the streak according to the configured rule and communicates the change with neutral language

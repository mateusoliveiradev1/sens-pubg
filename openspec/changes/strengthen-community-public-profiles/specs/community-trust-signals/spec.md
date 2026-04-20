## ADDED Requirements

### Requirement: Trust signals SHALL be factual and explainable
The system SHALL render community trust signals only from explicit public facts, and each signal label MUST be explainable from visible profile, post, or engagement data.

#### Scenario: Creator badge is based on creator status
- **WHEN** a public profile has `creatorProgramStatus` of `approved` or `waitlist`
- **THEN** the profile can display a matching creator badge

#### Scenario: No unsupported skill badge
- **WHEN** a profile has likes, copies, saves, follows, or posts but no measured skill certification
- **THEN** the system does not label the player as "pro", "verified skill", "best", or equivalent unsupported authority

#### Scenario: Signal reason is visible
- **WHEN** a badge or highlight is displayed
- **THEN** the UI provides adjacent text, count, or context that explains why it is shown

### Requirement: Profile completeness SHALL be derived from public-safe data
The system SHALL derive profile completeness and setup-public signals from the presence of public-safe identity, links, setup allowlist fields, and public posts.

#### Scenario: Complete public profile
- **WHEN** a public profile has display name, avatar or fallback, bio, at least one safe link, setup allowlist data, and at least one public post
- **THEN** the profile can display a "perfil completo" or equivalent factual completeness signal

#### Scenario: Incomplete public profile
- **WHEN** required public-safe identity or setup data is missing
- **THEN** the profile displays a completion prompt for the owner or a neutral missing-data state for visitors

#### Scenario: Completeness ignores private data
- **WHEN** private analyses, hidden posts, internal IDs, or non-allowlisted setup fields exist
- **THEN** those fields do not increase the public completeness signal

### Requirement: Post quality signals SHALL use public engagement only
The system SHALL derive post quality and usefulness signals only from public post data and public engagement such as saves, copies, visible comments, likes, featured status, patch, weapon, and diagnosis tags.

#### Scenario: Useful post signal from copies or saves
- **WHEN** a public post has copy or save events
- **THEN** the system can display a usefulness reason such as copied preset count or saved drill count

#### Scenario: Hidden comments are excluded
- **WHEN** a post has comments with status other than visible
- **THEN** those comments do not contribute to public quality signals

#### Scenario: Draft post cannot be highlighted
- **WHEN** a post is draft, private, unpublished, or belongs to a hidden profile
- **THEN** it cannot appear in public highlights or quality rails

### Requirement: Reporting and safety actions SHALL remain available
The system SHALL keep profile, post, and comment reporting paths visible where public community content is shown, with login or unavailable states clearly communicated.

#### Scenario: Authenticated viewer can report profile
- **WHEN** an authenticated viewer opens a public profile
- **THEN** a report action for that profile is available

#### Scenario: Anonymous viewer sees login path for reporting
- **WHEN** an anonymous viewer opens public community content
- **THEN** the report action explains that login is required or links to login

#### Scenario: Owner sees self-profile state
- **WHEN** the profile owner opens their own public profile
- **THEN** the follow action is replaced by a self-profile state and does not allow following self

### Requirement: Trust UI SHALL be accessible and layout-stable
The system SHALL render trust badges, signal rails, and metric plates with accessible labels, stable dimensions, and responsive behavior across mobile and desktop.

#### Scenario: Badge has accessible text
- **WHEN** a trust badge is displayed
- **THEN** its meaning is available as text and not only through color or icon

#### Scenario: Metric value changes
- **WHEN** follower, copy, save, like, or comment counts change
- **THEN** metric plates keep stable layout without shifting surrounding content

#### Scenario: Mobile viewport renders trust rail
- **WHEN** the profile or community page is viewed on a mobile viewport
- **THEN** trust signals wrap or stack without text overflow or occluding actions

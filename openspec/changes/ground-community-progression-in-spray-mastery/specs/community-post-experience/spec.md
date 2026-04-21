## ADDED Requirements

### Requirement: Post detail has a prioritized reading hierarchy
The system SHALL render the public community post detail as a clear reading page instead of a long serial dump of snapshot data and comments.

#### Scenario: Visitor opens a public post
- **WHEN** a public post detail page is rendered
- **THEN** the experience clearly prioritizes the post value, author context, primary actions, technical snapshot, conversation, and continuity paths

#### Scenario: Post has rich technical and social context
- **WHEN** author, continuity, snapshot, diagnosis, and comments are all available
- **THEN** the page groups them into a readable hierarchy without making every section feel equally primary

### Requirement: Post detail uses real public data
The system SHALL use only real public post, author, and discussion data on the post detail page.

#### Scenario: Post data is partial
- **WHEN** the page has the public post but lacks some related author, continuity, or discussion data
- **THEN** it keeps the available real data visible and renders the missing areas as honest absence instead of inventing related activity

#### Scenario: Post has no comments
- **WHEN** the comment thread is empty
- **THEN** the page communicates that zero state clearly without making the post feel unfinished or padding the discussion with placeholder content

### Requirement: Post detail supports grounded continuity
The system SHALL use the post detail page as a continuation point into the wider community.

#### Scenario: Visitor wants to continue after reading a post
- **WHEN** the visitor reaches the continuity area
- **THEN** the page offers relevant paths to the author, related weapon or patch views, diagnosis-related discovery, or other grounded ways to keep exploring

#### Scenario: Some continuity data is unavailable
- **WHEN** the author or related path cannot be shown safely
- **THEN** the page keeps continuity useful with the remaining paths that are safe to show publicly and does not expose private or fabricated state

### Requirement: Conversation remains contextual
The system SHALL keep comments and discussion attached to the technical context of the post.

#### Scenario: Visible comments exist
- **WHEN** comments are rendered on a public post
- **THEN** the discussion remains tied to the post context and stays visually subordinate to the primary post narrative

### Requirement: Player-facing post detail copy
The system SHALL use short, clear copy on the post detail page.

#### Scenario: Title, label, or CTA is rendered
- **WHEN** the post detail page renders labels, callouts, or actions
- **THEN** the language explains the post, the author, or the next step without sounding like a system panel name

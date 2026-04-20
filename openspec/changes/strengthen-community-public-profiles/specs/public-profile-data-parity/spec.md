## ADDED Requirements

### Requirement: Public profile SHALL compose identity from public-safe sources
The system SHALL render a public community profile by composing `community_profiles`, `users`, and `player_profiles` with privacy-safe precedence so data already configured in "Meu Perfil" appears on the public profile when the community profile itself has no richer value.

#### Scenario: Bio falls back to player profile
- **WHEN** a public community profile has no `community_profiles.bio` and the same user has `player_profiles.bio`
- **THEN** the public profile displays the `player_profiles.bio` text as the public bio

#### Scenario: Community profile overrides player profile bio
- **WHEN** a public community profile has `community_profiles.bio` and the same user also has `player_profiles.bio`
- **THEN** the public profile displays `community_profiles.bio`

#### Scenario: Avatar falls back to auth user image
- **WHEN** a public community profile has no `avatarUrl` and the owner has `users.image`
- **THEN** the public profile uses `users.image` as the public avatar

#### Scenario: Hidden profile remains hidden
- **WHEN** a community profile has `visibility` different from `public`
- **THEN** the public profile route returns not found and does not expose identity, setup, posts, or metrics

### Requirement: Public profile SHALL normalize social links from community and player profile
The system SHALL expose a normalized public links list using valid `community_profiles.links` plus valid X/Twitter and Twitch links from `player_profiles`, with duplicates removed and unsafe URLs omitted.

#### Scenario: Legacy social links appear publicly
- **WHEN** a player profile has valid X/Twitter and Twitch URLs and the community profile is public
- **THEN** the public profile displays those links with safe `target` and `rel` attributes

#### Scenario: Duplicate links are removed
- **WHEN** the same URL exists in both `community_profiles.links` and a `player_profiles` social field
- **THEN** the public profile displays the URL once

#### Scenario: Invalid links are omitted
- **WHEN** a profile stores an invalid, unsupported, or empty social URL
- **THEN** the public profile does not render that URL

### Requirement: Public profile SHALL expose only allowlisted setup fields
The system SHALL expose setup data on public profiles only through an explicit allowlist of player profile fields grouped as aim setup, surface/grip, and PUBG core.

#### Scenario: Setup plates render from player profile
- **WHEN** a public profile owner has a player profile with mouse, mousepad, grip, play style, general sensitivity, ADS sensitivity, vertical multiplier, and FOV
- **THEN** the public profile displays aim setup, surface/grip, and PUBG core plates with those values

#### Scenario: Private fields are not present in the public model
- **WHEN** the public profile view model is built
- **THEN** it does not include email, Discord ID, user ID as a display field, auth session data, private analysis sessions, unpublished posts, or any player profile field outside the setup allowlist

#### Scenario: Missing setup uses actionable fallback
- **WHEN** a public community profile exists but the owner has no player profile
- **THEN** the public profile displays a stable setup-empty state instead of generic bio copy or broken cards

### Requirement: Public profile updates SHALL reflect saved profile changes
The system SHALL make saved "Meu Perfil" identity and setup changes visible on the corresponding public community profile after the user saves their profile.

#### Scenario: Saving bio updates public profile
- **WHEN** the profile owner saves a new bio in "Meu Perfil" and has a public community profile without a custom community bio
- **THEN** the public profile displays the new bio after the save completes

#### Scenario: Saving setup updates public setup plates
- **WHEN** the profile owner saves changed mouse, mousepad, grip, or PUBG settings
- **THEN** the public profile setup plates display the updated public allowlist values

#### Scenario: Public profile path is revalidated
- **WHEN** a profile save succeeds for a user who has a public community profile
- **THEN** the system revalidates the public profile path for that slug

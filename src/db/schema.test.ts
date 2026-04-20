import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import * as dbSchema from './schema';
import {
    analysisSessions,
    communityPostAnalysisSnapshots,
    communityPosts,
    communityProfiles,
    weaponPatchProfiles,
    weaponProfiles,
    weaponRegistry,
} from './schema';

function getColumn(table: Parameters<typeof getTableConfig>[0], name: string) {
    const column = getTableConfig(table).columns.find((candidate) => candidate.name === name);

    expect(column, `expected column ${name} to exist on ${getTableConfig(table).name}`).toBeDefined();

    return column!;
}

function getExportedTable(name: string) {
    const table = (dbSchema as Record<string, unknown>)[name];

    expect(table, `expected schema export ${name} to exist`).toBeDefined();

    return table as Parameters<typeof getTableConfig>[0];
}

function getForeignKey(table: Parameters<typeof getTableConfig>[0], name: string) {
    const foreignKey = getTableConfig(table).foreignKeys.find((candidate) => candidate.getName() === name);

    expect(foreignKey, `expected foreign key ${name} to exist on ${getTableConfig(table).name}`).toBeDefined();

    return foreignKey!;
}

function getIndex(table: Parameters<typeof getTableConfig>[0], name: string) {
    const index = getTableConfig(table).indexes.find((candidate) => candidate.config.name === name);

    expect(index, `expected index ${name} to exist on ${getTableConfig(table).name}`).toBeDefined();

    return index!;
}

function getPrimaryKey(table: Parameters<typeof getTableConfig>[0], name: string) {
    const primaryKey = getTableConfig(table).primaryKeys.find((candidate) => candidate.getName() === name);

    expect(primaryKey, `expected primary key ${name} to exist on ${getTableConfig(table).name}`).toBeDefined();

    return primaryKey!;
}

describe('analysisSessions schema', () => {
    it('defines a dedicated patch_version column for patch-aware queries', () => {
        expect(analysisSessions.patchVersion).toBeDefined();
        expect(analysisSessions.patchVersion.name).toBe('patch_version');
    });
});

describe('weaponProfiles schema', () => {
    it('defines a canonical_profile column for multidimensional attachment data', () => {
        expect(weaponProfiles.canonicalProfile).toBeDefined();
        expect(weaponProfiles.canonicalProfile.name).toBe('canonical_profile');
    });
});

describe('weapon patch-aware schema', () => {
    it('defines a registry with stable weapon_id slugs', () => {
        expect(weaponRegistry.weaponId).toBeDefined();
        expect(weaponRegistry.weaponId.name).toBe('weapon_id');
    });

    it('defines patch profiles with patch_version and lifecycle_status', () => {
        expect(weaponPatchProfiles.patchVersion).toBeDefined();
        expect(weaponPatchProfiles.patchVersion.name).toBe('patch_version');
        expect(weaponPatchProfiles.lifecycleStatus).toBeDefined();
        expect(weaponPatchProfiles.lifecycleStatus.name).toBe('lifecycle_status');
    });
});

describe('communityProfiles schema', () => {
    it('defines a public profile keyed by user and slug', () => {
        expect(communityProfiles).toBeDefined();

        const userId = getColumn(communityProfiles, 'user_id');
        const slug = getColumn(communityProfiles, 'slug');
        const visibility = getColumn(communityProfiles, 'visibility');
        const creatorProgramStatus = getColumn(communityProfiles, 'creator_program_status');
        const links = getColumn(communityProfiles, 'links');

        expect(userId.notNull).toBe(true);
        expect(userId.isUnique).toBe(true);
        expect(slug.notNull).toBe(true);
        expect(slug.isUnique).toBe(true);
        expect(visibility.notNull).toBe(true);
        expect(creatorProgramStatus.notNull).toBe(true);
        expect(links.notNull).toBe(true);

        const userForeignKey = getForeignKey(
            communityProfiles,
            'community_profiles_user_id_users_id_fk',
        );

        expect(userForeignKey.onDelete).toBe('cascade');
    });
});

describe('communityPosts schema', () => {
    it('defines the core post contract with author, profile and snapshot-oriented fields', () => {
        expect(communityPosts).toBeDefined();

        const authorId = getColumn(communityPosts, 'author_id');
        const communityProfileId = getColumn(communityPosts, 'community_profile_id');
        const slug = getColumn(communityPosts, 'slug');
        const type = getColumn(communityPosts, 'type');
        const status = getColumn(communityPosts, 'status');
        const visibility = getColumn(communityPosts, 'visibility');
        const title = getColumn(communityPosts, 'title');
        const excerpt = getColumn(communityPosts, 'excerpt');
        const bodyMarkdown = getColumn(communityPosts, 'body_markdown');
        const sourceAnalysisSessionId = getColumn(communityPosts, 'source_analysis_session_id');
        const primaryWeaponId = getColumn(communityPosts, 'primary_weapon_id');
        const primaryPatchVersion = getColumn(communityPosts, 'primary_patch_version');
        const primaryDiagnosisKey = getColumn(communityPosts, 'primary_diagnosis_key');
        const copySensPreset = getColumn(communityPosts, 'copy_sens_preset');

        expect(authorId.notNull).toBe(true);
        expect(communityProfileId.notNull).toBe(true);
        expect(slug.notNull).toBe(true);
        expect(type.notNull).toBe(true);
        expect(status.notNull).toBe(true);
        expect(visibility.notNull).toBe(true);
        expect(title.notNull).toBe(true);
        expect(excerpt.notNull).toBe(true);
        expect(bodyMarkdown.notNull).toBe(true);
        expect(sourceAnalysisSessionId.notNull).toBe(false);
        expect(primaryWeaponId.notNull).toBe(true);
        expect(primaryPatchVersion.notNull).toBe(true);
        expect(primaryDiagnosisKey.notNull).toBe(true);
        expect(copySensPreset.notNull).toBe(true);

        const authorForeignKey = getForeignKey(
            communityPosts,
            'community_posts_author_id_users_id_fk',
        );
        const communityProfileForeignKey = getForeignKey(
            communityPosts,
            'community_posts_community_profile_id_community_profiles_id_fk',
        );
        const analysisSessionForeignKey = getForeignKey(
            communityPosts,
            'community_posts_source_analysis_session_id_analysis_sessions_id_fk',
        );

        expect(authorForeignKey.onDelete).toBe('cascade');
        expect(communityProfileForeignKey.onDelete).toBe('cascade');
        expect(analysisSessionForeignKey.onDelete).toBe('set null');
    });

    it('defines the unique slug index for public routing', () => {
        const slug = getColumn(communityPosts, 'slug');
        const slugIndex = getIndex(communityPosts, 'community_posts_slug_uidx');

        expect(slug.isUnique).toBe(false);
        expect(slugIndex.config.unique).toBe(true);
        expect(slugIndex.config.columns.map((column) => column.name)).toEqual(['slug']);
    });
});

describe('communityPostAnalysisSnapshots schema', () => {
    it('persists the locked snapshot contract with a one-to-one post key', () => {
        expect(communityPostAnalysisSnapshots).toBeDefined();

        const postId = getColumn(communityPostAnalysisSnapshots, 'post_id');
        const analysisSessionId = getColumn(communityPostAnalysisSnapshots, 'analysis_session_id');
        const analysisResultId = getColumn(communityPostAnalysisSnapshots, 'analysis_result_id');
        const analysisTimestamp = getColumn(communityPostAnalysisSnapshots, 'analysis_timestamp');
        const analysisResultSchemaVersion = getColumn(
            communityPostAnalysisSnapshots,
            'analysis_result_schema_version',
        );
        const patchVersion = getColumn(communityPostAnalysisSnapshots, 'patch_version');
        const weaponId = getColumn(communityPostAnalysisSnapshots, 'weapon_id');
        const scopeId = getColumn(communityPostAnalysisSnapshots, 'scope_id');
        const distance = getColumn(communityPostAnalysisSnapshots, 'distance');
        const stance = getColumn(communityPostAnalysisSnapshots, 'stance');
        const attachmentsSnapshot = getColumn(
            communityPostAnalysisSnapshots,
            'attachments_snapshot',
        );
        const metricsSnapshot = getColumn(communityPostAnalysisSnapshots, 'metrics_snapshot');
        const diagnosesSnapshot = getColumn(
            communityPostAnalysisSnapshots,
            'diagnoses_snapshot',
        );
        const coachingSnapshot = getColumn(communityPostAnalysisSnapshots, 'coaching_snapshot');
        const sensSnapshot = getColumn(communityPostAnalysisSnapshots, 'sens_snapshot');
        const trackingSnapshot = getColumn(communityPostAnalysisSnapshots, 'tracking_snapshot');

        expect(postId.primary).toBe(true);
        expect(analysisSessionId.notNull).toBe(true);
        expect(analysisResultId.notNull).toBe(true);
        expect(analysisTimestamp.notNull).toBe(true);
        expect(analysisResultSchemaVersion.notNull).toBe(true);
        expect(patchVersion.notNull).toBe(true);
        expect(weaponId.notNull).toBe(true);
        expect(scopeId.notNull).toBe(true);
        expect(distance.notNull).toBe(true);
        expect(stance.notNull).toBe(true);
        expect(attachmentsSnapshot.notNull).toBe(true);
        expect(metricsSnapshot.notNull).toBe(true);
        expect(diagnosesSnapshot.notNull).toBe(true);
        expect(coachingSnapshot.notNull).toBe(true);
        expect(sensSnapshot.notNull).toBe(true);
        expect(trackingSnapshot.notNull).toBe(true);

        const postForeignKey = getForeignKey(
            communityPostAnalysisSnapshots,
            'community_post_analysis_snapshots_post_id_community_posts_id_fk',
        );
        const analysisSessionForeignKey = getForeignKey(
            communityPostAnalysisSnapshots,
            'community_post_analysis_snapshots_analysis_session_id_analysis_sessions_id_fk',
        );

        expect(postForeignKey.onDelete).toBe('cascade');
        expect(analysisSessionForeignKey.onDelete).toBe('no action');
    });
});

describe('communityPostLikes schema', () => {
    it('defines one like per user/post with cascaded foreign keys', () => {
        const communityPostLikes = getExportedTable('communityPostLikes');

        const postId = getColumn(communityPostLikes, 'post_id');
        const userId = getColumn(communityPostLikes, 'user_id');
        const createdAt = getColumn(communityPostLikes, 'created_at');

        expect(postId.notNull).toBe(true);
        expect(userId.notNull).toBe(true);
        expect(createdAt.notNull).toBe(true);

        const primaryKey = getPrimaryKey(
            communityPostLikes,
            'community_post_likes_post_id_user_id_pk',
        );
        const postForeignKey = getForeignKey(
            communityPostLikes,
            'community_post_likes_post_id_community_posts_id_fk',
        );
        const userForeignKey = getForeignKey(
            communityPostLikes,
            'community_post_likes_user_id_users_id_fk',
        );

        expect(primaryKey.columns.map((column) => column.name)).toEqual(['post_id', 'user_id']);
        expect(postForeignKey.onDelete).toBe('cascade');
        expect(userForeignKey.onDelete).toBe('cascade');
    });
});

describe('communityPostSaves schema', () => {
    it('defines private saves with one save per user/post', () => {
        const communityPostSaves = getExportedTable('communityPostSaves');

        const postId = getColumn(communityPostSaves, 'post_id');
        const userId = getColumn(communityPostSaves, 'user_id');
        const createdAt = getColumn(communityPostSaves, 'created_at');

        expect(postId.notNull).toBe(true);
        expect(userId.notNull).toBe(true);
        expect(createdAt.notNull).toBe(true);

        const primaryKey = getPrimaryKey(
            communityPostSaves,
            'community_post_saves_post_id_user_id_pk',
        );
        const postForeignKey = getForeignKey(
            communityPostSaves,
            'community_post_saves_post_id_community_posts_id_fk',
        );
        const userForeignKey = getForeignKey(
            communityPostSaves,
            'community_post_saves_user_id_users_id_fk',
        );

        expect(primaryKey.columns.map((column) => column.name)).toEqual(['post_id', 'user_id']);
        expect(postForeignKey.onDelete).toBe('cascade');
        expect(userForeignKey.onDelete).toBe('cascade');
    });
});

describe('communityPostComments schema', () => {
    it('defines flat comments with moderation-aware status fields', () => {
        const communityPostComments = getExportedTable('communityPostComments');

        const id = getColumn(communityPostComments, 'id');
        const postId = getColumn(communityPostComments, 'post_id');
        const authorId = getColumn(communityPostComments, 'author_id');
        const status = getColumn(communityPostComments, 'status');
        const bodyMarkdown = getColumn(communityPostComments, 'body_markdown');
        const diagnosisContextKey = getColumn(communityPostComments, 'diagnosis_context_key');
        const createdAt = getColumn(communityPostComments, 'created_at');
        const updatedAt = getColumn(communityPostComments, 'updated_at');

        expect(id.primary).toBe(true);
        expect(postId.notNull).toBe(true);
        expect(authorId.notNull).toBe(true);
        expect(status.notNull).toBe(true);
        expect(status.default).toBe('visible');
        expect(bodyMarkdown.notNull).toBe(true);
        expect(diagnosisContextKey.notNull).toBe(false);
        expect(createdAt.notNull).toBe(true);
        expect(updatedAt.notNull).toBe(true);

        const postForeignKey = getForeignKey(
            communityPostComments,
            'community_post_comments_post_id_community_posts_id_fk',
        );
        const authorForeignKey = getForeignKey(
            communityPostComments,
            'community_post_comments_author_id_users_id_fk',
        );

        expect(postForeignKey.onDelete).toBe('cascade');
        expect(authorForeignKey.onDelete).toBe('cascade');
    });
});

describe('communityFollows schema', () => {
    it('defines one follow edge per follower/followed pair', () => {
        const communityFollows = getExportedTable('communityFollows');

        const followerUserId = getColumn(communityFollows, 'follower_user_id');
        const followedUserId = getColumn(communityFollows, 'followed_user_id');
        const createdAt = getColumn(communityFollows, 'created_at');

        expect(followerUserId.notNull).toBe(true);
        expect(followedUserId.notNull).toBe(true);
        expect(createdAt.notNull).toBe(true);

        const primaryKey = getPrimaryKey(
            communityFollows,
            'community_follows_follower_user_id_followed_user_id_pk',
        );
        const followerForeignKey = getForeignKey(
            communityFollows,
            'community_follows_follower_user_id_users_id_fk',
        );
        const followedForeignKey = getForeignKey(
            communityFollows,
            'community_follows_followed_user_id_users_id_fk',
        );

        expect(primaryKey.columns.map((column) => column.name)).toEqual([
            'follower_user_id',
            'followed_user_id',
        ]);
        expect(followerForeignKey.onDelete).toBe('cascade');
        expect(followedForeignKey.onDelete).toBe('cascade');
    });
});

describe('community squad invites schema', () => {
    it('defines invite lifecycle fields for pending, accepted, revoked, and expired squad joins', () => {
        const communitySquadInvites = getExportedTable('communitySquadInvites');

        const id = getColumn(communitySquadInvites, 'id');
        const squadId = getColumn(communitySquadInvites, 'squad_id');
        const createdByUserId = getColumn(communitySquadInvites, 'created_by_user_id');
        const invitedUserId = getColumn(communitySquadInvites, 'invited_user_id');
        const acceptedByUserId = getColumn(communitySquadInvites, 'accepted_by_user_id');
        const inviteCode = getColumn(communitySquadInvites, 'invite_code');
        const status = getColumn(communitySquadInvites, 'status');
        const expiresAt = getColumn(communitySquadInvites, 'expires_at');
        const acceptedAt = getColumn(communitySquadInvites, 'accepted_at');
        const revokedAt = getColumn(communitySquadInvites, 'revoked_at');

        expect(id.primary).toBe(true);
        expect(squadId.notNull).toBe(true);
        expect(createdByUserId.notNull).toBe(true);
        expect(invitedUserId.notNull).toBe(false);
        expect(acceptedByUserId.notNull).toBe(false);
        expect(inviteCode.notNull).toBe(true);
        expect(status.notNull).toBe(true);
        expect(status.default).toBe('pending');
        expect(expiresAt.notNull).toBe(true);
        expect(acceptedAt.notNull).toBe(false);
        expect(revokedAt.notNull).toBe(false);

        const squadForeignKey = getForeignKey(
            communitySquadInvites,
            'community_squad_invites_squad_id_community_squads_id_fk',
        );
        const createdByForeignKey = getForeignKey(
            communitySquadInvites,
            'community_squad_invites_created_by_user_id_users_id_fk',
        );
        const invitedUserForeignKey = getForeignKey(
            communitySquadInvites,
            'community_squad_invites_invited_user_id_users_id_fk',
        );
        const acceptedByForeignKey = getForeignKey(
            communitySquadInvites,
            'community_squad_invites_accepted_by_user_id_users_id_fk',
        );
        const inviteCodeIndex = getIndex(
            communitySquadInvites,
            'community_squad_invites_code_uidx',
        );

        expect(squadForeignKey.onDelete).toBe('cascade');
        expect(createdByForeignKey.onDelete).toBe('cascade');
        expect(invitedUserForeignKey.onDelete).toBe('set null');
        expect(acceptedByForeignKey.onDelete).toBe('set null');
        expect(inviteCodeIndex.config.unique).toBe(true);
        expect(inviteCodeIndex.config.columns.map((column) => column.name)).toEqual([
            'invite_code',
        ]);
    });
});

describe('communityReports schema', () => {
    it('defines report lifecycle fields with reviewer traceability', () => {
        const communityReports = getExportedTable('communityReports');

        const id = getColumn(communityReports, 'id');
        const entityType = getColumn(communityReports, 'entity_type');
        const entityId = getColumn(communityReports, 'entity_id');
        const reportedByUserId = getColumn(communityReports, 'reported_by_user_id');
        const reasonKey = getColumn(communityReports, 'reason_key');
        const details = getColumn(communityReports, 'details');
        const status = getColumn(communityReports, 'status');
        const createdAt = getColumn(communityReports, 'created_at');
        const reviewedAt = getColumn(communityReports, 'reviewed_at');
        const reviewedByUserId = getColumn(communityReports, 'reviewed_by_user_id');

        expect(id.primary).toBe(true);
        expect(entityType.notNull).toBe(true);
        expect(entityId.notNull).toBe(true);
        expect(reportedByUserId.notNull).toBe(true);
        expect(reasonKey.notNull).toBe(true);
        expect(details.notNull).toBe(false);
        expect(status.notNull).toBe(true);
        expect(status.default).toBe('open');
        expect(createdAt.notNull).toBe(true);
        expect(reviewedAt.notNull).toBe(false);
        expect(reviewedByUserId.notNull).toBe(false);

        const reporterForeignKey = getForeignKey(
            communityReports,
            'community_reports_reported_by_user_id_users_id_fk',
        );
        const reviewerForeignKey = getForeignKey(
            communityReports,
            'community_reports_reviewed_by_user_id_users_id_fk',
        );

        expect(reporterForeignKey.onDelete).toBe('no action');
        expect(reviewerForeignKey.onDelete).toBe('set null');
    });
});

describe('communityModerationActions schema', () => {
    it('defines an auditable moderation trail per entity/action', () => {
        const communityModerationActions = getExportedTable('communityModerationActions');

        const id = getColumn(communityModerationActions, 'id');
        const entityType = getColumn(communityModerationActions, 'entity_type');
        const entityId = getColumn(communityModerationActions, 'entity_id');
        const actionKey = getColumn(communityModerationActions, 'action_key');
        const actorUserId = getColumn(communityModerationActions, 'actor_user_id');
        const notes = getColumn(communityModerationActions, 'notes');
        const metadata = getColumn(communityModerationActions, 'metadata');
        const createdAt = getColumn(communityModerationActions, 'created_at');

        expect(id.primary).toBe(true);
        expect(entityType.notNull).toBe(true);
        expect(entityId.notNull).toBe(true);
        expect(actionKey.notNull).toBe(true);
        expect(actorUserId.notNull).toBe(true);
        expect(notes.notNull).toBe(false);
        expect(metadata.notNull).toBe(true);
        expect(metadata.default).toBe('{}');
        expect(createdAt.notNull).toBe(true);

        const actorForeignKey = getForeignKey(
            communityModerationActions,
            'community_moderation_actions_actor_user_id_users_id_fk',
        );

        expect(actorForeignKey.onDelete).toBe('no action');
    });
});

describe('communityPostCopyEvents schema', () => {
    it('defines copy event tracking with a nullable actor and copy target contract', () => {
        const communityPostCopyEvents = getExportedTable('communityPostCopyEvents');

        const id = getColumn(communityPostCopyEvents, 'id');
        const postId = getColumn(communityPostCopyEvents, 'post_id');
        const copiedByUserId = getColumn(communityPostCopyEvents, 'copied_by_user_id');
        const copyTarget = getColumn(communityPostCopyEvents, 'copy_target');
        const createdAt = getColumn(communityPostCopyEvents, 'created_at');

        expect(id.primary).toBe(true);
        expect(postId.notNull).toBe(true);
        expect(copiedByUserId.notNull).toBe(false);
        expect(copyTarget.notNull).toBe(true);
        expect(createdAt.notNull).toBe(true);

        const postForeignKey = getForeignKey(
            communityPostCopyEvents,
            'community_post_copy_events_post_id_community_posts_id_fk',
        );
        const copiedByUserForeignKey = getForeignKey(
            communityPostCopyEvents,
            'community_post_copy_events_copied_by_user_id_users_id_fk',
        );

        expect(postForeignKey.onDelete).toBe('cascade');
        expect(copiedByUserForeignKey.onDelete).toBe('set null');
    });
});

describe('featureEntitlements schema', () => {
    it('defines an inactive-by-default feature entitlement catalog', () => {
        const featureEntitlements = getExportedTable('featureEntitlements');

        const key = getColumn(featureEntitlements, 'key');
        const description = getColumn(featureEntitlements, 'description');
        const status = getColumn(featureEntitlements, 'status');
        const createdAt = getColumn(featureEntitlements, 'created_at');

        expect(key.primary).toBe(true);
        expect(description.notNull).toBe(true);
        expect(status.notNull).toBe(true);
        expect(status.default).toBe('inactive');
        expect(createdAt.notNull).toBe(true);
    });
});

describe('userEntitlements schema', () => {
    it('defines user-to-entitlement assignments without enabling premium by default', () => {
        const userEntitlements = getExportedTable('userEntitlements');

        const userId = getColumn(userEntitlements, 'user_id');
        const entitlementKey = getColumn(userEntitlements, 'entitlement_key');
        const source = getColumn(userEntitlements, 'source');
        const expiresAt = getColumn(userEntitlements, 'expires_at');
        const createdAt = getColumn(userEntitlements, 'created_at');

        expect(userId.notNull).toBe(true);
        expect(entitlementKey.notNull).toBe(true);
        expect(source.notNull).toBe(true);
        expect(expiresAt.notNull).toBe(false);
        expect(createdAt.notNull).toBe(true);

        const primaryKey = getPrimaryKey(
            userEntitlements,
            'user_entitlements_user_id_entitlement_key_pk',
        );
        const userForeignKey = getForeignKey(
            userEntitlements,
            'user_entitlements_user_id_users_id_fk',
        );
        const entitlementForeignKey = getForeignKey(
            userEntitlements,
            'user_entitlements_entitlement_key_feature_entitlements_key_fk',
        );

        expect(primaryKey.columns.map((column) => column.name)).toEqual([
            'user_id',
            'entitlement_key',
        ]);
        expect(userForeignKey.onDelete).toBe('cascade');
        expect(entitlementForeignKey.onDelete).toBe('no action');
    });
});

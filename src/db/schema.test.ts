import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
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

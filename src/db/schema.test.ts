import { readFileSync } from 'node:fs';

import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import * as dbSchema from './schema';
import {
    analysisSessions,
    coachProtocolOutcomes,
    completeTrainingProtocolRevisions,
    communityPostAnalysisSnapshots,
    communityPosts,
    communityProfiles,
    precisionCheckpoints,
    precisionEvolutionLines,
    trainingProtocolTransferRecords,
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

function expectColumnMissing(table: Parameters<typeof getTableConfig>[0], name: string) {
    const column = getTableConfig(table).columns.find((candidate) => candidate.name === name);

    expect(column, `expected column ${name} to stay absent from ${getTableConfig(table).name}`).toBeUndefined();
}

describe('analysisSessions schema', () => {
    it('defines a dedicated patch_version column for patch-aware queries', () => {
        expect(analysisSessions.patchVersion).toBeDefined();
        expect(analysisSessions.patchVersion.name).toBe('patch_version');
    });
});

describe('precision evolution schema', () => {
    it('defines active precision lines keyed by user and strict compatibility context', () => {
        expect(precisionEvolutionLines).toBeDefined();

        const id = getColumn(precisionEvolutionLines, 'id');
        const userId = getColumn(precisionEvolutionLines, 'user_id');
        const compatibilityKey = getColumn(precisionEvolutionLines, 'compatibility_key');
        const status = getColumn(precisionEvolutionLines, 'status');
        const variableInTest = getColumn(precisionEvolutionLines, 'variable_in_test');
        const baselineSessionId = getColumn(precisionEvolutionLines, 'baseline_session_id');
        const currentSessionId = getColumn(precisionEvolutionLines, 'current_session_id');
        const validClipCount = getColumn(precisionEvolutionLines, 'valid_clip_count');
        const blockedClipCount = getColumn(precisionEvolutionLines, 'blocked_clip_count');
        const payload = getColumn(precisionEvolutionLines, 'payload');
        const updatedAt = getColumn(precisionEvolutionLines, 'updated_at');

        expect(id.primary).toBe(true);
        expect(userId.notNull).toBe(true);
        expect(compatibilityKey.notNull).toBe(true);
        expect(status.notNull).toBe(true);
        expect(variableInTest.notNull).toBe(true);
        expect(baselineSessionId.notNull).toBe(false);
        expect(currentSessionId.notNull).toBe(false);
        expect(validClipCount.notNull).toBe(true);
        expect(validClipCount.default).toBe(0);
        expect(blockedClipCount.notNull).toBe(true);
        expect(blockedClipCount.default).toBe(0);
        expect(payload.notNull).toBe(true);
        expect(payload.default).toBe('{}');
        expect(updatedAt.notNull).toBe(true);

        const userForeignKey = getForeignKey(
            precisionEvolutionLines,
            'precision_evolution_lines_user_id_users_id_fk',
        );
        const baselineForeignKey = getForeignKey(
            precisionEvolutionLines,
            'precision_evolution_lines_baseline_session_id_analysis_sessions_id_fk',
        );
        const currentForeignKey = getForeignKey(
            precisionEvolutionLines,
            'precision_evolution_lines_current_session_id_analysis_sessions_id_fk',
        );
        const activeLineIndex = getIndex(
            precisionEvolutionLines,
            'precision_evolution_lines_user_key_uidx',
        );

        expect(userForeignKey.onDelete).toBe('cascade');
        expect(baselineForeignKey.onDelete).toBe('set null');
        expect(currentForeignKey.onDelete).toBe('set null');
        expect(activeLineIndex.config.unique).toBe(true);
        expect(activeLineIndex.config.columns.map((column) => column.name)).toEqual([
            'user_id',
            'compatibility_key',
        ]);
    });

    it('defines precision checkpoints with line and analysis-session indexes', () => {
        expect(precisionCheckpoints).toBeDefined();

        const id = getColumn(precisionCheckpoints, 'id');
        const lineId = getColumn(precisionCheckpoints, 'line_id');
        const analysisSessionId = getColumn(precisionCheckpoints, 'analysis_session_id');
        const state = getColumn(precisionCheckpoints, 'state');
        const variableInTest = getColumn(precisionCheckpoints, 'variable_in_test');
        const payload = getColumn(precisionCheckpoints, 'payload');
        const createdAt = getColumn(precisionCheckpoints, 'created_at');

        expect(id.primary).toBe(true);
        expect(lineId.notNull).toBe(true);
        expect(analysisSessionId.notNull).toBe(false);
        expect(state.notNull).toBe(true);
        expect(variableInTest.notNull).toBe(true);
        expect(payload.notNull).toBe(true);
        expect(payload.default).toBe('{}');
        expect(createdAt.notNull).toBe(true);

        const lineForeignKey = getForeignKey(
            precisionCheckpoints,
            'precision_checkpoints_line_id_precision_evolution_lines_id_fk',
        );
        const sessionForeignKey = getForeignKey(
            precisionCheckpoints,
            'precision_checkpoints_analysis_session_id_analysis_sessions_id_fk',
        );
        const lineIndex = getIndex(precisionCheckpoints, 'precision_checkpoints_line_created_idx');
        const sessionIndex = getIndex(precisionCheckpoints, 'precision_checkpoints_session_idx');

        expect(lineForeignKey.onDelete).toBe('cascade');
        expect(sessionForeignKey.onDelete).toBe('set null');
        expect(lineIndex.config.columns.map((column) => column.name)).toEqual(['line_id', 'created_at']);
        expect(sessionIndex.config.columns.map((column) => column.name)).toEqual(['analysis_session_id']);
    });
});

describe('coach protocol outcome schema', () => {
    it('defines normalized protocol outcomes with user and session ownership', () => {
        expect(coachProtocolOutcomes).toBeDefined();

        const id = getColumn(coachProtocolOutcomes, 'id');
        const userId = getColumn(coachProtocolOutcomes, 'user_id');
        const analysisSessionId = getColumn(coachProtocolOutcomes, 'analysis_session_id');
        const coachPlanId = getColumn(coachProtocolOutcomes, 'coach_plan_id');
        const protocolId = getColumn(coachProtocolOutcomes, 'protocol_id');
        const focusArea = getColumn(coachProtocolOutcomes, 'focus_area');
        const status = getColumn(coachProtocolOutcomes, 'status');
        const reasonCodes = getColumn(coachProtocolOutcomes, 'reason_codes');
        const note = getColumn(coachProtocolOutcomes, 'note');
        const revisionOfId = getColumn(coachProtocolOutcomes, 'revision_of_id');
        const evidenceStrength = getColumn(coachProtocolOutcomes, 'evidence_strength');
        const conflictPayload = getColumn(coachProtocolOutcomes, 'conflict_payload');
        const payload = getColumn(coachProtocolOutcomes, 'payload');
        const createdAt = getColumn(coachProtocolOutcomes, 'created_at');
        const updatedAt = getColumn(coachProtocolOutcomes, 'updated_at');

        expect(id.primary).toBe(true);
        expect(userId.notNull).toBe(true);
        expect(analysisSessionId.notNull).toBe(true);
        expect(coachPlanId.notNull).toBe(true);
        expect(protocolId.notNull).toBe(true);
        expect(focusArea.notNull).toBe(true);
        expect(status.notNull).toBe(true);
        expect(reasonCodes.notNull).toBe(true);
        expect(reasonCodes.default).toBe('[]');
        expect(note.notNull).toBe(false);
        expect(revisionOfId.notNull).toBe(false);
        expect(evidenceStrength.notNull).toBe(true);
        expect(conflictPayload.notNull).toBe(false);
        expect(payload.notNull).toBe(true);
        expect(payload.default).toBe('{}');
        expect(createdAt.notNull).toBe(true);
        expect(updatedAt.notNull).toBe(true);

        const userForeignKey = getForeignKey(
            coachProtocolOutcomes,
            'coach_protocol_outcomes_user_id_users_id_fk',
        );
        const sessionForeignKey = getForeignKey(
            coachProtocolOutcomes,
            'coach_protocol_outcomes_analysis_session_id_analysis_sessions_id_fk',
        );

        expect(userForeignKey.onDelete).toBe('cascade');
        expect(sessionForeignKey.onDelete).toBe('cascade');
    });

    it('indexes dashboard pending loops, history audit, protocol memory, and revisions', () => {
        const userStatusIndex = getIndex(
            coachProtocolOutcomes,
            'coach_protocol_outcomes_user_status_updated_idx',
        );
        const sessionIndex = getIndex(
            coachProtocolOutcomes,
            'coach_protocol_outcomes_session_created_idx',
        );
        const protocolIndex = getIndex(
            coachProtocolOutcomes,
            'coach_protocol_outcomes_user_protocol_idx',
        );
        const revisionIndex = getIndex(
            coachProtocolOutcomes,
            'coach_protocol_outcomes_revision_idx',
        );

        expect(userStatusIndex.config.columns.map((column) => column.name)).toEqual([
            'user_id',
            'status',
            'updated_at',
        ]);
        expect(sessionIndex.config.columns.map((column) => column.name)).toEqual([
            'analysis_session_id',
            'created_at',
        ]);
        expect(protocolIndex.config.columns.map((column) => column.name)).toEqual([
            'user_id',
            'protocol_id',
        ]);
        expect(revisionIndex.config.columns.map((column) => column.name)).toEqual([
            'revision_of_id',
        ]);
    });
});

describe('complete training protocol schema', () => {
    it('defines auditable protocol revision rows with old and revised snapshots', () => {
        expect(completeTrainingProtocolRevisions).toBeDefined();

        const id = getColumn(completeTrainingProtocolRevisions, 'id');
        const userId = getColumn(completeTrainingProtocolRevisions, 'user_id');
        const analysisSessionId = getColumn(completeTrainingProtocolRevisions, 'analysis_session_id');
        const coachPlanId = getColumn(completeTrainingProtocolRevisions, 'coach_plan_id');
        const protocolId = getColumn(completeTrainingProtocolRevisions, 'protocol_id');
        const revisionReason = getColumn(completeTrainingProtocolRevisions, 'revision_reason');
        const tierDirection = getColumn(completeTrainingProtocolRevisions, 'tier_direction');
        const changedFields = getColumn(completeTrainingProtocolRevisions, 'changed_fields');
        const previousProtocol = getColumn(completeTrainingProtocolRevisions, 'previous_protocol');
        const revisedProtocol = getColumn(completeTrainingProtocolRevisions, 'revised_protocol');
        const evidencePayload = getColumn(completeTrainingProtocolRevisions, 'evidence_payload');

        expect(id.primary).toBe(true);
        expect(userId.notNull).toBe(true);
        expect(analysisSessionId.notNull).toBe(true);
        expect(coachPlanId.notNull).toBe(true);
        expect(protocolId.notNull).toBe(true);
        expect(revisionReason.notNull).toBe(true);
        expect(tierDirection.notNull).toBe(true);
        expect(changedFields.notNull).toBe(true);
        expect(previousProtocol.notNull).toBe(true);
        expect(revisedProtocol.notNull).toBe(true);
        expect(evidencePayload.notNull).toBe(true);

        expect(getIndex(
            completeTrainingProtocolRevisions,
            'complete_training_protocol_revisions_user_session_idx',
        ).config.columns.map((column) => column.name)).toEqual(['user_id', 'analysis_session_id']);
        expect(getIndex(
            completeTrainingProtocolRevisions,
            'complete_training_protocol_revisions_protocol_idx',
        ).config.columns.map((column) => column.name)).toEqual(['protocol_id']);
    });

    it('defines conservative real-match transfer records that never replace technical validation', () => {
        expect(trainingProtocolTransferRecords).toBeDefined();

        const id = getColumn(trainingProtocolTransferRecords, 'id');
        const userId = getColumn(trainingProtocolTransferRecords, 'user_id');
        const analysisSessionId = getColumn(trainingProtocolTransferRecords, 'analysis_session_id');
        const protocolId = getColumn(trainingProtocolTransferRecords, 'protocol_id');
        const situation = getColumn(trainingProtocolTransferRecords, 'situation');
        const pressureLevel = getColumn(trainingProtocolTransferRecords, 'pressure_level');
        const feltControl = getColumn(trainingProtocolTransferRecords, 'felt_control');
        const result = getColumn(trainingProtocolTransferRecords, 'result');
        const countsAsTechnicalValidation = getColumn(trainingProtocolTransferRecords, 'counts_as_technical_validation');

        expect(id.primary).toBe(true);
        expect(userId.notNull).toBe(true);
        expect(analysisSessionId.notNull).toBe(true);
        expect(protocolId.notNull).toBe(true);
        expect(situation.notNull).toBe(true);
        expect(pressureLevel.notNull).toBe(true);
        expect(feltControl.notNull).toBe(true);
        expect(result.notNull).toBe(true);
        expect(countsAsTechnicalValidation.notNull).toBe(true);
        expect(countsAsTechnicalValidation.default).toBe(false);

        expect(getIndex(
            trainingProtocolTransferRecords,
            'training_protocol_transfer_records_user_session_idx',
        ).config.columns.map((column) => column.name)).toEqual(['user_id', 'analysis_session_id']);
        expect(getIndex(
            trainingProtocolTransferRecords,
            'training_protocol_transfer_records_protocol_idx',
        ).config.columns.map((column) => column.name)).toEqual(['protocol_id']);
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

describe('product monetization schema', () => {
    it('defines a separate product entitlement catalog instead of reusing community keys blindly', () => {
        const table = getExportedTable('productFeatureEntitlements');

        const key = getColumn(table, 'key');
        const status = getColumn(table, 'status');
        const tier = getColumn(table, 'tier');
        const surface = getColumn(table, 'surface');
        const labelKey = getColumn(table, 'label_key');
        const internalDescription = getColumn(table, 'internal_description');
        const gatingMode = getColumn(table, 'gating_mode');

        expect(key.primary).toBe(true);
        expect(status.notNull).toBe(true);
        expect(status.default).toBe('active');
        expect(tier.notNull).toBe(true);
        expect(surface.notNull).toBe(true);
        expect(labelKey.notNull).toBe(true);
        expect(internalDescription.notNull).toBe(true);
        expect(gatingMode.notNull).toBe(true);
    });

    it('defines checkout attempts with session and idempotency uniqueness', () => {
        const table = getExportedTable('productCheckoutAttempts');

        const userId = getColumn(table, 'user_id');
        const internalPriceKey = getColumn(table, 'internal_price_key');
        const stripeCheckoutSessionId = getColumn(table, 'stripe_checkout_session_id');
        const idempotencyKey = getColumn(table, 'idempotency_key');
        const metadata = getColumn(table, 'metadata');

        expect(userId.notNull).toBe(true);
        expect(internalPriceKey.notNull).toBe(true);
        expect(stripeCheckoutSessionId.notNull).toBe(false);
        expect(idempotencyKey.notNull).toBe(true);
        expect(metadata.default).toBe('{}');

        const userForeignKey = getForeignKey(
            table,
            'product_checkout_attempts_user_id_users_id_fk',
        );
        const sessionIndex = getIndex(table, 'product_checkout_attempts_session_uidx');
        const idempotencyIndex = getIndex(table, 'product_checkout_attempts_idempotency_uidx');

        expect(userForeignKey.onDelete).toBe('cascade');
        expect(sessionIndex.config.unique).toBe(true);
        expect(idempotencyIndex.config.unique).toBe(true);
    });

    it('defines subscription truth with Stripe subscription uniqueness and lifecycle fields', () => {
        const table = getExportedTable('productSubscriptions');

        const userId = getColumn(table, 'user_id');
        const stripeCustomerId = getColumn(table, 'stripe_customer_id');
        const stripeSubscriptionId = getColumn(table, 'stripe_subscription_id');
        const billingStatus = getColumn(table, 'billing_status');
        const accessState = getColumn(table, 'access_state');
        const currentPeriodEnd = getColumn(table, 'current_period_end');
        const graceEndsAt = getColumn(table, 'grace_ends_at');
        const suspendedAt = getColumn(table, 'suspended_at');

        expect(userId.notNull).toBe(true);
        expect(stripeCustomerId.notNull).toBe(true);
        expect(stripeSubscriptionId.notNull).toBe(true);
        expect(billingStatus.notNull).toBe(true);
        expect(accessState.notNull).toBe(true);
        expect(currentPeriodEnd.notNull).toBe(false);
        expect(graceEndsAt.notNull).toBe(false);
        expect(suspendedAt.notNull).toBe(false);

        const subscriptionIndex = getIndex(table, 'product_subscriptions_subscription_uidx');
        const statusIndex = getIndex(table, 'product_subscriptions_user_status_idx');

        expect(subscriptionIndex.config.unique).toBe(true);
        expect(statusIndex.config.columns.map((column) => column.name)).toEqual([
            'user_id',
            'billing_status',
        ]);
    });

    it('defines processed Stripe events with unique event IDs and processing status', () => {
        const table = getExportedTable('processedStripeEvents');

        const stripeEventId = getColumn(table, 'stripe_event_id');
        const processingStatus = getColumn(table, 'processing_status');
        const checkoutAttemptId = getColumn(table, 'checkout_attempt_id');
        const subscriptionId = getColumn(table, 'subscription_id');
        const payloadHash = getColumn(table, 'payload_hash');

        expect(stripeEventId.notNull).toBe(true);
        expect(processingStatus.notNull).toBe(true);
        expect(processingStatus.default).toBe('received');
        expect(checkoutAttemptId.notNull).toBe(false);
        expect(subscriptionId.notNull).toBe(false);
        expect(payloadHash.notNull).toBe(false);

        const eventIndex = getIndex(table, 'processed_stripe_events_event_uidx');
        expect(eventIndex.config.unique).toBe(true);
    });

    it('defines product grants with actor, timing, quota boost, and audit metadata', () => {
        const table = getExportedTable('productUserGrants');

        const userId = getColumn(table, 'user_id');
        const entitlementKey = getColumn(table, 'entitlement_key');
        const quotaBoost = getColumn(table, 'quota_boost');
        const actorUserId = getColumn(table, 'actor_user_id');
        const auditMetadata = getColumn(table, 'audit_metadata');
        const startsAt = getColumn(table, 'starts_at');
        const endsAt = getColumn(table, 'ends_at');

        expect(userId.notNull).toBe(true);
        expect(entitlementKey.notNull).toBe(true);
        expect(quotaBoost.default).toBe(0);
        expect(actorUserId.notNull).toBe(false);
        expect(auditMetadata.default).toBe('{}');
        expect(startsAt.notNull).toBe(true);
        expect(endsAt.notNull).toBe(false);

        const entitlementForeignKey = getForeignKey(
            table,
            'product_user_grants_entitlement_key_product_feature_entitlements_key_fk',
        );
        const statusIndex = getIndex(table, 'product_user_grants_user_status_idx');

        expect(entitlementForeignKey.onDelete).toBe('no action');
        expect(statusIndex.config.columns.map((column) => column.name)).toEqual([
            'user_id',
            'status',
        ]);
    });

    it('defines an auditable quota ledger with attempt and idempotency keys', () => {
        const table = getExportedTable('productQuotaLedger');

        const userId = getColumn(table, 'user_id');
        const analysisSessionId = getColumn(table, 'analysis_session_id');
        const analysisSaveAttemptId = getColumn(table, 'analysis_save_attempt_id');
        const idempotencyKey = getColumn(table, 'idempotency_key');
        const state = getColumn(table, 'state');
        const reasonCode = getColumn(table, 'reason_code');
        const periodStart = getColumn(table, 'period_start');
        const periodEnd = getColumn(table, 'period_end');

        expect(userId.notNull).toBe(true);
        expect(analysisSessionId.notNull).toBe(false);
        expect(analysisSaveAttemptId.notNull).toBe(true);
        expect(idempotencyKey.notNull).toBe(true);
        expect(state.notNull).toBe(true);
        expect(reasonCode.notNull).toBe(true);
        expect(periodStart.notNull).toBe(true);
        expect(periodEnd.notNull).toBe(true);

        const idempotencyIndex = getIndex(table, 'product_quota_ledger_idempotency_uidx');
        const attemptIndex = getIndex(table, 'product_quota_ledger_attempt_idx');

        expect(idempotencyIndex.config.unique).toBe(true);
        expect(attemptIndex.config.columns.map((column) => column.name)).toEqual([
            'analysis_save_attempt_id',
        ]);
    });

    it('defines privacy-minimal analytics events without storing private clip or payment payloads', () => {
        const table = getExportedTable('monetizationAnalyticsEvents');

        const eventType = getColumn(table, 'event_type');
        const userId = getColumn(table, 'user_id');
        const surface = getColumn(table, 'surface');
        const featureKey = getColumn(table, 'feature_key');
        const accessState = getColumn(table, 'access_state');
        const quotaState = getColumn(table, 'quota_state');
        const priceKey = getColumn(table, 'price_key');
        const billingStatus = getColumn(table, 'billing_status');
        const metadata = getColumn(table, 'metadata');

        expect(eventType.notNull).toBe(true);
        expect(userId.notNull).toBe(false);
        expect(surface.notNull).toBe(false);
        expect(featureKey.notNull).toBe(false);
        expect(accessState.notNull).toBe(false);
        expect(quotaState.notNull).toBe(false);
        expect(priceKey.notNull).toBe(false);
        expect(billingStatus.notNull).toBe(false);
        expect(metadata.default).toBe('{}');
    });

    it('defines monetization flags and support/billing audit surfaces', () => {
        const flags = getExportedTable('monetizationFlags');
        const supportNotes = getExportedTable('productSupportNotes');
        const billingEvents = getExportedTable('productBillingEvents');

        expect(getColumn(flags, 'key').primary).toBe(true);
        expect(getColumn(flags, 'enabled').default).toBe(false);
        expect(getColumn(flags, 'updated_by_user_id').notNull).toBe(false);

        expect(getColumn(supportNotes, 'user_id').notNull).toBe(true);
        expect(getColumn(supportNotes, 'actor_user_id').notNull).toBe(true);
        expect(getColumn(supportNotes, 'note').notNull).toBe(true);

        expect(getColumn(billingEvents, 'event_type').notNull).toBe(true);
        expect(getColumn(billingEvents, 'target_type').notNull).toBe(true);
        expect(getColumn(billingEvents, 'metadata').default).toBe('{}');
    });
});

describe('social pro persistence schema', () => {
    it('defines public-safe report rows with owned source evidence references', () => {
        const reports = getExportedTable('socialProReports');

        const id = getColumn(reports, 'id');
        const ownerUserId = getColumn(reports, 'owner_user_id');
        const communityProfileId = getColumn(reports, 'community_profile_id');
        const publicSlug = getColumn(reports, 'public_slug');
        const visibility = getColumn(reports, 'visibility');
        const status = getColumn(reports, 'status');
        const title = getColumn(reports, 'title');
        const publicSafeSnapshot = getColumn(reports, 'public_safe_snapshot');
        const sourceAnalysisSessionId = getColumn(reports, 'source_analysis_session_id');
        const sourceHistorySessionId = getColumn(reports, 'source_history_session_id');
        const sourceProtocolRevisionId = getColumn(reports, 'source_protocol_revision_id');
        const sourceSprayLabSessionId = getColumn(reports, 'source_spray_lab_session_id');
        const sourceTrainingProgramCycleId = getColumn(reports, 'source_training_program_cycle_id');
        const sourceValidationLinkId = getColumn(reports, 'source_validation_link_id');
        const payload = getColumn(reports, 'payload');
        const createdAt = getColumn(reports, 'created_at');
        const updatedAt = getColumn(reports, 'updated_at');

        expect(id.primary).toBe(true);
        expect(ownerUserId.notNull).toBe(true);
        expect(communityProfileId.notNull).toBe(false);
        expect(publicSlug.notNull).toBe(false);
        expect(visibility.notNull).toBe(true);
        expect(visibility.default).toBe('link_private');
        expect(status.notNull).toBe(true);
        expect(status.default).toBe('draft');
        expect(title.notNull).toBe(true);
        expect(publicSafeSnapshot.notNull).toBe(true);
        expect(sourceAnalysisSessionId.notNull).toBe(false);
        expect(sourceHistorySessionId.notNull).toBe(false);
        expect(sourceProtocolRevisionId.notNull).toBe(false);
        expect(sourceSprayLabSessionId.notNull).toBe(false);
        expect(sourceTrainingProgramCycleId.notNull).toBe(false);
        expect(sourceValidationLinkId.notNull).toBe(false);
        expect(payload.notNull).toBe(true);
        expect(payload.default).toBe('{}');
        expect(createdAt.notNull).toBe(true);
        expect(updatedAt.notNull).toBe(true);

        expect(getForeignKey(
            reports,
            'social_pro_reports_owner_user_id_users_id_fk',
        ).onDelete).toBe('cascade');
        expect(getForeignKey(
            reports,
            'social_pro_reports_community_profile_id_community_profiles_id_fk',
        ).onDelete).toBe('set null');
        expect(getForeignKey(
            reports,
            'social_pro_reports_source_analysis_session_id_analysis_sessions_id_fk',
        ).onDelete).toBe('set null');
        expect(getForeignKey(
            reports,
            'social_pro_reports_source_history_session_id_analysis_sessions_id_fk',
        ).onDelete).toBe('set null');
        expect(getForeignKey(
            reports,
            'social_pro_reports_source_protocol_revision_id_complete_training_protocol_revisions_id_fk',
        ).onDelete).toBe('set null');
        expect(getForeignKey(
            reports,
            'social_pro_reports_source_spray_lab_session_id_spray_lab_sessions_id_fk',
        ).onDelete).toBe('set null');
        expect(getForeignKey(
            reports,
            'social_pro_reports_source_training_program_cycle_id_training_program_cycles_id_fk',
        ).onDelete).toBe('set null');
        expect(getForeignKey(
            reports,
            'social_pro_reports_source_validation_link_id_spray_lab_validation_links_id_fk',
        ).onDelete).toBe('set null');

        expect(getIndex(reports, 'social_pro_reports_public_slug_uidx').config.unique).toBe(true);
        expect(getIndex(reports, 'social_pro_reports_owner_status_updated_idx').config.columns.map((column) => column.name)).toEqual([
            'owner_user_id',
            'status',
            'updated_at',
        ]);
        expect(getIndex(reports, 'social_pro_reports_visibility_status_idx').config.columns.map((column) => column.name)).toEqual([
            'visibility',
            'status',
        ]);
        expect(getIndex(reports, 'social_pro_reports_source_analysis_idx').config.columns.map((column) => column.name)).toEqual([
            'source_analysis_session_id',
        ]);

        for (const unsafeColumn of [
            'raw_private_video',
            'payment_state',
            'private_readers',
            'internal_notes',
            'private_collection_contents',
        ]) {
            expectColumnMissing(reports, unsafeColumn);
        }
    });

    it('defines revocable private report links without private reader logging', () => {
        const links = getExportedTable('socialProReportLinks');

        const reportId = getColumn(links, 'report_id');
        const ownerUserId = getColumn(links, 'owner_user_id');
        const tokenVerifierHash = getColumn(links, 'token_verifier_hash');
        const tokenVerifierPrefix = getColumn(links, 'token_verifier_prefix');
        const status = getColumn(links, 'status');
        const regeneratedFromLinkId = getColumn(links, 'regenerated_from_link_id');
        const revokedByUserId = getColumn(links, 'revoked_by_user_id');
        const revokedAt = getColumn(links, 'revoked_at');
        const expiresAt = getColumn(links, 'expires_at');
        const lastRegeneratedAt = getColumn(links, 'last_regenerated_at');

        expect(reportId.notNull).toBe(true);
        expect(ownerUserId.notNull).toBe(true);
        expect(tokenVerifierHash.notNull).toBe(true);
        expect(tokenVerifierPrefix.notNull).toBe(true);
        expect(status.notNull).toBe(true);
        expect(status.default).toBe('active');
        expect(regeneratedFromLinkId.notNull).toBe(false);
        expect(revokedByUserId.notNull).toBe(false);
        expect(revokedAt.notNull).toBe(false);
        expect(expiresAt.notNull).toBe(false);
        expect(lastRegeneratedAt.notNull).toBe(false);

        expect(getForeignKey(links, 'social_pro_report_links_report_id_social_pro_reports_id_fk').onDelete).toBe('cascade');
        expect(getForeignKey(links, 'social_pro_report_links_owner_user_id_users_id_fk').onDelete).toBe('cascade');
        expect(getForeignKey(
            links,
            'social_pro_report_links_regenerated_from_link_id_social_pro_report_links_id_fk',
        ).onDelete).toBe('set null');
        expect(getForeignKey(links, 'social_pro_report_links_revoked_by_user_id_users_id_fk').onDelete).toBe('set null');

        expect(getIndex(links, 'social_pro_report_links_token_hash_uidx').config.unique).toBe(true);
        expect(getIndex(links, 'social_pro_report_links_report_status_idx').config.columns.map((column) => column.name)).toEqual([
            'report_id',
            'status',
        ]);
        expect(getIndex(links, 'social_pro_report_links_owner_status_idx').config.columns.map((column) => column.name)).toEqual([
            'owner_user_id',
            'status',
        ]);
        expect(getIndex(links, 'social_pro_report_links_expiration_idx').config.columns.map((column) => column.name)).toEqual([
            'expires_at',
        ]);

        for (const unsafeColumn of [
            'raw_token',
            'reader_user_id',
            'reader_ip',
            'reader_email',
            'reader_session_id',
        ]) {
            expectColumnMissing(links, unsafeColumn);
        }
    });

    it('defines report audit events for lifecycle, link, and moderation continuity', () => {
        const auditEvents = getExportedTable('socialProReportAuditEvents');

        const reportId = getColumn(auditEvents, 'report_id');
        const actorUserId = getColumn(auditEvents, 'actor_user_id');
        const linkId = getColumn(auditEvents, 'link_id');
        const eventType = getColumn(auditEvents, 'event_type');
        const reportStatus = getColumn(auditEvents, 'report_status');
        const reasonKey = getColumn(auditEvents, 'reason_key');
        const publicSafeSnapshot = getColumn(auditEvents, 'public_safe_snapshot');
        const metadata = getColumn(auditEvents, 'metadata');
        const createdAt = getColumn(auditEvents, 'created_at');

        expect(reportId.notNull).toBe(true);
        expect(actorUserId.notNull).toBe(false);
        expect(linkId.notNull).toBe(false);
        expect(eventType.notNull).toBe(true);
        expect(reportStatus.notNull).toBe(false);
        expect(reasonKey.notNull).toBe(false);
        expect(publicSafeSnapshot.notNull).toBe(false);
        expect(metadata.notNull).toBe(true);
        expect(metadata.default).toBe('{}');
        expect(createdAt.notNull).toBe(true);

        expect(getForeignKey(auditEvents, 'social_pro_report_audit_events_report_id_social_pro_reports_id_fk').onDelete).toBe('cascade');
        expect(getForeignKey(auditEvents, 'social_pro_report_audit_events_actor_user_id_users_id_fk').onDelete).toBe('set null');
        expect(getForeignKey(auditEvents, 'social_pro_report_audit_events_link_id_social_pro_report_links_id_fk').onDelete).toBe('set null');

        expect(getIndex(auditEvents, 'social_pro_report_audit_events_report_created_idx').config.columns.map((column) => column.name)).toEqual([
            'report_id',
            'created_at',
        ]);
        expect(getIndex(auditEvents, 'social_pro_report_audit_events_link_created_idx').config.columns.map((column) => column.name)).toEqual([
            'link_id',
            'created_at',
        ]);
        expect(getIndex(auditEvents, 'social_pro_report_audit_events_actor_created_idx').config.columns.map((column) => column.name)).toEqual([
            'actor_user_id',
            'created_at',
        ]);
        expect(getIndex(auditEvents, 'social_pro_report_audit_events_type_created_idx').config.columns.map((column) => column.name)).toEqual([
            'event_type',
            'created_at',
        ]);

        expectColumnMissing(auditEvents, 'raw_private_analysis');
        expectColumnMissing(auditEvents, 'private_reader_id');
        expectColumnMissing(auditEvents, 'payment_payload');
    });

    it('defines private-by-default collections and context-aware library items', () => {
        const collections = getExportedTable('socialProCollections');
        const items = getExportedTable('socialProCollectionItems');

        const collectionOwner = getColumn(collections, 'owner_user_id');
        const collectionMode = getColumn(collections, 'mode');
        const collectionVisibility = getColumn(collections, 'visibility');
        const collectionShareable = getColumn(collections, 'shareable');
        const collectionContextKey = getColumn(collections, 'context_key');
        const collectionPayload = getColumn(collections, 'payload');

        expect(collectionOwner.notNull).toBe(true);
        expect(collectionMode.notNull).toBe(true);
        expect(collectionMode.default).toBe('manual');
        expect(collectionVisibility.notNull).toBe(true);
        expect(collectionVisibility.default).toBe('private');
        expect(collectionShareable.notNull).toBe(true);
        expect(collectionShareable.default).toBe(false);
        expect(collectionContextKey.notNull).toBe(true);
        expect(collectionPayload.default).toBe('{}');

        expect(getColumn(collections, 'weapon_id').notNull).toBe(false);
        expect(getColumn(collections, 'optic_id').notNull).toBe(false);
        expect(getColumn(collections, 'distance_meters').notNull).toBe(false);
        expect(getColumn(collections, 'diagnosis_key').notNull).toBe(false);
        expect(getColumn(collections, 'active_line_id').notNull).toBe(false);
        expect(getColumn(collections, 'program_cycle_id').notNull).toBe(false);
        expect(getColumn(collections, 'spray_lab_lane_id').notNull).toBe(false);
        expect(getColumn(collections, 'objective_key').notNull).toBe(false);
        expect(getColumn(collections, 'validation_state').notNull).toBe(false);
        expect(getColumn(collections, 'blocker_key').notNull).toBe(false);

        expect(getForeignKey(collections, 'social_pro_collections_owner_user_id_users_id_fk').onDelete).toBe('cascade');
        expect(getForeignKey(collections, 'social_pro_collections_program_cycle_id_training_program_cycles_id_fk').onDelete).toBe('set null');
        expect(getIndex(collections, 'social_pro_collections_owner_updated_idx').config.columns.map((column) => column.name)).toEqual([
            'owner_user_id',
            'updated_at',
        ]);
        expect(getIndex(collections, 'social_pro_collections_owner_mode_idx').config.columns.map((column) => column.name)).toEqual([
            'owner_user_id',
            'mode',
        ]);
        expect(getIndex(collections, 'social_pro_collections_owner_context_idx').config.columns.map((column) => column.name)).toEqual([
            'owner_user_id',
            'context_key',
        ]);

        const itemCollectionId = getColumn(items, 'collection_id');
        const itemOwnerUserId = getColumn(items, 'owner_user_id');
        const itemKind = getColumn(items, 'kind');
        const itemId = getColumn(items, 'item_id');
        const contextKey = getColumn(items, 'context_key');
        const contextFacets = getColumn(items, 'context_facets');

        expect(itemCollectionId.notNull).toBe(true);
        expect(itemOwnerUserId.notNull).toBe(true);
        expect(itemKind.notNull).toBe(true);
        expect(itemId.notNull).toBe(true);
        expect(contextKey.notNull).toBe(true);
        expect(contextFacets.notNull).toBe(true);
        expect(contextFacets.default).toBe('{}');

        expect(getForeignKey(items, 'social_pro_collection_items_collection_id_social_pro_collections_id_fk').onDelete).toBe('cascade');
        expect(getForeignKey(items, 'social_pro_collection_items_owner_user_id_users_id_fk').onDelete).toBe('cascade');
        expect(getForeignKey(items, 'social_pro_collection_items_social_pro_report_id_social_pro_reports_id_fk').onDelete).toBe('set null');
        expect(getForeignKey(items, 'social_pro_collection_items_community_post_id_community_posts_id_fk').onDelete).toBe('set null');
        expect(getForeignKey(items, 'social_pro_collection_items_spray_lab_session_id_spray_lab_sessions_id_fk').onDelete).toBe('set null');
        expect(getForeignKey(items, 'social_pro_collection_items_training_program_mission_id_training_program_missions_id_fk').onDelete).toBe('set null');
        expect(getForeignKey(items, 'social_pro_collection_items_validation_link_id_spray_lab_validation_links_id_fk').onDelete).toBe('set null');

        expect(getIndex(items, 'social_pro_collection_items_collection_kind_idx').config.columns.map((column) => column.name)).toEqual([
            'collection_id',
            'kind',
        ]);
        expect(getIndex(items, 'social_pro_collection_items_owner_kind_created_idx').config.columns.map((column) => column.name)).toEqual([
            'owner_user_id',
            'kind',
            'created_at',
        ]);
        expect(getIndex(items, 'social_pro_collection_items_collection_item_uidx').config.unique).toBe(true);

        expectColumnMissing(collections, 'public_slug');
        expectColumnMissing(collections, 'discoverable_in_feed');
        expectColumnMissing(items, 'public_visibility');
    });

    it('exports Social Pro audit action keys using the social_pro namespace', () => {
        const auditLogSource = readFileSync(new URL('./audit-log.ts', import.meta.url), 'utf8');
        const actions = Array.from(
            auditLogSource.matchAll(/'social_pro\.[^']+'/g),
            ([match]) => match.slice(1, -1),
        );

        expect(auditLogSource).toContain('socialProAuditActionKeys');
        expect(actions).toEqual(expect.arrayContaining([
            'social_pro.report.created',
            'social_pro.report.updated',
            'social_pro.private_link.revoked',
            'social_pro.private_link.regenerated',
            'social_pro.report.hidden',
            'social_pro.report.disabled',
            'social_pro.library_item.saved',
        ]));
        expect(actions.every((action) => action.startsWith('social_pro.'))).toBe(true);
    });
});

describe('team coach persistence schema', () => {
    it('defines private workspace rows without depending on public community squad identity', () => {
        const workspaces = getExportedTable('teamCoachWorkspaces');

        const ownerUserId = getColumn(workspaces, 'owner_user_id');
        const name = getColumn(workspaces, 'name');
        const status = getColumn(workspaces, 'status');
        const seatLimit = getColumn(workspaces, 'seat_limit');
        const createdAt = getColumn(workspaces, 'created_at');
        const updatedAt = getColumn(workspaces, 'updated_at');
        const archivedAt = getColumn(workspaces, 'archived_at');

        expect(ownerUserId.notNull).toBe(true);
        expect(name.notNull).toBe(true);
        expect(status.notNull).toBe(true);
        expect(status.default).toBe('active');
        expect(seatLimit.notNull).toBe(true);
        expect(seatLimit.default).toBe(8);
        expect(createdAt.notNull).toBe(true);
        expect(updatedAt.notNull).toBe(true);
        expect(archivedAt.notNull).toBe(false);

        expect(getForeignKey(
            workspaces,
            'team_coach_workspaces_owner_user_id_users_id_fk',
        ).onDelete).toBe('cascade');
        expect(getIndex(workspaces, 'team_coach_workspaces_owner_status_idx').config.columns.map((column) => column.name)).toEqual([
            'owner_user_id',
            'status',
        ]);

        expectColumnMissing(workspaces, 'community_squad_id');
        expectColumnMissing(workspaces, 'public_slug');
    });

    it('defines workspace memberships with role, status, seat state, lifecycle timestamps, and one row per workspace user', () => {
        const memberships = getExportedTable('teamCoachWorkspaceMemberships');

        const workspaceId = getColumn(memberships, 'workspace_id');
        const userId = getColumn(memberships, 'user_id');
        const role = getColumn(memberships, 'role');
        const status = getColumn(memberships, 'status');
        const seatState = getColumn(memberships, 'seat_state');
        const joinedAt = getColumn(memberships, 'joined_at');
        const leftAt = getColumn(memberships, 'left_at');
        const suspendedAt = getColumn(memberships, 'suspended_at');
        const revokedAt = getColumn(memberships, 'revoked_at');

        expect(workspaceId.notNull).toBe(true);
        expect(userId.notNull).toBe(true);
        expect(role.notNull).toBe(true);
        expect(role.default).toBe('player');
        expect(status.notNull).toBe(true);
        expect(status.default).toBe('active');
        expect(seatState.notNull).toBe(true);
        expect(seatState.default).toBe('occupied');
        expect(joinedAt.notNull).toBe(true);
        expect(leftAt.notNull).toBe(false);
        expect(suspendedAt.notNull).toBe(false);
        expect(revokedAt.notNull).toBe(false);

        expect(getForeignKey(
            memberships,
            'team_coach_workspace_memberships_workspace_id_team_coach_workspaces_id_fk',
        ).onDelete).toBe('cascade');
        expect(getForeignKey(
            memberships,
            'team_coach_workspace_memberships_user_id_users_id_fk',
        ).onDelete).toBe('cascade');
        expect(getIndex(memberships, 'team_coach_workspace_memberships_workspace_user_uidx').config.unique).toBe(true);
        expect(getIndex(memberships, 'team_coach_workspace_memberships_user_status_idx').config.columns.map((column) => column.name)).toEqual([
            'user_id',
            'status',
        ]);
    });

    it('defines high-entropy workspace invites with intended role, recipient metadata, status, expiration, and lifecycle indexes', () => {
        const invites = getExportedTable('teamCoachWorkspaceInvites');

        const workspaceId = getColumn(invites, 'workspace_id');
        const createdByUserId = getColumn(invites, 'created_by_user_id');
        const invitedUserId = getColumn(invites, 'invited_user_id');
        const invitedEmail = getColumn(invites, 'invited_email');
        const intendedRole = getColumn(invites, 'intended_role');
        const inviteCode = getColumn(invites, 'invite_code');
        const status = getColumn(invites, 'status');
        const expiresAt = getColumn(invites, 'expires_at');
        const acceptedByUserId = getColumn(invites, 'accepted_by_user_id');
        const revokedByUserId = getColumn(invites, 'revoked_by_user_id');

        expect(workspaceId.notNull).toBe(true);
        expect(createdByUserId.notNull).toBe(true);
        expect(invitedUserId.notNull).toBe(false);
        expect(invitedEmail.notNull).toBe(false);
        expect(intendedRole.notNull).toBe(true);
        expect(inviteCode.notNull).toBe(true);
        expect(status.notNull).toBe(true);
        expect(status.default).toBe('pending');
        expect(expiresAt.notNull).toBe(true);
        expect(acceptedByUserId.notNull).toBe(false);
        expect(revokedByUserId.notNull).toBe(false);

        expect(getIndex(invites, 'team_coach_workspace_invites_code_uidx').config.unique).toBe(true);
        expect(getIndex(invites, 'team_coach_workspace_invites_workspace_status_idx').config.columns.map((column) => column.name)).toEqual([
            'workspace_id',
            'status',
        ]);
        expect(getIndex(invites, 'team_coach_workspace_invites_expires_idx').config.columns.map((column) => column.name)).toEqual([
            'expires_at',
        ]);
    });

    it('defines consent/share, notes, review status events, packet links, seat ledger, and audit event surfaces', () => {
        const shares = getExportedTable('teamCoachReportShares');
        const notes = getExportedTable('teamCoachReviewNotes');
        const statusEvents = getExportedTable('teamCoachReviewStatusEvents');
        const packets = getExportedTable('teamCoachReviewPackets');
        const packetLinks = getExportedTable('teamCoachPacketLinks');
        const seatLedger = getExportedTable('teamCoachSeatLedger');
        const auditEvents = getExportedTable('teamCoachAuditEvents');

        expect(getColumn(shares, 'consent_status').default).toBe('granted');
        expect(getColumn(shares, 'consent_scopes').default).toBe('[]');
        expect(getColumn(shares, 'share_status').default).toBe('active');
        expect(getColumn(shares, 'team_safe_snapshot').notNull).toBe(true);
        expect(getColumn(shares, 'source_analysis_session_id').notNull).toBe(false);
        expect(getColumn(shares, 'source_training_program_cycle_id').notNull).toBe(false);
        expect(getIndex(shares, 'team_coach_report_shares_workspace_player_status_idx').config.columns.map((column) => column.name)).toEqual([
            'workspace_id',
            'player_user_id',
            'share_status',
        ]);

        expect(getColumn(notes, 'note').notNull).toBe(true);
        expect(getColumn(notes, 'requested_next_action').notNull).toBe(false);
        expect(getColumn(statusEvents, 'previous_status').notNull).toBe(false);
        expect(getColumn(statusEvents, 'next_status').notNull).toBe(true);
        expect(getColumn(packets, 'visibility').default).toBe('private');
        expect(getColumn(packets, 'status').default).toBe('draft');
        expect(getColumn(packetLinks, 'token_verifier_hash').notNull).toBe(true);
        expect(getColumn(packetLinks, 'token_verifier_prefix').notNull).toBe(true);
        expect(getIndex(packetLinks, 'team_coach_packet_links_token_hash_uidx').config.unique).toBe(true);

        expect(getColumn(seatLedger, 'seat_limit').notNull).toBe(true);
        expect(getColumn(seatLedger, 'occupied_seats').notNull).toBe(true);
        expect(getColumn(seatLedger, 'invited_seats').notNull).toBe(true);
        expect(getIndex(seatLedger, 'team_coach_seat_ledger_workspace_created_idx').config.columns.map((column) => column.name)).toEqual([
            'workspace_id',
            'created_at',
        ]);

        expect(getColumn(auditEvents, 'event_type').notNull).toBe(true);
        expect(getColumn(auditEvents, 'metadata').default).toBe('{}');
        expect(getForeignKey(
            auditEvents,
            'team_coach_audit_events_workspace_id_team_coach_workspaces_id_fk',
        ).onDelete).toBe('cascade');
        expect(getIndex(auditEvents, 'team_coach_audit_events_workspace_created_idx').config.columns.map((column) => column.name)).toEqual([
            'workspace_id',
            'created_at',
        ]);
        expect(getIndex(auditEvents, 'team_coach_audit_events_type_created_idx').config.columns.map((column) => column.name)).toEqual([
            'event_type',
            'created_at',
        ]);
    });

    it('ships the blocking Team Coach migration with private workspace tables and audit indexes', () => {
        const migrationSql = readFileSync(
            new URL('../../drizzle/0015_team_coach_expansion.sql', import.meta.url),
            'utf8',
        );

        expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "team_coach_workspaces"');
        expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "team_coach_workspace_memberships"');
        expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "team_coach_workspace_invites"');
        expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "team_coach_report_shares"');
        expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "team_coach_audit_events"');
        expect(migrationSql).toContain('team_coach_workspace_memberships_workspace_user_uidx');
        expect(migrationSql).toContain('team_coach_audit_events_type_created_idx');
        expect(migrationSql).not.toContain('community_squad_id');
    });
});

import type { CommunityPostStatus } from '@/types/community';

export type CommunityCommentModerationStatus =
    | 'visible'
    | 'author_deleted'
    | 'moderator_hidden';

export interface CommunityPostModerationState {
    readonly status: CommunityPostStatus;
    readonly publicCanRead: boolean;
    readonly authorCanRead: boolean;
    readonly preservesEntityRecord: true;
    readonly isModerated: boolean;
}

export interface CommunityCommentModerationState {
    readonly status: CommunityCommentModerationStatus;
    readonly publicCanRead: boolean;
    readonly preservesEntityRecord: true;
    readonly isModerated: boolean;
}

export function getCommunityPostModerationState(
    status: CommunityPostStatus,
): CommunityPostModerationState {
    switch (status) {
        case 'draft':
            return {
                status,
                publicCanRead: false,
                authorCanRead: true,
                preservesEntityRecord: true,
                isModerated: false,
            };

        case 'published':
            return {
                status,
                publicCanRead: true,
                authorCanRead: true,
                preservesEntityRecord: true,
                isModerated: false,
            };

        case 'hidden':
            return {
                status,
                publicCanRead: false,
                authorCanRead: true,
                preservesEntityRecord: true,
                isModerated: true,
            };

        case 'archived':
            return {
                status,
                publicCanRead: false,
                authorCanRead: true,
                preservesEntityRecord: true,
                isModerated: true,
            };

        case 'deleted':
            return {
                status,
                publicCanRead: false,
                authorCanRead: false,
                preservesEntityRecord: true,
                isModerated: true,
            };
    }
}

export function getCommunityCommentModerationState(
    status: CommunityCommentModerationStatus,
): CommunityCommentModerationState {
    switch (status) {
        case 'visible':
            return {
                status,
                publicCanRead: true,
                preservesEntityRecord: true,
                isModerated: false,
            };

        case 'author_deleted':
            return {
                status,
                publicCanRead: false,
                preservesEntityRecord: true,
                isModerated: false,
            };

        case 'moderator_hidden':
            return {
                status,
                publicCanRead: false,
                preservesEntityRecord: true,
                isModerated: true,
            };
    }
}

export function isCommunityCommentPubliclyVisible(
    status: CommunityCommentModerationStatus,
): boolean {
    return getCommunityCommentModerationState(status).publicCanRead;
}

'use client';

import { useState, useTransition } from 'react';

import { setCommunityProfileFollow } from '@/actions/community-follows';

interface FollowButtonProps {
    readonly slug: string;
    readonly initialFollowing: boolean;
    readonly initialFollowerCount: number;
    readonly className?: string;
}

function resolveFollowErrorMessage(error: string): string {
    if (error === 'Nao autenticado.') {
        return 'Entre na sua conta para seguir este autor.';
    }

    if (error === 'Voce nao pode seguir o proprio perfil.') {
        return 'Voce nao pode seguir o proprio perfil.';
    }

    return error;
}

export function FollowButton({
    slug,
    initialFollowing,
    initialFollowerCount,
    className,
}: FollowButtonProps) {
    const [isPending, startTransition] = useTransition();
    const [following, setFollowing] = useState(initialFollowing);
    const [followerCount, setFollowerCount] = useState(initialFollowerCount);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleToggle = () => {
        setErrorMessage(null);

        startTransition(async () => {
            try {
                const result = await setCommunityProfileFollow({
                    slug,
                    following: !following,
                });

                if (!result.success) {
                    setErrorMessage(resolveFollowErrorMessage(result.error));
                    return;
                }

                setFollowing(result.following);
                setFollowerCount(result.followerCount);
            } catch {
                setErrorMessage('Nao foi possivel atualizar o follow agora.');
            }
        });
    };

    const activeStyle = following
        ? {
            borderColor: 'rgba(255, 107, 0, 0.32)',
            background: 'rgba(255, 107, 0, 0.12)',
            color: 'var(--color-accent-primary-light)',
        }
        : undefined;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '8px',
            }}
        >
            <button
                type="button"
                className={className ?? 'btn btn-secondary'}
                style={activeStyle}
                onClick={handleToggle}
                disabled={isPending}
                aria-pressed={following}
                aria-describedby={errorMessage ? 'community-follow-status' : undefined}
            >
                {isPending
                    ? 'Atualizando follow...'
                    : `${following ? 'Seguindo' : 'Seguir'} • ${followerCount}`}
            </button>

            {errorMessage ? (
                <p
                    id="community-follow-status"
                    aria-live="polite"
                    style={{ margin: 0, color: 'var(--color-error)', fontSize: 'var(--text-xs)', maxWidth: 320 }}
                >
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}

'use client';

import { useState, useTransition } from 'react';

import { setCommunityPostLike } from '@/actions/community-likes';

interface LikeButtonProps {
    readonly slug: string;
    readonly initialLiked: boolean;
    readonly initialLikeCount: number;
    readonly className?: string;
}

function resolveLikeErrorMessage(error: string): string {
    if (error === 'Nao autenticado.') {
        return 'Entre na sua conta para curtir este post.';
    }

    return error;
}

export function LikeButton({
    slug,
    initialLiked,
    initialLikeCount,
    className,
}: LikeButtonProps) {
    const [isPending, startTransition] = useTransition();
    const [liked, setLiked] = useState(initialLiked);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleToggle = () => {
        setErrorMessage(null);

        startTransition(async () => {
            try {
                const result = await setCommunityPostLike({
                    slug,
                    liked: !liked,
                });

                if (!result.success) {
                    setErrorMessage(resolveLikeErrorMessage(result.error));
                    return;
                }

                setLiked(result.liked);
                setLikeCount(result.likeCount);
            } catch {
                setErrorMessage('Nao foi possivel atualizar a curtida agora.');
            }
        });
    };

    const activeStyle = liked
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
                aria-pressed={liked}
                aria-describedby={errorMessage ? 'community-like-status' : undefined}
            >
                {isPending ? 'Atualizando curtida...' : `${liked ? 'Curtido' : 'Curtir'} - ${likeCount}`}
            </button>

            {errorMessage ? (
                <p
                    id="community-like-status"
                    aria-live="polite"
                    style={{ margin: 0, color: 'var(--color-error)', fontSize: 'var(--text-xs)', maxWidth: 320 }}
                >
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}

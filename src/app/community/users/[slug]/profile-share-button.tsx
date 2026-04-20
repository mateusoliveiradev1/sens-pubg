'use client';

import { useState, useTransition } from 'react';

interface ProfileShareButtonProps {
    readonly canonicalUrl: string;
    readonly title: string;
    readonly className?: string;
}

type ShareStatus = 'idle' | 'copied' | 'shared' | 'unsupported' | 'error';

function getShareStatusMessage(status: ShareStatus): string | null {
    switch (status) {
        case 'copied':
            return 'Link publico copiado.';
        case 'shared':
            return 'Perfil publico compartilhado.';
        case 'unsupported':
            return 'Copie pela barra de endereco deste perfil publico.';
        case 'error':
            return 'Nao foi possivel compartilhar agora.';
        case 'idle':
        default:
            return null;
    }
}

export function ProfileShareButton({
    canonicalUrl,
    title,
    className,
}: ProfileShareButtonProps) {
    const [isPending, startTransition] = useTransition();
    const [status, setStatus] = useState<ShareStatus>('idle');
    const statusMessage = getShareStatusMessage(status);

    const handleShare = () => {
        setStatus('idle');

        startTransition(async () => {
            try {
                if (navigator.share) {
                    await navigator.share({
                        title,
                        url: canonicalUrl,
                    });
                    setStatus('shared');
                    return;
                }

                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(canonicalUrl);
                    setStatus('copied');
                    return;
                }

                setStatus('unsupported');
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    setStatus('idle');
                    return;
                }

                setStatus('error');
            }
        });
    };

    return (
        <div style={{ display: 'grid', gap: 8, alignItems: 'start' }}>
            <button
                type="button"
                className={className ?? 'btn btn-secondary'}
                disabled={isPending}
                onClick={handleShare}
            >
                {isPending ? 'Preparando link...' : 'Compartilhar perfil'}
            </button>

            {statusMessage ? (
                <p
                    aria-live="polite"
                    style={{
                        margin: 0,
                        maxWidth: 320,
                        color: status === 'error' ? 'var(--color-error)' : 'var(--color-text-secondary)',
                        fontSize: 'var(--text-xs)',
                    }}
                >
                    {statusMessage}
                </p>
            ) : null}
        </div>
    );
}

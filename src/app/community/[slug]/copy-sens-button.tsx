'use client';

import { useState, useTransition } from 'react';

import { copyCommunityPostSens } from '@/actions/community-copy';

interface CopySensButtonProps {
    readonly slug: string;
    readonly className?: string;
}

export function CopySensButton({ slug, className }: CopySensButtonProps) {
    const [isPending, startTransition] = useTransition();
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleCopy = () => {
        setStatusMessage(null);
        setErrorMessage(null);

        startTransition(async () => {
            try {
                const result = await copyCommunityPostSens({
                    slug,
                    target: 'clipboard',
                });

                if (!result.success) {
                    setErrorMessage(result.error);
                    return;
                }

                if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
                    setErrorMessage('Clipboard indisponivel neste navegador.');
                    return;
                }

                await navigator.clipboard.writeText(result.clipboardText);
                setStatusMessage('Sens copiada para a area de transferencia.');
            } catch {
                setErrorMessage('Nao foi possivel copiar a sens agora.');
            }
        });
    };

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
                onClick={handleCopy}
                disabled={isPending}
                aria-describedby={statusMessage || errorMessage ? 'community-copy-sens-status' : undefined}
            >
                {isPending ? 'Copiando sens...' : 'Copiar sens'}
            </button>

            {statusMessage ? (
                <p
                    id="community-copy-sens-status"
                    aria-live="polite"
                    style={{ margin: 0, color: 'var(--color-success)', fontSize: 'var(--text-xs)' }}
                >
                    {statusMessage}
                </p>
            ) : null}

            {errorMessage ? (
                <p
                    id="community-copy-sens-status"
                    aria-live="polite"
                    style={{ margin: 0, color: 'var(--color-error)', fontSize: 'var(--text-xs)', maxWidth: 320 }}
                >
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}

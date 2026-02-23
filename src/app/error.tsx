/**
 * Error Page — Global error boundary com retry e visual glitch.
 */

'use client';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}): React.JSX.Element {
    return (
        <div
            className="page"
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '80vh',
                textAlign: 'center',
                padding: 'var(--space-xl)',
            }}
        >
            <div
                style={{
                    fontSize: '4rem',
                    marginBottom: 'var(--space-lg)',
                }}
                aria-hidden="true"
            >
                ⚠️
            </div>

            <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-md)' }}>
                Algo Deu Errado
            </h1>

            <p style={{
                color: 'var(--color-text-secondary)',
                maxWidth: '400px',
                marginBottom: 'var(--space-md)',
            }}>
                Ocorreu um erro inesperado. Tente novamente ou volte à página inicial.
            </p>

            {error.digest && (
                <p style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-muted)',
                    marginBottom: 'var(--space-xl)',
                }}>
                    Código: {error.digest}
                </p>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <button
                    onClick={reset}
                    className="btn btn-primary"
                >
                    Tentar Novamente
                </button>
                <a href="/" className="btn btn-secondary">
                    Voltar ao Início
                </a>
            </div>
        </div>
    );
}

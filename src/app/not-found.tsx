/**
 * Not Found Page — Custom 404 com design PUBG-themed.
 */

import Link from 'next/link';
import { Header } from '@/ui/components/header';

export default function NotFound(): React.JSX.Element {
    return (
        <>
            <Header />
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
                        fontSize: '6rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-cyan))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        lineHeight: 1,
                        marginBottom: 'var(--space-lg)',
                    }}
                >
                    404
                </div>

                <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-md)' }}>
                    Alvo Não Encontrado
                </h1>

                <p style={{
                    color: 'var(--color-text-secondary)',
                    maxWidth: '400px',
                    marginBottom: 'var(--space-2xl)',
                }}>
                    A página que você procura não existe ou foi movida.
                    Verifique a URL ou volte ao início.
                </p>

                <Link href="/" className="btn btn-primary btn-lg">
                    Voltar ao Início
                </Link>
            </div>
        </>
    );
}

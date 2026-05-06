import type { Metadata } from 'next';
import Link from 'next/link';

import { Header } from '@/ui/components/header';

export const metadata: Metadata = {
    title: 'Checkout cancelado',
    description: 'Checkout Pro cancelado sem alterar historico ou acesso Free.',
};

export default function CheckoutCancelPage(): React.JSX.Element {
    return (
        <div className="min-h-screen bg-[#08080c] text-white">
            <Header />
            <main className="page">
                <section className="container" style={{ maxWidth: 760 }}>
                    <div className="glass-card" style={{ padding: 'var(--space-2xl)', display: 'grid', gap: 'var(--space-lg)' }}>
                        <span className="badge badge-info">Checkout cancelado</span>
                        <h1 style={{ margin: 0 }}>Nada foi alterado no seu historico</h1>
                        <p style={{ margin: 0, color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                            Voce voltou antes de concluir o Checkout. O Free continua disponivel com 3 analises uteis salvas por mes,
                            e seus registros existentes nao sao apagados por cancelar ou pausar uma compra.
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                            <Link href="/pricing" className="btn btn-primary">
                                Voltar ao Pro
                            </Link>
                            <Link href="/analyze" className="btn btn-secondary">
                                Fazer analise Free
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}

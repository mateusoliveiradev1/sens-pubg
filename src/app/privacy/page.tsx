import type { Metadata } from 'next';

import { Header } from '@/ui/components/header';

export const metadata: Metadata = {
    title: 'Politica de Privacidade',
    description: 'Como o Sens PUBG protege e usa seus dados.',
};

export default function PrivacyPage(): React.JSX.Element {
    return (
        <>
            <Header />
            <main
                className="page"
                style={{ padding: 'var(--space-4xl) var(--space-xl)', maxWidth: 800, margin: '0 auto' }}
            >
                <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-xl)', color: 'var(--color-text-primary)' }}>
                    Politica de Privacidade
                </h1>

                <div style={{ color: 'var(--color-text-muted)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                    <p>
                        Esta politica explica quais dados o Sens PUBG usa para conta, historico, billing e leitura dos resultados.
                    </p>

                    <section>
                        <h2 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>1. Quais dados coletamos</h2>
                        <p>
                            Usamos dados de autenticacao, configuracoes de hardware/jogo e resultados salvos de analise quando voce decide manter historico.
                        </p>
                    </section>

                    <section>
                        <h2 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>2. O que nao coletamos</h2>
                        <p>
                            O video nao precisa ser enviado para um servidor de processamento. A leitura do clip acontece no navegador; o servidor guarda apenas dados necessarios para conta, quota, billing e historico salvo.
                        </p>
                    </section>

                    <section>
                        <h2 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>3. Como usamos seus dados</h2>
                        <p>
                            Usamos seus dados para mostrar resultados, preservar historico, calcular limites Free/Pro, operar assinatura e exibir a proxima acao de treino.
                        </p>
                    </section>

                    <section>
                        <h2 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>4. Seguranca e retencao</h2>
                        <p>
                            Sessoes e autenticacao usam os provedores configurados no produto. Seus dados ficam disponiveis enquanto sua conta existir ou ate uma exclusao suportada pelo produto.
                        </p>
                    </section>

                    <p style={{ marginTop: 'var(--space-2xl)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                        Ultima atualizacao: maio de 2026.
                    </p>
                </div>
            </main>
        </>
    );
}

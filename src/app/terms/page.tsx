import type { Metadata } from 'next';

import { Header } from '@/ui/components/header';

export const metadata: Metadata = {
    title: 'Termos de Uso',
    description: 'Termos de uso do Sens PUBG.',
};

export default function TermsPage(): React.JSX.Element {
    return (
        <>
            <Header />
            <main
                className="page"
                style={{ padding: 'var(--space-4xl) var(--space-xl)', maxWidth: 800, margin: '0 auto' }}
            >
                <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-xl)', color: 'var(--color-text-primary)' }}>
                    Termos de Uso
                </h1>

                <div style={{ color: 'var(--color-text-muted)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                    <p>
                        Bem-vindo ao Sens PUBG. Ao acessar ou usar a plataforma, voce concorda com estes termos.
                    </p>

                    <section>
                        <h2 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>1. Natureza do servico</h2>
                        <p>
                            Sens PUBG e uma ferramenta independente para analisar arquivos de video de gameplay enviados pelo usuario.
                            <strong> Nao somos afiliados, associados, autorizados, endossados ou oficialmente conectados a KRAFTON, Inc., PUBG Corporation ou subsidiarias.</strong>
                        </p>
                    </section>

                    <section>
                        <h2 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>2. Anti-cheat e seguranca</h2>
                        <p>
                            A ferramenta nao interage com memoria, arquivos locais ou servidores do PUBG. A analise usa o video fornecido pelo usuario e roda no navegador local.
                        </p>
                    </section>

                    <section>
                        <h2 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>3. Responsabilidade do usuario</h2>
                        <p>
                            Voce e responsavel pelos clips que usa na ferramenta. Clips ruins, cortados, comprimidos ou com mira pouco visivel podem gerar leitura conservadora ou inconclusiva.
                        </p>
                    </section>

                    <section>
                        <h2 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>4. Limites do produto</h2>
                        <p>
                            Recomendacoes de sensibilidade, diagnosticos e treinos sao faixas de teste baseadas na evidencia do clip. Sens PUBG nao promete ajuste final, rank ou resultado automatico.
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

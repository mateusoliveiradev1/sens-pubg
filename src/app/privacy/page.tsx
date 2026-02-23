import { Header } from '@/ui/components/header';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Política de Privacidade',
    description: 'Como protegemos e utilizamos seus dados no PUBG Aim Analyzer.',
};

export default function PrivacyPage(): React.JSX.Element {
    return (
        <>
            <Header />
            <main className="page" style={{ padding: 'var(--space-4xl) var(--space-xl)', maxWidth: 800, margin: '0 auto' }}>
                <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-xl)', color: 'var(--color-text-primary)' }}>
                    Política de Privacidade
                </h1>

                <div style={{ color: 'var(--color-text-muted)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                    <p>
                        A sua privacidade é crucial para nós. Esta política explica como coletamos, usamos e protegemos seus dados pessoais quando você usa o PUBG Aim Analyzer.
                    </p>

                    <section>
                        <h2 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>1. Quais Dados Coletamos</h2>
                        <p>
                            - <strong>Informações de Autenticação:</strong> Quando você faz login via Google ou Discord, recebemos seu nome, e-mail e foto de perfil (via OAuth). <br />
                            - <strong>Dados de Perfil:</strong> As configurações de hardware que você insere (tipo de mouse, DPI, mousepad, grip) e histórico de sensibilidade (cm/360°). <br />
                            - <strong>Resultados de Análise:</strong> Os diagnósticos finais e métricas resultantes do processamento de vídeo, para compor o seu histórico de evolução.
                        </p>
                    </section>

                    <section>
                        <h2 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>2. O que NÃO Coletamos</h2>
                        <p>
                            <strong>Nós NUNCA fazemos upload dos seus arquivos de vídeo.</strong><br />
                            Toda a análise frame a frame, machine learning e detecção de tracking acontecem em tempo real no seu próprio dispositivo (Client-side rendering).
                            Apenas um pacote leve em formato JSON contendo o resultado numérico da mira é enviado ao nosso banco de dados para salvar seu histórico.
                        </p>
                    </section>

                    <section>
                        <h2 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>3. Como Usamos Seus Dados</h2>
                        <p>
                            - Para criar e gerenciar sua conta na plataforma.<br />
                            - Para calibrar a inteligência artificial aos seus periféricos físicos e prover recomendações realistas de sensibilidade.<br />
                            - Para exibir gráficos e painéis de desempenho apenas para você, na aba Histórico.
                        </p>
                    </section>

                    <section>
                        <h2 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>4. Segurança e Retenção</h2>
                        <p>
                            As senhas (OAuth tokens) não são armazenadas em texto plano. As sessões são gerenciadas de forma ultra-segura através de JSON Web Tokens (JWT) selados usando métodos modernos de encriptação fornecidos pelo NextAuth.js.
                            Seus dados estarão disponíveis enquanto você mantiver uma conta ativa.
                        </p>
                    </section>

                    <p style={{ marginTop: 'var(--space-2xl)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                        Última atualização: Fevereiro de 2026.
                    </p>
                </div>
            </main>
        </>
    );
}

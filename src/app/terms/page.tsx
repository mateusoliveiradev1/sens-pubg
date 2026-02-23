import { Header } from '@/ui/components/header';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Termos de Uso',
    description: 'Termos de uso e condições do PUBG Aim Analyzer.',
};

export default function TermsPage(): React.JSX.Element {
    return (
        <>
            <Header />
            <main className="page" style={{ padding: 'var(--space-4xl) var(--space-xl)', maxWidth: 800, margin: '0 auto' }}>
                <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-xl)', color: 'var(--color-text-primary)' }}>
                    Termos de Uso
                </h1>

                <div style={{ color: 'var(--color-text-muted)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                    <p>
                        Bem-vindo ao PUBG Aim Analyzer. Ao acessar ou usar nossa plataforma, você concorda com estes Termos de Uso.
                        Por favor, leia-os cuidadosamente.
                    </p>

                    <section>
                        <h2 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>1. Natureza do Serviço</h2>
                        <p>
                            O PUBG Aim Analyzer é uma ferramenta de terceiros desenvolvida para analisar arquivos de vídeo (VODs) de gameplay gerados por usuários.
                            <strong> Não somos afiliados, associados, autorizados, endossados ou oficialmente conectados à KRAFTON, Inc., PUBG Corporation ou qualquer uma de suas subsidiárias.</strong>
                        </p>
                    </section>

                    <section>
                        <h2 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>2. Anti-Cheat e Segurança</h2>
                        <p>
                            Nenhuma parte do PUBG Aim Analyzer interage com a memória do jogo, com os arquivos locais do jogo ou com os servidores do PUBG.
                            A análise ocorre 100% baseada no processamento visual de um arquivo de vídeo (mp4/webm) fornecido pelo usuário e roda inteiramente dentro do navegador local.
                            Portanto, o uso desta ferramenta está em total conformidade com as diretrizes de fair play e não acarreta em riscos de banimento (VAC ban ou equivalente).
                        </p>
                    </section>

                    <section>
                        <h2 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>3. Responsabilidade do Usuário</h2>
                        <p>
                            O usuário é totalmente responsável pelos vídeos que submete à ferramenta para análise local.
                            Nós não armazenamos os vídeos enviados, pois todo o processamento dos quadros ocorre através das APIs do HTML5 Canvas do seu navegador.
                        </p>
                    </section>

                    <section>
                        <h2 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>4. Modificações no Serviço</h2>
                        <p>
                            Reservamos o direito de modificar ou descontinuar o serviço a qualquer momento, com ou sem aviso prévio.
                            O algoritmo de recomendação de sensibilidade (cm/360°) e diagnósticos refletem estimativas baseadas em IA e tracking mecânico,
                            e não garantem melhora absoluta na gameplay.
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

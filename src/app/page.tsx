/**
 * Landing Page — Hero premium + Features + CTA.
 * 100% React Server Component — zero JS no client.
 */

import Link from 'next/link';
import { Header } from '@/ui/components/header';
import styles from './page.module.css';

export default function HomePage(): React.JSX.Element {
  return (
    <>
      <Header />

      <div className={styles.page}>
        {/* Hero Section */}
        <section className={styles.hero}>
          {/* Background effects */}
          <div className={styles.heroBg} aria-hidden="true">
            <div className={styles.heroGlow} />
            <div className={styles.heroGlow2} />
            <div className={styles.gridOverlay} />
          </div>

          {/* Crosshair graphic */}
          <div className={styles.crosshair} aria-hidden="true">
            <div className={styles.crosshairRing} />
            <div className={styles.crosshairRing2} />
            <div className={styles.crosshairDot} />
            <div className={styles.crosshairLineH} />
            <div className={styles.crosshairLineV} />
          </div>

          <div className={`container ${styles.heroContent}`}>
            <h1 className={styles.heroTitle}>
              <span className={styles.heroLine1}>Analise Seu</span>
              <span className={styles.heroLine2}>
                <span className={styles.heroAccent}>Spray</span>
              </span>
              <span className={styles.heroLine3}>Domine o Recoil</span>
            </h1>

            <p className={styles.heroSubtitle}>
              Envie um clip, receba diagnóstico preciso e ajuste sua
              sensibilidade com base no seu hardware real.
              Seu coach de aim pessoal para PUBG.
            </p>

            <div className={styles.heroCta}>
              <Link href="/analyze" className="btn btn-primary btn-lg">
                🎯 Começar Análise
              </Link>
              <Link href="#features" className="btn btn-secondary btn-lg">
                Como Funciona ↓
              </Link>
            </div>

            <div className={styles.heroStats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>14</span>
                <span className={styles.statLabel}>Armas</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statValue}>6</span>
                <span className={styles.statLabel}>Diagnósticos</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statValue}>3</span>
                <span className={styles.statLabel}>Perfis de Sens</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statValue}>∞</span>
                <span className={styles.statLabel}>Evolução</span>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className={styles.scrollIndicator} aria-hidden="true">
            <div className={styles.scrollMouse}>
              <div className={styles.scrollDot} />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className={styles.features}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Como Funciona</h2>
            <p className={styles.sectionSubtitle}>
              4 passos para dominar seu spray no PUBG
            </p>

            <div className={styles.featureGrid}>
              <article className={`glass-card ${styles.featureCard}`}>
                <div className={styles.featureNumber}>01</div>
                <div className={styles.featureIcon}>🎥</div>
                <h3>Envie Seu Clip</h3>
                <p>
                  Grave um spray de 5–15 segundos no PUBG. A análise acontece
                  100% no seu navegador — sem upload para servidor.
                </p>
              </article>

              <article className={`glass-card ${styles.featureCard}`}>
                <div className={styles.featureNumber}>02</div>
                <div className={styles.featureIcon}>🧠</div>
                <h3>Diagnóstico Automático</h3>
                <p>
                  6 classificações: overpull, underpull, jitter, drift,
                  compensação atrasada e inconsistência. Cada uma com causa e solução.
                </p>
              </article>

              <article className={`glass-card ${styles.featureCard}`}>
                <div className={styles.featureNumber}>03</div>
                <div className={styles.featureIcon}>🎯</div>
                <h3>Ajuste de Sensibilidade</h3>
                <p>
                  3 perfis calibrados para o SEU hardware: mouse, mousepad,
                  grip e estilo. Micro-ajustes de 2–6% baseados no diagnóstico.
                </p>
              </article>

              <article className={`glass-card ${styles.featureCard}`}>
                <div className={styles.featureNumber}>04</div>
                <div className={styles.featureIcon}>📈</div>
                <h3>Evolua Continuamente</h3>
                <p>
                  Receba coaching com drills específicos, acompanhe tendências e
                  compare sessões ao longo do tempo.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className={styles.faq}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Perguntas Frequentes</h2>
            <p className={styles.sectionSubtitle}>Tudo o que você precisa saber sobre o PUBG Aim Analyzer</p>

            <div className={styles.faqGrid}>
              <div className={`glass-card ${styles.faqItem}`}>
                <h3>A análise de vídeo dá ban no PUBG?</h3>
                <p>Não. Nossa ferramenta trabalha 100% no seu navegador lendo um arquivo de vídeo (VOD). Não interagimos com os arquivos do jogo ou memória. É seguro e em conformidade com os termos da KRAFTON.</p>
              </div>
              <div className={`glass-card ${styles.faqItem}`}>
                <h3>Preciso enviar meu vídeo para algum servidor?</h3>
                <p>Não. Processamos os quadros diretamente usando WebAssembly e HTML5 Canvas no seu próprio navegador. Seu vídeo nunca sai do seu computador, garantindo privacidade e velocidade.</p>
              </div>
              <div className={`glass-card ${styles.faqItem}`}>
                <h3>Como o app descobre minha sensibilidade?</h3>
                <p>O app solicita configurações básicas do seu hardware (Mouse, DPI, Grip, Mousepad). A Engine de IA usa os dados do spray analisado (pixel drift) somado a sua configuração para calcular o cm/360° perfeito para sua pegada.</p>
              </div>
              <div className={`glass-card ${styles.faqItem}`}>
                <h3>Funciona com qualquer arma do PUBG?</h3>
                <p>Atualmente suportamos as 14 armas mais populares do meta do PUBG M416, Beryl M762, AUG, ACE32, entre outras, calculando padrões de Recoil precisos gravados diretamente dos servidores oficiais.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.cta}>
          <div className={`container text-center`}>
            <h2 className={styles.ctaTitle}>Pronto para Melhorar?</h2>
            <p className={styles.ctaSubtitle}>
              Configure seu perfil, envie um clip e receba seu diagnóstico em segundos.
            </p>
            <Link href="/analyze" className="btn btn-primary btn-lg">
              🚀 Começar Agora
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

/**
 * Landing Page — Hero animado + Features + CTA.
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
          <div className={styles.heroGlow} aria-hidden="true" />

          <div className={`container ${styles.heroContent}`}>
            <span className={styles.heroBadge}>
              ◎ Powered by AI
            </span>

            <h1 className={styles.heroTitle}>
              Domine Seu{' '}
              <span className={styles.heroAccent}>Recoil</span>
            </h1>

            <p className={styles.heroSubtitle}>
              Analise clips reais, receba diagnóstico preciso e ajuste sua
              sensibilidade com inteligência artificial. Seu coach de aim pessoal para PUBG.
            </p>

            <div className={styles.heroCta}>
              <Link href="/analyze" className="btn btn-primary btn-lg">
                Começar Análise
              </Link>
              <Link href="#features" className="btn btn-secondary btn-lg">
                Como Funciona
              </Link>
            </div>

            <div className={styles.heroStats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>6</span>
                <span className={styles.statLabel}>Métricas</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>6</span>
                <span className={styles.statLabel}>Diagnósticos</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>3</span>
                <span className={styles.statLabel}>Perfis</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>∞</span>
                <span className={styles.statLabel}>Evolução</span>
              </div>
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
              <article className={`glass-card ${styles.featureCard} animate-fade-in-up stagger-1`}>
                <div className={styles.featureIcon}>🎥</div>
                <h3>Análise Frame a Frame</h3>
                <p>
                  Reconstrução precisa do spray usando visão computacional
                  acelerada por GPU. Sem processamento externo — tudo no seu navegador.
                </p>
              </article>

              <article className={`glass-card ${styles.featureCard} animate-fade-in-up stagger-2`}>
                <div className={styles.featureIcon}>🧠</div>
                <h3>Diagnóstico Inteligente</h3>
                <p>
                  6 classificações automáticas: overpull, underpull, jitter,
                  drift, compensação atrasada e inconsistência.
                </p>
              </article>

              <article className={`glass-card ${styles.featureCard} animate-fade-in-up stagger-3`}>
                <div className={styles.featureIcon}>🎯</div>
                <h3>Ajuste de Sensibilidade</h3>
                <p>
                  Recomendações baseadas no seu hardware real: mouse, mousepad,
                  grip e estilo de jogo. Nunca valores genéricos.
                </p>
              </article>

              <article className={`glass-card ${styles.featureCard} animate-fade-in-up stagger-4`}>
                <div className={styles.featureIcon}>📈</div>
                <h3>Coach IA Contínuo</h3>
                <p>
                  Feedback personalizado que evolui com você. Compare sessões,
                  acompanhe tendências e refine sua precisão.
                </p>
              </article>
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
            <Link href="/login" className="btn btn-primary btn-lg">
              Criar Conta Gratuita
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

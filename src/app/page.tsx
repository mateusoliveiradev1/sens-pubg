/**
 * Landing Page — Hero premium + Features + CTA.
 * 100% React Server Component — zero JS no client.
 */

import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { analysisSessions, weaponProfiles } from '@/db/schema';
import { Header } from '@/ui/components/header';
import { FaqAccordion } from '@/ui/components/faq-accordion';
import { JsonLd } from '@/ui/components/seo/json-ld';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

async function getLandingStats(): Promise<{
  analysisCount: string;
  weaponCount: string;
}> {
  try {
    const [weaponCountResult, analysisCountResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(weaponProfiles),
      db.select({ count: sql<number>`count(*)` }).from(analysisSessions),
    ]);

    return {
      analysisCount: String(Number(analysisCountResult[0]?.count ?? 0)),
      weaponCount: String(Number(weaponCountResult[0]?.count ?? 0)),
    };
  } catch (error) {
    console.error('[HomePage] Failed to load landing stats', error);

    return {
      analysisCount: '--',
      weaponCount: '--',
    };
  }
}

export default async function HomePage(): Promise<React.JSX.Element> {
  const landingStats = await getLandingStats();
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Como funciona a análise de spray?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'O PUBG Aim Analyzer utiliza visão computacional via Canvas API para estimar o deslocamento do retículo em clips reais, calcular métricas de controle e exibir patch, cobertura e confiança da análise.',
        },
      },
      {
        '@type': 'Question',
        name: 'É necessário fazer upload do vídeo para um servidor?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Não. A análise é processada localmente no seu navegador através de Web Workers e APIs visuais do browser. O tempo depende do tamanho do clipe e do dispositivo.',
        },
      },
      {
        '@type': 'Question',
        name: 'O sistema suporta quais armas do PUBG?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'O catálogo cobre um conjunto importante de armas usadas no meta, incluindo Beryl M762, M416, AUG e ACE32. A cobertura evolui por patch para evitar recomendações fora de contexto.',
        },
      },
    ],
  };

  return (
    <>
      <JsonLd data={faqLd} />
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
              <span className={styles.heroLine3}>Entenda o Recoil</span>
            </h1>

            <p className={styles.heroSubtitle}>
              Envie um clip, veja patch, cobertura e confiança da análise,
              e teste ajustes de sensibilidade com base no seu hardware real.
              Um coach de aim honesto para PUBG.
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
                <span className={styles.statValue}>{landingStats.weaponCount}</span>
                <span className={styles.statLabel}>Armas</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statValue}>{landingStats.analysisCount}</span>
                <span className={styles.statLabel}>Análises</span>
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
              4 passos para entender seu spray no PUBG
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
                  compensação atrasada e inconsistência. Cada leitura vem com contexto
                  de confiança quando o tracking não está forte.
                </p>
              </article>

              <article className={`glass-card ${styles.featureCard}`}>
                <div className={styles.featureNumber}>03</div>
                <div className={styles.featureIcon}>🎯</div>
                <h3>Ajuste de Sensibilidade</h3>
                <p>
                  3 perfis calibrados para o SEU hardware: mouse, mousepad,
                  grip e estilo. Sugestões como faixas de teste, não como verdade final.
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

            <FaqAccordion />
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.cta}>
          <div className={`container text-center`}>
            <h2 className={styles.ctaTitle}>Pronto para Melhorar?</h2>
            <p className={styles.ctaSubtitle}>
              Configure seu perfil, envie um clip e leia o resultado com patch, cobertura e confiança.
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

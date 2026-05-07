import Link from 'next/link';
import { sql } from 'drizzle-orm';

import { db } from '@/db';
import { analysisSessions, weaponProfiles } from '@/db/schema';
import { BrandLockup } from '@/ui/components/brand-lockup';
import { EvidenceChip } from '@/ui/components/evidence-chip';
import { FaqAccordion } from '@/ui/components/faq-accordion';
import { Header } from '@/ui/components/header';
import { JsonLd } from '@/ui/components/seo/json-ld';
import { LoopRail } from '@/ui/components/loop-rail';
import { MetricTile } from '@/ui/components/metric-tile';
import { ProductState } from '@/ui/components/product-state';
import { WeaponIcon } from '@/ui/components/weapon-icon';

import styles from './page.module.css';

export const dynamic = 'force-dynamic';

const HERO_WEAPONS = [
    { id: 'beryl-m762', name: 'Beryl M762' },
    { id: 'm416', name: 'M416' },
    { id: 'ace32', name: 'ACE32' },
] as const;

const LOOP_FACTS = [
    {
        label: 'Clip Free',
        value: 'util',
        detail: 'A primeira leitura continua premium: evidencia, blockers e proximo teste aparecem sem esconder incerteza.',
    },
    {
        label: 'Pro',
        value: 'continuidade',
        detail: 'O Pro aprofunda historico, tendencias compativeis e coach completo sem vender certeza final.',
    },
    {
        label: 'Verdade',
        value: 'visivel',
        detail: 'Confianca, cobertura e motivos de bloqueio ficam na tela quando o clip nao sustenta uma recomendacao forte.',
    },
] as const;

const PROCESS_STEPS = [
    {
        number: '01',
        title: 'Envie um spray curto',
        body: 'Grave 5 a 15 segundos, reticulo visivel, uma arma e um spray continuo. A leitura acontece no navegador.',
    },
    {
        number: '02',
        title: 'Leia a evidencia',
        body: 'O relatorio mostra patch, cobertura, confianca, frames visiveis, frames perdidos e blockers quando o sinal fica fraco.',
    },
    {
        number: '03',
        title: 'Teste um bloco',
        body: 'A sens sai como faixa de teste e protocolo. Se o clip nao sustenta decisao, o coach reduz agressividade ou bloqueia o passo.',
    },
    {
        number: '04',
        title: 'Valide com outro clip',
        body: 'Historico e Pro conectam clips compativeis, checkpoints e tendencias sem misturar contexto ou vender certeza de resultado.',
    },
] as const;

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

function ProductLoopPreview({
    landingStats,
}: {
    readonly landingStats: Awaited<ReturnType<typeof getLandingStats>>;
}): React.JSX.Element {
    return (
        <aside className={styles.loopPreview} aria-label="Preview do loop Sens PUBG">
            <div className={styles.previewHeader}>
                <div>
                    <span className={styles.kicker}>Leitura do clip</span>
                    <h2 className={styles.previewTitle}>Spray testavel, nao chute de sens</h2>
                </div>
                <span className={styles.previewState}>evidencia forte</span>
            </div>

            <div className={styles.weaponRail} aria-label="Catalogo visual de armas">
                {HERO_WEAPONS.map((weapon) => (
                    <span className={styles.weaponPlate} key={weapon.id}>
                        <WeaponIcon framed showStatus size={76} weaponId={weapon.id} weaponName={weapon.name} />
                    </span>
                ))}
            </div>

            <LoopRail
                className={styles.homeLoopRail ?? ''}
                currentStage="evidence"
                evidenceLabel="confianca 84% / cobertura 82%"
                nextActionLabel="Analisar meu spray"
            />

            <div className={styles.metricGrid}>
                <MetricTile
                    helper="Mostra o quanto o tracking sustentou a leitura."
                    label="Confianca"
                    value="84%"
                />
                <MetricTile
                    helper="Frames uteis entram no score antes de qualquer coach."
                    label="Cobertura"
                    value="82%"
                    tone="success"
                />
                <MetricTile
                    helper="Blockers aparecem quando compressao, fumaca ou corte contaminam o clip."
                    label="Blockers"
                    value="0"
                    tone="warning"
                />
            </div>

            <ProductState
                action={(
                    <Link className={styles.inlineAction} href="/pricing">
                        Ver continuidade Pro
                    </Link>
                )}
                body={`Free preserva a leitura util. Pro aprofunda coach, historico e tendencias com ate 100 analises uteis salvas por ciclo Stripe.`}
                className={styles.previewStateCard ?? ''}
                state="locked"
                title="Continuidade sem esconder a verdade"
                tone="pro"
            />

            <div className={styles.previewStats}>
                <span>
                    <strong>{landingStats.weaponCount}</strong>
                    perfis no catalogo
                </span>
                <span>
                    <strong>{landingStats.analysisCount}</strong>
                    analises salvas
                </span>
            </div>
        </aside>
    );
}

export default async function HomePage(): Promise<React.JSX.Element> {
    const landingStats = await getLandingStats();
    const faqLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            {
                '@type': 'Question',
                name: 'Como funciona a analise de spray?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Sens PUBG analisa o clip no navegador, mede sinais de tracking e mostra patch, cobertura, confianca e blockers antes de sugerir um proximo bloco testavel.',
                },
            },
            {
                '@type': 'Question',
                name: 'Preciso enviar meu video para um servidor?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Nao. Os frames sao processados localmente no browser com Web Workers; o servidor controla conta, historico salvo, quota e billing.',
                },
            },
            {
                '@type': 'Question',
                name: 'O Pro promete uma sensibilidade final?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Nao. O Pro aprofunda coach, historico e tendencias compativeis, mas recomendacoes seguem como faixas de teste com evidencia, confianca e validacao.',
                },
            },
        ],
    };

    return (
        <>
            <JsonLd data={faqLd} />
            <Header />

            <div className={styles.page}>
                <section className={styles.hero} data-phase7-home="hero">
                    <div className={`container ${styles.heroGrid}`}>
                        <div className={styles.heroCopy}>
                            <BrandLockup className={styles.heroBrand ?? ''} markSize={52} />
                            <span className={styles.kicker}>Analise de spray para PUBG</span>
                            <h1>Sens PUBG</h1>
                            <p className={styles.heroLead}>
                                Envie um clip curto, veja a evidencia do tracking e transforme
                                confianca, cobertura e blockers em um proximo bloco de treino testavel.
                            </p>

                            <div className={styles.heroActions}>
                                <Link className="btn btn-primary btn-lg" href="/analyze">
                                    Analisar meu spray
                                </Link>
                                <Link className="btn btn-secondary btn-lg" href="/pricing">
                                    Ver Free e Pro
                                </Link>
                            </div>

                            <div className={styles.evidenceRow} aria-label="Sinais de verdade do produto">
                                {LOOP_FACTS.map((fact) => (
                                    <EvidenceChip
                                        detail={fact.detail}
                                        key={fact.label}
                                        label={fact.label}
                                        tone={fact.label === 'Pro' ? 'pro' : 'info'}
                                        value={fact.value}
                                    />
                                ))}
                            </div>
                            <a className={styles.nextHint} href="#loop-sens-pubg">
                                Proximo: loop solo com clip, evidencia, coach e validacao
                            </a>
                        </div>

                        <ProductLoopPreview landingStats={landingStats} />
                    </div>
                </section>

                <section className={styles.loopSection} id="loop-sens-pubg">
                    <div className={`container ${styles.loopSectionGrid}`}>
                        <div className={styles.sectionIntro}>
                            <span className={styles.kicker}>Loop solo</span>
                            <h2>O primeiro clique ja entra no produto</h2>
                            <p>
                                A home mostra o caminho que o jogador vai usar: clip, evidencia,
                                coach, bloco e validacao compativel. Marketing fica em segundo plano.
                            </p>
                        </div>

                        <div className={styles.stepGrid}>
                            {PROCESS_STEPS.map((step) => (
                                <article className={styles.stepCard} key={step.number}>
                                    <span>{step.number}</span>
                                    <h3>{step.title}</h3>
                                    <p>{step.body}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className={styles.valueSection}>
                    <div className={`container ${styles.valueGrid}`}>
                        <ProductState
                            action={(
                                <Link className={styles.inlineAction} href="/analyze">
                                    Abrir analise
                                </Link>
                            )}
                            body="Free mostra a leitura essencial, qualidade do clip, blockers e a proxima acao segura. Resultado fraco continua fraco, mesmo quando a tela esta bonita."
                            state="empty"
                            title="Free continua util"
                        />
                        <ProductState
                            action={(
                                <Link className={styles.inlineAction} href="/pricing">
                                    Entrar no Pro Founder
                                </Link>
                            )}
                            body="Pro conecta historico, tendencias compativeis, coach completo e continuidade de treino. O desbloqueio e profundidade, nao uma promessa de certeza."
                            state="locked"
                            title="Pro da continuidade"
                            tone="pro"
                        />
                        <ProductState
                            action={(
                                <Link className={styles.inlineAction} href="/pros">
                                    Abrir Sens dos Pros
                                </Link>
                            )}
                            body="Sens dos Pros e referencia publica de configuracoes profissionais. A rota paga fica em Planos e Assinatura, separada do material de referencia."
                            state="weak"
                            title="Sens dos Pros fica separado"
                            tone="warning"
                        />
                    </div>
                </section>

                <section className={styles.faq}>
                    <div className={`container ${styles.faqGrid}`}>
                        <div className={styles.sectionIntro}>
                            <span className={styles.kicker}>Perguntas frequentes</span>
                            <h2>Leitura honesta antes de decisao forte</h2>
                            <p>
                                O FAQ reforca browser-first, patch-aware, confianca, cobertura,
                                limites de captura e a diferenca entre Pro pago e Sens dos Pros.
                            </p>
                        </div>

                        <FaqAccordion />
                    </div>
                </section>
            </div>
        </>
    );
}

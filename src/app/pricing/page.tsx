import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { startProCheckout } from '@/actions/billing';
import { auth } from '@/auth';
import { PRODUCT_PRICE_CATALOG } from '@/lib/product-price-catalog';
import { resolveServerProductAccess } from '@/lib/product-access-server';
import { resolveMonetizationFlags } from '@/lib/monetization-flags';
import { Header } from '@/ui/components/header';
import { LoopRail } from '@/ui/components/loop-rail';

import styles from './page.module.css';

export const metadata: Metadata = {
    title: 'Sens PUBG Pro Founder',
    description: 'Solo-player Pro mensal para analise de clips, coach completo, historico e validacao de treino.',
};

function formatPrice(cents: number, currency: 'BRL' | 'USD'): string {
    return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
        style: 'currency',
        currency,
    }).format(cents / 100);
}

async function startFounderCheckout() {
    'use server';

    const result = await startProCheckout({ intent: 'founder_brl_monthly' });
    redirect(result.checkoutUrl);
}

const freeFeatures = [
    '3 analises uteis salvas por mes',
    'Mastery, confianca, cobertura e blockers sempre visiveis',
    'Resumo de coach e historico recente para testar o fluxo',
    'Estados inconclusivos continuam honestos, sem esconder evidencia',
] as const;

const proFeatures = [
    '100 analises uteis salvas por ciclo Stripe',
    'Plano completo do coach, protocolo de bloco e outcome',
    'Historico profundo, trends compativeis e validacao de checkpoint',
    'Metricas avancadas e suporte de founder beta controlado',
] as const;

export default async function PricingPage(): Promise<React.JSX.Element> {
    const session = await auth();
    const access = await resolveServerProductAccess(session?.user?.id);
    const flags = resolveMonetizationFlags();
    const founderPrice = PRODUCT_PRICE_CATALOG.pro_founder_brl_monthly;
    const publicPrice = PRODUCT_PRICE_CATALOG.pro_public_brl_monthly;
    const canCheckout = Boolean(session?.user?.id) && flags.checkoutEnabled && flags.founderPricingEnabled;
    const isPaid = access.effectiveTier !== 'free'
        && access.accessState !== 'past_due_blocked'
        && access.accessState !== 'canceled'
        && access.accessState !== 'suspended';

    return (
        <div className={styles.page}>
            <Header />
            <main className={styles.main}>
                <div className={`${styles.shell} ${styles.hero}`}>
                    <section className={styles.heroCopy}>
                        <p className={styles.eyebrow}>Sens PUBG Pro Founder</p>
                        <h1 className={styles.title}>Pro e continuidade, nao promessa.</h1>
                        <p className={styles.lead}>
                            O Pro vende o loop original do Sens PUBG: clip analisado no navegador, coach completo,
                            historico profundo, trends compativeis, outcomes e validacao do proximo bloco. Free continua
                            util e ve a verdade do clip; Pro abre continuidade e profundidade, mas nao promete certeza de
                            ajuste, rank ou melhora.
                        </p>
                        <LoopRail
                            currentStage="coach"
                            evidenceLabel="verdade visivel no Free"
                            nextActionLabel="continuar no Pro"
                            className={styles.loopRail ?? ''}
                        />
                        <div className={styles.heroActions}>
                            {isPaid ? (
                                <Link href="/billing" className="btn btn-primary btn-lg">
                                    Abrir Assinatura
                                </Link>
                            ) : session?.user?.id ? (
                                canCheckout ? (
                                    <form action={startFounderCheckout}>
                                        <button className="btn btn-primary btn-lg" type="submit">
                                            Entrar no Pro Founder
                                        </button>
                                    </form>
                                ) : (
                                    <span className={styles.disabledButton}>Founder beta por convite</span>
                                )
                            ) : (
                                <Link href="/login?callbackUrl=/pricing" className="btn btn-primary btn-lg">
                                    Entrar para ver convite
                                </Link>
                            )}
                            <Link href="/analyze" className="btn btn-secondary btn-lg">
                                Testar Free
                            </Link>
                        </div>
                        <div className={styles.evidenceBar} aria-label="Resumo de valor e limites">
                            <span>Free: 3 analises uteis salvas por mes</span>
                            <span>Pro: 100 analises uteis salvas por ciclo Stripe</span>
                            <span>Webhook confirma acesso Pro</span>
                        </div>
                    </section>

                    <aside className={styles.pricePanel}>
                        <p className={styles.eyebrow}>Mensal beta controlado</p>
                        <div className={styles.price}>
                            <strong>{formatPrice(founderPrice.amountCents, founderPrice.currency)}</strong>
                            <span>Founder mensal no Brasil. Publico planejado: {formatPrice(publicPrice.amountCents, publicPrice.currency)}.</span>
                        </div>
                        <div className={styles.founderStatus}>
                            <span>{flags.checkoutEnabled ? 'Checkout habilitado pelo servidor' : 'Checkout desabilitado pelo servidor'}</span>
                            <span>{flags.founderPricingEnabled ? 'Founder liberado por flag' : 'Founder beta por convite'}</span>
                        </div>
                        <p className={styles.note}>
                            Checkout e Portal sao hospedados pela Stripe. URL de sucesso nunca libera Pro sozinha;
                            o webhook precisa confirmar antes de qualquer acesso pago.
                        </p>
                    </aside>
                </div>

                <section className={`${styles.shell} ${styles.compareSection}`} aria-labelledby="free-pro-title">
                    <div className={styles.sectionHeader}>
                        <h2 id="free-pro-title">Free util. Pro continuo.</h2>
                        <p>
                            Os dois tiers parecem produto de verdade. O Free mostra evidencias e um caminho curto;
                            o Pro aprofunda coach, historico e validacao sem esconder a verdade do clip.
                        </p>
                    </div>
                    <div className={styles.planGrid}>
                        <article className={styles.planColumn}>
                            <div>
                                <span className={styles.planBadge}>Free</span>
                                <h3>Comecar com verdade do clip</h3>
                                <p>Para testar captura, ver blockers, receber resumo e decidir o proximo spray sem pagar.</p>
                            </div>
                            <ul className={styles.list}>
                                {freeFeatures.map((feature) => (
                                    <li key={feature}>{feature}</li>
                                ))}
                            </ul>
                            <Link href="/analyze" className={styles.planAction}>
                                Fazer analise Free
                            </Link>
                        </article>
                        <article className={`${styles.planColumn} ${styles.proColumn}`}>
                            <div>
                                <span className={styles.planBadge}>Pro Founder</span>
                                <h3>Continuar o loop completo</h3>
                                <p>Para quem quer transformar clips repetidos em protocolo, historico, outcome e validacao compativel.</p>
                            </div>
                            <ul className={styles.list}>
                                {proFeatures.map((feature) => (
                                    <li key={feature}>{feature}</li>
                                ))}
                            </ul>
                            {isPaid ? (
                                <Link href="/billing" className={styles.planAction}>
                                    Abrir Assinatura
                                </Link>
                            ) : session?.user?.id && canCheckout ? (
                                <form action={startFounderCheckout}>
                                    <button className={styles.planButton} type="submit">
                                        Entrar no Pro Founder
                                    </button>
                                </form>
                            ) : (
                                <Link href={session?.user?.id ? '/billing' : '/login?callbackUrl=/pricing'} className={styles.planAction}>
                                    {session?.user?.id ? 'Ver estado do convite' : 'Entrar para ver convite'}
                                </Link>
                            )}
                        </article>
                    </div>
                </section>

                <section className={`${styles.shell} ${styles.section}`}>
                    <div className={styles.sectionHeader}>
                        <h2>Compra com guarda-corpo</h2>
                        <p>
                            A superficie paga deixa claro o que e produto, o que e Stripe e o que ainda depende de verificacao manual.
                        </p>
                    </div>
                    <div className={styles.trustGrid}>
                        <article>
                            <span>01</span>
                            <h3>Servidor decide</h3>
                            <p>Pricing inicia checkout por action interna. Cliente nao envia price id, valor, moeda, tier ou periodo.</p>
                        </article>
                        <article>
                            <span>02</span>
                            <h3>Stripe confirma</h3>
                            <p>Portal e checkout ficam na Stripe; webhook e assinatura confiavel liberam o acesso, nao o URL.</p>
                        </article>
                        <article>
                            <span>03</span>
                            <h3>Beta sem falso done</h3>
                            <p>Founder beta abre devagar. O checklist Stripe em modo teste continua bloqueando launch pago se nao for refeito.</p>
                        </article>
                        <article>
                            <span>04</span>
                            <h3>Independente</h3>
                            <p>Sens PUBG nao e afiliado, endossado ou operado por PUBG/KRAFTON. Dados da API PUBG nao sao vendidos como acesso exclusivo.</p>
                        </article>
                    </div>
                </section>
            </main>
        </div>
    );
}

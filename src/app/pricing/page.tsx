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
    description: 'Plano Pro mensal para transformar clips de spray em treino continuo, historico comparavel e coach completo.',
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
    'Confianca, cobertura e bloqueios sempre visiveis',
    'Resumo de coach para saber o proximo spray',
    'Resultado inconclusivo continua honesto, sem maquiar o clip',
] as const;

const proFeatures = [
    '100 analises uteis salvas por mes de assinatura',
    'Coach completo com protocolo de bloco e resultado do treino',
    'Historico profundo, tendencias comparaveis e checkpoints',
    'Metricas avancadas e suporte de founder beta controlado',
] as const;

const decisionSignals = [
    'Clip curto',
    'Leitura honesta',
    'Treino guiado',
    'Validacao',
] as const;

const priceHighlights = [
    { label: 'Free', value: '3', helper: 'analises uteis salvas por mes' },
    { label: 'Pro', value: '100', helper: 'analises uteis por mes de assinatura' },
    { label: 'Acesso', value: 'servidor', helper: 'confirmacao Stripe antes de liberar' },
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
                        <h1 className={styles.title}>Treine o proximo spray, nao uma promessa.</h1>
                        <p className={styles.lead}>
                            Comece gratis vendo a verdade do clip. Entre no Pro quando quiser acompanhar
                            historico, coach completo, tendencias comparaveis e o proximo bloco de treino
                            com mais profundidade. Sem promessa de ajuste final, rank ou atalho milagroso.
                        </p>
                        <div className={styles.decisionRail} aria-label="Loop de decisao Pro">
                            {decisionSignals.map((signal) => (
                                <span key={signal}>{signal}</span>
                            ))}
                        </div>
                        <LoopRail
                            currentStage="coach"
                            evidenceLabel="Free mostra a leitura"
                            nextActionLabel="Pro acompanha o treino"
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
                            <span>Pro: 100 analises uteis salvas por mes de assinatura</span>
                            <span>Webhook confirma o acesso Pro</span>
                        </div>
                    </section>

                    <aside className={styles.pricePanel}>
                        <p className={styles.eyebrow}>Founder mensal</p>
                        <div className={styles.price}>
                            <strong>{formatPrice(founderPrice.amountCents, founderPrice.currency)}</strong>
                            <span>Founder mensal no Brasil. Publico planejado: {formatPrice(publicPrice.amountCents, publicPrice.currency)}.</span>
                        </div>
                        <div className={styles.priceHighlights} aria-label="Resumo rapido do plano">
                            {priceHighlights.map((highlight) => (
                                <span key={highlight.label}>
                                    <strong>{highlight.value}</strong>
                                    <small>{highlight.label}</small>
                                    {highlight.helper}
                                </span>
                            ))}
                        </div>
                        <div className={styles.founderStatus}>
                            <span>{flags.checkoutEnabled ? 'Checkout disponivel' : 'Checkout fechado no momento'}</span>
                            <span>{flags.founderPricingEnabled ? 'Founder liberado para sua conta' : 'Founder beta por convite'}</span>
                        </div>
                        <p className={styles.note}>
                            Checkout e Portal sao hospedados pela Stripe. URL de sucesso nunca libera Pro sozinha;
                            a confirmacao da Stripe (webhook) precisa chegar antes de qualquer acesso pago.
                        </p>
                    </aside>
                </div>

                <section className={`${styles.shell} ${styles.compareSection}`} aria-labelledby="free-pro-title">
                    <div className={styles.sectionHeader}>
                        <h2 id="free-pro-title">Free para testar. Pro para continuar.</h2>
                        <p>
                            O Free responde se esse clip da para ler. O Pro mostra como seguir treinando
                            sem perder contexto.
                        </p>
                    </div>
                    <div className={styles.planGrid}>
                        <article className={styles.planColumn}>
                            <div>
                                <span className={styles.planBadge}>Free</span>
                                <h3>Comecar com a leitura do clip</h3>
                                <p>Para testar captura, ver bloqueios, receber resumo e decidir o proximo spray sem pagar.</p>
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
                                <h3>Continuar com historico e coach</h3>
                                <p>Para transformar sprays repetidos em protocolo, historico, resultado do treino e validacao comparavel.</p>
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
                            A pagina vende continuidade, mas deixa claro quem confirma pagamento, acesso e limites.
                        </p>
                    </div>
                    <div className={styles.trustGrid}>
                        <article>
                            <span>01</span>
                            <h3>Servidor decide</h3>
                            <p>Voce escolhe entrar no Pro; o servidor usa o preco aprovado. O navegador nao decide valor, moeda, plano ou periodo.</p>
                        </article>
                        <article>
                            <span>02</span>
                            <h3>Stripe confirma</h3>
                            <p>Portal e checkout ficam na Stripe; webhook e assinatura confiavel liberam o acesso, nao o URL de sucesso.</p>
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

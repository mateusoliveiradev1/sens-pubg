import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { startProCheckout } from '@/actions/billing';
import { auth } from '@/auth';
import { PRODUCT_PRICE_CATALOG } from '@/lib/product-price-catalog';
import { resolveServerProductAccess } from '@/lib/product-access-server';
import { resolveMonetizationFlags } from '@/lib/monetization-flags';
import { Header } from '@/ui/components/header';

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
                    <section className={styles.panel}>
                        <p className={styles.eyebrow}>Sens PUBG Pro Founder</p>
                        <h1 className={styles.title}>Clip real, coach completo, proximo bloco claro.</h1>
                        <p className={styles.lead}>
                            Pro vende o loop original do Sens PUBG: analise local do seu spray, plano de treino completo,
                            historico profundo, trends compativeis e validacao do proximo bloco. O produto e independente
                            de PUBG/KRAFTON e nao promete certeza de ajuste, rank ou melhora.
                        </p>
                        <div className={styles.heroActions}>
                            {isPaid ? (
                                <Link href="/billing" className="btn btn-primary btn-lg">
                                    Abrir billing
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
                    </section>

                    <aside className={styles.pricePanel}>
                        <p className={styles.eyebrow}>Mensal beta</p>
                        <div className={styles.price}>
                            <strong>{formatPrice(founderPrice.amountCents, founderPrice.currency)}</strong>
                            <span>Founder mensal no Brasil. Publico planejado: {formatPrice(publicPrice.amountCents, publicPrice.currency)}.</span>
                        </div>
                        <ul className={styles.list}>
                            <li>Free: 3 analises uteis salvas por mes.</li>
                            <li>Pro: 100 analises uteis salvas por ciclo Stripe.</li>
                            <li>Free ve verdade, confianca e resumo. Pro abre o loop completo.</li>
                            <li>Precos anuais ficam inativos nesta fase.</li>
                        </ul>
                        <p className={styles.note}>
                            Checkout e Portal sao hospedados pela Stripe. URL de sucesso nunca libera Pro sozinha; o webhook precisa confirmar.
                        </p>
                    </aside>
                </div>

                <section className={`${styles.shell} ${styles.section}`}>
                    <div className={styles.sectionHeader}>
                        <h2>Loop Pro</h2>
                        <p>
                            O valor pago fica no trabalho original do Sens PUBG: clip, coach, historico, validacao e operacao solo.
                            Dados derivados da API PUBG nao sao vendidos como acesso exclusivo.
                        </p>
                    </div>
                    <div className={styles.flowGrid}>
                        {[
                            ['01', 'Clip', 'Capture arma, mira, distancia, postura e attachments com spray continuo e crosshair visivel.'],
                            ['02', 'Evidencia', 'O resultado mostra mastery, confianca, cobertura, blockers e estado inconclusivo quando necessario.'],
                            ['03', 'Protocolo', 'Pro libera plano completo, protocolo de bloco, metricas avancadas e loop de outcome.'],
                            ['04', 'Validacao', 'Historico e trends compativeis mostram direcao sem misturar contexto incompativel.'],
                        ].map(([step, title, body]) => (
                            <article key={step} className={styles.flowCard}>
                                <span>{step}</span>
                                <h3>{title}</h3>
                                <p>{body}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className={`${styles.shell} ${styles.section}`}>
                    <div className={styles.sectionHeader}>
                        <h2>Beta honesto</h2>
                        <p>
                            Founder beta abre devagar, com suporte e checklist Stripe em modo teste antes de cobrar usuarios reais.
                        </p>
                    </div>
                    <div className={styles.faqGrid}>
                        <article className={styles.faqItem}>
                            <h3>Cancelamento</h3>
                            <p>Cancelamento pelo Billing Portal preserva historico; Pro segue conforme periodo/graca aplicavel.</p>
                        </article>
                        <article className={styles.faqItem}>
                            <h3>Reembolso e disputa</h3>
                            <p>Stripe e suporte comandam o fluxo. Historico nao e apagado como ameaca ou punicao.</p>
                        </article>
                        <article className={styles.faqItem}>
                            <h3>Independencia</h3>
                            <p>Sens PUBG nao e afiliado, endossado ou operado por PUBG/KRAFTON.</p>
                        </article>
                    </div>
                </section>
            </main>
        </div>
    );
}

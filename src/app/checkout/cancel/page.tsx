import type { Metadata } from 'next';
import Link from 'next/link';

import { EvidenceChip } from '@/ui/components/evidence-chip';
import { Header } from '@/ui/components/header';

import styles from '../../billing/billing.module.css';

export const metadata: Metadata = {
    title: 'Checkout cancelado',
    description: 'Checkout Pro cancelado sem alterar historico ou acesso Free.',
};

export default function CheckoutCancelPage(): React.JSX.Element {
    return (
        <div className={styles.page}>
            <Header />
            <main className={styles.main}>
                <section className={styles.shell} aria-labelledby="checkout-cancel-title">
                    <div className={styles.receiptPanel}>
                        <div className={styles.chips} aria-label="Status do cancelamento">
                            <EvidenceChip label="Checkout" value="cancelado" tone="warning" />
                            <EvidenceChip label="Historico" value="preservado" tone="success" />
                            <EvidenceChip label="Free" value="ativo" tone="info" />
                        </div>
                        <div>
                            <p className={styles.eyebrow}>Checkout cancelado</p>
                            <h1 id="checkout-cancel-title">Nada foi alterado no seu historico</h1>
                            <p>
                                Voce voltou antes de concluir o Checkout. O Free continua disponivel com 3 analises uteis
                                salvas por mes, e seus registros existentes nao sao apagados por cancelar, pausar ou
                                revisar uma compra.
                            </p>
                        </div>
                        <div className={styles.receiptMeta} aria-label="Opcoes apos cancelamento">
                            <span>
                                Acesso atual
                                <strong>Free preservado</strong>
                            </span>
                            <span>
                                Compra
                                <strong>sem pressao</strong>
                            </span>
                            <span>
                                Proxima acao
                                <strong>analisar ou rever Pro</strong>
                            </span>
                        </div>
                        <div className={styles.receiptActions}>
                            <Link href="/pricing" className="btn btn-primary">
                                Voltar ao Pro
                            </Link>
                            <Link href="/analyze" className="btn btn-secondary">
                                Fazer analise Free
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}

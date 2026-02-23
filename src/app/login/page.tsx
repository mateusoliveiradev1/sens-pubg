/**
 * Login Page — Auth cards para Discord e Google.
 */

import { Header } from '@/ui/components/header';
import type { Metadata } from 'next';
import styles from './login.module.css';

export const metadata: Metadata = {
    title: 'Entrar',
    description: 'Conecte-se para salvar suas análises e acompanhar seu progresso.',
};

export default function LoginPage(): React.JSX.Element {
    return (
        <>
            <Header />
            <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className={styles.loginCard}>
                    <div className={styles.loginIcon}>◎</div>
                    <h1 className={styles.loginTitle}>Entrar</h1>
                    <p className={styles.loginSubtitle}>
                        Conecte-se para salvar suas análises e acompanhar seu progresso ao longo do tempo.
                    </p>

                    <div className={styles.providers}>
                        <form action="/api/auth/signin/discord" method="POST">
                            <button type="submit" className={`${styles.providerBtn} ${styles.discord}`}>
                                <span className={styles.providerIcon}>🎮</span>
                                Continuar com Discord
                            </button>
                        </form>

                        <form action="/api/auth/signin/google" method="POST">
                            <button type="submit" className={`${styles.providerBtn} ${styles.google}`}>
                                <span className={styles.providerIcon}>🔍</span>
                                Continuar com Google
                            </button>
                        </form>
                    </div>

                    <p className={styles.terms}>
                        Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade.
                    </p>
                </div>
            </div>
        </>
    );
}

import Link from 'next/link';
import styles from './footer.module.css';

export function Footer(): React.JSX.Element {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.top}>
                    <div className={styles.brand}>
                        <div className={styles.logo}>
                            <div className={styles.iconRing} aria-hidden="true" />
                            <div className={styles.iconDot} aria-hidden="true" />
                            <span className={styles.logoText}>PUBG Aim Analyzer</span>
                        </div>
                        <p className={styles.desc}>
                            Seu coach de aim pessoal impulsionado por IA. Melhore seu spray,
                            otimize sua sensibilidade e acompanhe seu progresso ao longo do tempo.
                        </p>
                    </div>

                    <div className={styles.linksBlock}>
                        <h3 className={styles.linksTitle}>Recursos</h3>
                        <ul className={styles.linksList}>
                            <li><Link href="/analyze" className={styles.link}>Analisador de Spray</Link></li>
                            <li><Link href="/pros" className={styles.link}>Pro Players (Base de Dados)</Link></li>
                            <li><Link href="/profile" className={styles.link}>Meu Hardware</Link></li>
                            <li><Link href="/history" className={styles.link}>Histórico</Link></li>
                        </ul>
                    </div>

                    <div className={styles.linksBlock}>
                        <h3 className={styles.linksTitle}>Legal</h3>
                        <ul className={styles.linksList}>
                            <li><Link href="/terms" className={styles.link}>Termos de Uso</Link></li>
                            <li><Link href="/privacy" className={styles.link}>Política de Privacidade</Link></li>
                            <li><a href="mailto:contato@sens-pubg.vercel.app" className={styles.link}>Contato</a></li>
                        </ul>
                    </div>
                </div>

                <div className={styles.bottom}>
                    <p className={styles.copyright}>
                        &copy; {new Date().getFullYear()} PUBG Aim Analyzer. Criado para a comunidade de PUBG.
                        <br />
                        Este projeto não é afiliado ou patrocinado pela KRAFTON, Inc. ou PUBG Corporation.
                    </p>
                </div>
            </div>
        </footer>
    );
}

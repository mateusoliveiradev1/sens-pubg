/**
 * Header Component — Navegação principal com logo, links e language switcher.
 */

import Link from 'next/link';
import styles from './header.module.css';

export function Header(): React.JSX.Element {
    return (
        <header className={styles.header} role="banner">
            <nav className={`${styles.nav} container`} aria-label="Navegação principal">
                <Link href="/" className={styles.logo} aria-label="PUBG Aim Analyzer - Início">
                    <span className={styles.logoIcon}>◎</span>
                    <span className={styles.logoText}>
                        AIM<span className={styles.logoAccent}>ANALYZER</span>
                    </span>
                </Link>

                <ul className={styles.links} role="list">
                    <li><Link href="/analyze" className={styles.link}>Analisar</Link></li>
                    <li><Link href="/history" className={styles.link}>Histórico</Link></li>
                    <li><Link href="/profile" className={styles.link}>Perfil</Link></li>
                </ul>

                <div className={styles.actions}>
                    <Link href="/login" className="btn btn-primary">
                        Entrar
                    </Link>
                </div>
            </nav>
        </header>
    );
}

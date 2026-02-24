/**
 * Header Component — Session-aware navigation.
 * Shows user avatar + sign out when logged in, login button when not.
 */

import Link from 'next/link';
import { auth } from '@/auth';
import { UserDropdown } from './user-dropdown';
import styles from './header.module.css';

export async function Header(): Promise<React.JSX.Element> {
    const session = await auth();
    const user = session?.user;

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
                    <li><Link href="/pros" className={styles.link}>Pros</Link></li>
                    <li><Link href="/history" className={styles.link}>Histórico</Link></li>
                </ul>

                <div className={styles.actions}>
                    {user ? (
                        <UserDropdown user={user} />
                    ) : (
                        <Link href="/login" className="btn btn-primary">
                            Entrar
                        </Link>
                    )}
                </div>
            </nav>
        </header>
    );
}

/**
 * Header Component — Session-aware navigation.
 * Shows user avatar + sign out when logged in, login button when not.
 */

import Link from 'next/link';
import { auth } from '@/auth';
import { UserDropdown } from './user-dropdown';
import { MobileNav } from './mobile-nav';
import styles from './header.module.css';

export async function Header(): Promise<React.JSX.Element> {
    const session = await auth();
    const user = session?.user;

    return (
        <header className={styles.header} role="banner">
            <nav className={`${styles.nav} container`} role="navigation" aria-label="Navegação Principal">
                <Link href="/" className={styles.logo} aria-label="SENS-PUBG Início">
                    <span className={styles.logoIcon}>◎</span>
                    <span className={styles.logoText}>
                        AIM<span className={styles.logoAccent}>ANALYZER</span>
                    </span>
                </Link>

                <ul className={styles.links} role="menubar">
                    <li role="none"><Link href="/dashboard" className={styles.link} role="menuitem">Dashboard</Link></li>
                    <li role="none"><Link href="/analyze" className={styles.link} role="menuitem">Analisar</Link></li>
                    <li role="none"><Link href="/pros" className={styles.link} role="menuitem">Pros</Link></li>
                    <li role="none"><Link href="/history" className={styles.link} role="menuitem">Histórico</Link></li>
                </ul>

                <div className={styles.actions}>
                    {user ? (
                        <UserDropdown user={user} />
                    ) : (
                        <Link href="/login" className="btn btn-primary">
                            Entrar
                        </Link>
                    )}
                    <MobileNav user={user} />
                </div>
            </nav>
        </header>
    );
}

/**
 * Header Component - Session-aware navigation.
 * Shows user avatar + sign out when logged in, login button when not.
 */

import Link from 'next/link';
import { auth } from '@/auth';
import { BrandLockup } from './brand-lockup';
import { MobileNav } from './mobile-nav';
import { UserDropdown } from './user-dropdown';
import styles from './header.module.css';

export async function Header(): Promise<React.JSX.Element> {
    const session = await auth();
    const user = session?.user;

    return (
        <header className={styles.header} role="banner">
            <nav className={`${styles.nav} container`} role="navigation" aria-label="Navegacao principal">
                <Link href="/" className={styles.logo} aria-label="Sens PUBG inicio">
                    <BrandLockup markSize={30} variant="default" />
                </Link>

                <ul className={styles.links}>
                    <li><Link href="/analyze" className={styles.link}>Analisar</Link></li>
                    <li><Link href="/dashboard" className={styles.link}>Dashboard</Link></li>
                    <li><Link href="/history" className={styles.link}>Historico</Link></li>
                    <li><Link href="/pros" className={styles.link}>Sens dos Pros</Link></li>
                    <li><Link href="/community" className={styles.link}>Comunidade</Link></li>
                    <li><Link href="/pricing" className={styles.link}>Planos</Link></li>
                </ul>

                <div className={styles.actions}>
                    {user ? (
                        <>
                            <Link href="/billing" className="btn btn-secondary">
                                Assinatura
                            </Link>
                            <UserDropdown user={user} />
                        </>
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

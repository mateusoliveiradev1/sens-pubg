'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BrandLockup } from './brand-lockup';
import styles from './mobile-nav.module.css';

interface MobileNavProps {
    readonly user?: {
        name?: string | null;
        image?: string | null;
        role?: string;
    } | null | undefined;
}

type GlyphKind = 'target' | 'grid' | 'audit' | 'pros' | 'community' | 'plan' | 'billing' | 'admin';

interface MobileRoute {
    readonly href: string;
    readonly label: string;
    readonly glyph: GlyphKind;
    readonly adminOnly?: boolean;
    readonly loggedInOnly?: boolean;
}

const MOBILE_ROUTES: readonly MobileRoute[] = [
    { href: '/admin', label: 'Painel Admin', glyph: 'admin', adminOnly: true },
    { href: '/analyze', label: 'Analisar', glyph: 'target' },
    { href: '/dashboard', label: 'Dashboard', glyph: 'grid' },
    { href: '/history', label: 'Historico', glyph: 'audit' },
    { href: '/pros', label: 'Sens dos Pros', glyph: 'pros' },
    { href: '/community', label: 'Comunidade', glyph: 'community' },
    { href: '/pricing', label: 'Planos', glyph: 'plan' },
    { href: '/billing', label: 'Assinatura', glyph: 'billing', loggedInOnly: true },
];

function NavGlyph({ kind }: { readonly kind: GlyphKind }): React.JSX.Element {
    const pathByKind: Record<GlyphKind, string> = {
        target: 'M12 3v4M12 17v4M3 12h4M17 12h4M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z',
        grid: 'M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z',
        audit: 'M6 4h12v16H6zM9 8h6M9 12h6M9 16h4',
        pros: 'M5 16c3-7 7-10 14-12M6 17l4 3 8-8',
        community: 'M7 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 19c1-4 5-5 8-3 3-2 7-1 8 3',
        plan: 'M5 5h14v14H5zM8 9h8M8 13h8M8 17h5',
        billing: 'M4 7h16v10H4zM4 10h16M8 15h4',
        admin: 'M12 3l8 4v5c0 4-3 7-8 9-5-2-8-5-8-9V7z',
    };

    return (
        <span className={styles.icon} aria-hidden="true">
            <svg fill="none" viewBox="0 0 24 24">
                <path d={pathByKind[kind]} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
        </span>
    );
}

export function MobileNav({ user }: MobileNavProps): React.JSX.Element {
    const [isOpen, setIsOpen] = useState(false);
    const isStaff = ['admin', 'mod', 'support'].includes(user?.role || '');

    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : 'unset';

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const toggleMenu = () => setIsOpen((current) => !current);
    const closeMenu = () => setIsOpen(false);
    const visibleRoutes = MOBILE_ROUTES.filter((route) => {
        if (route.adminOnly && !isStaff) {
            return false;
        }

        if (route.loggedInOnly && !user) {
            return false;
        }

        return true;
    });

    return (
        <div className={styles.mobileNav}>
            <button
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
                className={`${styles.hamburger} ${isOpen ? styles.active : ''}`}
                onClick={toggleMenu}
                type="button"
            >
                <span />
                <span />
                <span />
            </button>

            {isOpen ? (
                <div className={styles.overlay} onClick={closeMenu} role="presentation">
                    <div
                        aria-label="Menu de navegacao mobile"
                        aria-modal="true"
                        className={styles.menu}
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                    >
                        <div className={styles.header}>
                            <BrandLockup markSize={28} variant="default" />
                            <button className={styles.closeButton} onClick={closeMenu} type="button">
                                Fechar
                            </button>
                        </div>

                        <ul className={styles.links}>
                            {visibleRoutes.map((route) => (
                                <li key={route.href}>
                                    <Link href={route.href} className={styles.link} onClick={closeMenu}>
                                        <NavGlyph kind={route.glyph} />
                                        {route.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        <div className={styles.footer}>
                            {!user ? (
                                <Link href="/login" className="btn btn-primary btn-block" onClick={closeMenu}>
                                    Entrar
                                </Link>
                            ) : null}
                            <p className={styles.copyright}>(c) 2026 Sens PUBG</p>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

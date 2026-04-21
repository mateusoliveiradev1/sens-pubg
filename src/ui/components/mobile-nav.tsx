'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './mobile-nav.module.css';

interface MobileNavProps {
    readonly user?: {
        name?: string | null;
        image?: string | null;
        role?: string;
    } | null | undefined;
}

export function MobileNav({ user }: MobileNavProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Prevent scrolling when menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const toggleMenu = () => setIsOpen(!isOpen);
    const closeMenu = () => setIsOpen(false);

    return (
        <div className={styles.mobileNav}>
            <button
                className={`${styles.hamburger} ${isOpen ? styles.active : ''}`}
                onClick={toggleMenu}
                aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={isOpen}
            >
                <span />
                <span />
                <span />
            </button>

            {isOpen && (
                <div className={styles.overlay} onClick={closeMenu} role="presentation">
                    <div
                        className={styles.menu}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menu de navegação mobile"
                    >
                        <div className={styles.header}>
                            <span className={styles.logoIcon}>◎</span>
                            <span className={styles.logoText}>MEN<span className={styles.logoAccent}>U</span></span>
                        </div>

                        <ul className={styles.links}>
                            {(['admin', 'mod', 'support'].includes(user?.role || '')) && (
                                <li>
                                    <Link href="/admin" className={styles.link} style={{ color: 'var(--accent-primary)' }} onClick={closeMenu}>
                                        <span className={styles.icon} aria-hidden="true">🛡️</span> Painel Admin
                                    </Link>
                                </li>
                            )}
                            <li>
                                <Link href="/analyze" className={styles.link} onClick={closeMenu}>
                                    <span className={styles.icon} aria-hidden="true">📊</span> Analisar
                                </Link>
                            </li>
                            <li>
                                <Link href="/community" className={styles.link} onClick={closeMenu}>
                                    <span className={styles.icon} aria-hidden="true">🌐</span> Comunidade
                                </Link>
                            </li>
                            <li>
                                <Link href="/history" className={styles.link} onClick={closeMenu}>
                                    <span className={styles.icon} aria-hidden="true">🕰️</span> Histórico
                                </Link>
                            </li>
                            <li>
                                <Link href="/pros" className={styles.link} onClick={closeMenu}>
                                    <span className={styles.icon} aria-hidden="true">🎯</span> Pros
                                </Link>
                            </li>
                        </ul>

                        <div className={styles.footer}>
                            {!user && (
                                <Link href="/login" className="btn btn-primary btn-block" onClick={closeMenu}>
                                    Entrar
                                </Link>
                            )}
                            <p className={styles.copyright}>© 2024 SENS-PUBG</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

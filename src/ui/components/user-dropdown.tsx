'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { handleSignOut } from '@/actions/auth';
import styles from './user-dropdown.module.css';

interface UserDropdownProps {
    user: {
        name?: string | null;
        image?: string | null;
        role?: string;
    };
}

function AccountGlyph({ label }: { readonly label: string }): React.JSX.Element {
    return (
        <span className={styles.icon} aria-hidden="true">
            {label}
        </span>
    );
}

function formatUserRole(role: string | undefined): string {
    if (role === 'admin') {
        return 'Administrador';
    }

    if (role === 'mod') {
        return 'Moderador';
    }

    if (role === 'support') {
        return 'Suporte';
    }

    return 'Jogador';
}

export function UserDropdown({ user }: UserDropdownProps): React.JSX.Element {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isStaff = ['admin', 'mod', 'support'].includes(user.role || '');

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={styles.dropdownContainer} ref={dropdownRef}>
            <button
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-label="Abrir menu da conta"
                className={styles.trigger}
                onClick={() => setIsOpen((current) => !current)}
                type="button"
            >
                {user.image ? (
                    <Image
                        alt={user.name ?? 'Avatar'}
                        className={styles.avatar}
                        height={36}
                        src={user.image}
                        width={36}
                    />
                ) : (
                    <div className={styles.avatarFallback}>
                        {(user.name ?? 'U').charAt(0).toUpperCase()}
                    </div>
                )}
            </button>

            {isOpen ? (
                <div className={`${styles.menu} ${styles.animateScaleIn}`}>
                    <div className={styles.userInfo}>
                        <p className={styles.userName}>{user.name}</p>
                        <p className={styles.userRole}>{formatUserRole(user.role)}</p>
                    </div>

                    <div className={styles.divider} />

                    {isStaff ? (
                        <>
                            <Link href="/admin" className={`${styles.menuItem} ${styles.adminLink}`} onClick={() => setIsOpen(false)}>
                                <AccountGlyph label="AD" />
                                Painel Admin
                            </Link>
                            <div className={styles.divider} />
                        </>
                    ) : null}

                    <Link href="/profile" className={styles.menuItem} onClick={() => setIsOpen(false)}>
                        <AccountGlyph label="ID" />
                        Seu Perfil
                    </Link>

                    <Link href="/profile/settings" className={styles.menuItem} onClick={() => setIsOpen(false)}>
                        <AccountGlyph label="CFG" />
                        Configuracoes
                    </Link>

                    <div className={styles.divider} />

                    <form action={handleSignOut}>
                        <button type="submit" className={styles.menuItemDanger}>
                            <AccountGlyph label="SAI" />
                            Sair
                        </button>
                    </form>
                </div>
            ) : null}
        </div>
    );
}

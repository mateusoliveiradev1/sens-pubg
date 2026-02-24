'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './user-dropdown.module.css';

interface UserDropdownProps {
    user: {
        name?: string | null;
        image?: string | null;
    };
}

export function UserDropdown({ user }: UserDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
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
                className={styles.trigger}
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                {user.image ? (
                    <Image
                        src={user.image}
                        alt={user.name ?? 'Avatar'}
                        className={styles.avatar}
                        width={36}
                        height={36}
                    />
                ) : (
                    <div className={styles.avatarFallback}>
                        {(user.name ?? 'U').charAt(0).toUpperCase()}
                    </div>
                )}
            </button>

            {isOpen && (
                <div className={`${styles.menu} animate-scale-in`}>
                    <div className={styles.userInfo}>
                        <p className={styles.userName}>{user.name}</p>
                        <p className={styles.userRole}>Pro Player</p>
                    </div>

                    <div className={styles.divider} />

                    <Link href="/profile" className={styles.menuItem} onClick={() => setIsOpen(false)}>
                        <span className={styles.icon}>🎯</span>
                        Seu Perfil
                    </Link>

                    <Link href="/profile/settings" className={styles.menuItem} onClick={() => setIsOpen(false)}>
                        <span className={styles.icon}>⚙️</span>
                        Configurações
                    </Link>

                    <div className={styles.divider} />

                    <form action="/api/auth/signout" method="POST">
                        <button type="submit" className={styles.menuItemDanger}>
                            <span className={styles.icon}>🚪</span>
                            Sair
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

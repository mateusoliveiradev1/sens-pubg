'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../admin.module.css';

export function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const onChange = (val: string) => {
        setQuery(val);
        if (val.length >= 2) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && query) {
            // Redirect to user list with filter
            router.push(`/admin/users?search=${encodeURIComponent(query)}`);
            setIsOpen(false);
        }
    };

    return (
        <div className={styles.searchWrapper} ref={searchRef}>
            <input
                type="text"
                placeholder="Buscar usuário ou ID... (Enter)"
                className={styles.topSearch}
                value={query}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={() => query.length >= 2 && setIsOpen(true)}
            />
            {isOpen && query.length >= 2 && (
                <div className={styles.searchResults}>
                    <div className={styles.searchHint}>
                        Pressione <strong>Enter</strong> para pesquisar por &quot;{query}&quot;
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useState } from 'react';
import { toggleMaintenanceMode } from '@/actions/settings';
import styles from '../admin.module.css';

interface MaintenanceToggleProps {
    initialValue: boolean;
}

export function MaintenanceToggle({ initialValue }: MaintenanceToggleProps) {
    const [enabled, setEnabled] = useState(initialValue);
    const [loading, setLoading] = useState(false);

    const handleToggle = async () => {
        setLoading(true);
        try {
            const result = await toggleMaintenanceMode(!enabled);
            if (result.success) {
                setEnabled(!enabled);
            } else {
                alert('Erro ao alterar modo de manutenção');
            }
        } catch (error) {
            alert('Erro de conexão');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={loading}
            className={`${styles.toggleButton} ${enabled ? styles.active : ''}`}
        >
            {loading ? 'Processando...' : enabled ? 'Desativar Manutenção' : 'Ativar Manutenção'}
        </button>
    );
}

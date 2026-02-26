'use client';

import { useState } from 'react';
import { updateUserRole } from '../../../actions/admin';
import styles from '../admin.module.css';

interface RoleSelectorProps {
    userId: string;
    currentRole: string;
}

export function RoleSelector({ userId, currentRole }: RoleSelectorProps) {
    const [role, setRole] = useState(currentRole);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleRoleChange = async (newRole: string) => {
        if (newRole === role) return;

        setIsUpdating(true);
        try {
            const result = await updateUserRole(userId, newRole);
            if (result.success) {
                setRole(newRole);
            } else {
                alert('Erro ao atualizar cargo');
            }
        } catch (err) {
            console.error(err);
            alert('Erro de conexão');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <select
            value={role}
            onChange={(e) => handleRoleChange(e.target.value)}
            disabled={isUpdating}
            className={`${styles.roleSelect} ${styles[role]}`}
        >
            <option value="user">USER</option>
            <option value="support">SUPPORT</option>
            <option value="mod">MOD</option>
            <option value="admin">ADMIN</option>
        </select>
    );
}

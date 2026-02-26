import { db } from '@/db';
import { users, type User } from '@/db/schema';
import { desc } from 'drizzle-orm';
import Image from 'next/image';
import { RoleSelector } from './role-selector';
import styles from '../admin.module.css';

export default async function UserManagementPage() {
    const allUsers: User[] = await db.query.users.findMany({
        orderBy: [desc(users.createdAt)],
    });

    return (
        <div className={styles.userManagement}>
            <header className={styles.pageHeader}>
                <h1>Gestão de Usuários</h1>
                <p>Visualize e gerencie as permissões dos usuários do sistema.</p>
            </header>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Usuário</th>
                            <th>Email</th>
                            <th>Discord ID</th>
                            <th>Cargo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allUsers.map((user) => (
                            <tr key={user.id}>
                                <td className={styles.userCell}>
                                    <div className={styles.smallAvatar}>
                                        {user.image ? (
                                            <Image src={user.image} alt="" width={32} height={32} />
                                        ) : (
                                            <span>{user.name?.charAt(0) || 'U'}</span>
                                        )}
                                    </div>
                                    <span>{user.name}</span>
                                </td>
                                <td>{user.email}</td>
                                <td>{user.discordId || <span className={styles.dim}>Não vinculado</span>}</td>
                                <td>
                                    <RoleSelector userId={user.id} currentRole={user.role} />
                                </td>
                                <td>
                                    <button className={styles.actionBtn} title="Ver Perfil">👁️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

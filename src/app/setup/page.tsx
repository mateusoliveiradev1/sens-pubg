import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { SetupForm } from './setup-form';
import { buildSetupWizardInitialData } from './setup-defaults';
import { Header } from '@/ui/components/header';

export default async function SetupPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/login');
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        with: {
            profile: true,
        },
    });

    if (!user) {
        redirect('/login');
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="page animate-fade-in">
                <div className="container" style={{ maxWidth: '1120px', margin: '0 auto' }}>
                    <SetupForm
                        initialData={buildSetupWizardInitialData({
                            profile: user.profile,
                            user,
                        })}
                    />
                </div>
            </main>
        </div>
    );
}

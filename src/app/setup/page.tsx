import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { SetupForm } from './setup-form';
import { Header } from '@/ui/components/header';

export default async function SetupPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/login');
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
    });

    if (!user) {
        redirect('/login');
    }

    // Optional: If user already has these filled, maybe they don't need the wizard?
    // But it's better to let them update it if they access this page.

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 flex items-center justify-center p-6 bg-grid-pattern">
                <div className="w-full max-w-4xl">
                    <SetupForm initialData={{
                        resolution: user.resolution,
                        fov: user.fov,
                        mouseDpi: user.mouseDpi,
                        sensGeneral: user.sensGeneral,
                        sens1x: user.sens1x,
                        sens3x: user.sens3x,
                        sens4x: user.sens4x,
                    }} />
                </div>
            </main>
        </div>
    );
}

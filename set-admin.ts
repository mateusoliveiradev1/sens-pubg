import { config } from 'dotenv';
import { db } from './src/db';
import { users } from './src/db/schema';
import { eq } from 'drizzle-orm';
config({ path: '.env.local' });

async function setAdmin() {
    const email = process.argv[2];
    if (!email) {
        console.error('Please provide an email: npx tsx set-admin.ts user@example.com');
        return;
    }

    try {
        const result = await db.update(users)
            .set({ role: 'admin' })
            .where(eq(users.email, email))
            .returning();

        if (result.length > 0) {
            console.log(`User ${email} promoted to ADMIN successfully!`);
        } else {
            console.log(`User ${email} not found.`);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

setAdmin().catch(console.error);

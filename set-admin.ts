import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables IMMEDIATELY
config({ path: resolve(process.cwd(), '.env.local') });

async function setAdmin() {
    const email = process.argv[2];
    if (!email) {
        console.error('Please provide an email: npx tsx set-admin.ts user@example.com');
        return;
    }

    try {
        // Dynamic imports to prevent early validation of src/env.ts
        const { db } = await import('./src/db');
        const { users } = await import('./src/db/schema');
        const { eq } = await import('drizzle-orm');

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

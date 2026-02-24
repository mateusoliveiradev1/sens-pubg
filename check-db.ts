import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function checkSchema() {
    try {
        const result = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'player_profiles'
            ORDER BY ordinal_position;
        `);
        console.log('Columns and Types:');
        result.rows.forEach(r => console.log(`- ${r.column_name}: ${r.data_type}`));
    } catch (err) {
        console.error('Error checking schema:', err);
    }
    process.exit(0);
}

checkSchema();

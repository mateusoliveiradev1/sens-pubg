/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv/config');
const { neon } = require('@neondatabase/serverless');

async function getLatestAnalyses() {
    const sql = neon(process.env.DATABASE_URL);
    const results = await sql`SELECT id, weapon_id, scope_id, distance, stability_score as stability, vertical_control as vci, horizontal_noise as noise, recoil_response_ms as response, drift_bias, full_result FROM analysis_sessions ORDER BY created_at DESC LIMIT 5`;

    const fs = require('fs');
    fs.writeFileSync('analyses_dump.json', JSON.stringify(results, null, 2));
    console.log('Saved to analyses_dump.json');
}

getLatestAnalyses().catch(console.error);

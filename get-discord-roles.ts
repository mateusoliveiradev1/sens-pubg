import { config } from 'dotenv';
import { resolve } from 'path';

// Force load environment variables FIRST
config({ path: resolve(process.cwd(), '.env.local') });

interface DiscordRole {
    id: string;
    name: string;
}

async function getRoles() {
    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.BOT_API_KEY;

    if (!guildId || !botToken) {
        console.error('Missing DISCORD_GUILD_ID or BOT_API_KEY in .env.local');
        return;
    }

    try {
        const response = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
            headers: { Authorization: `Bot ${botToken}` }
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Failed to fetch roles:', err);
            return;
        }

        const roles = await response.json() as DiscordRole[];
        console.log('\n--- Discord Roles for Guild:', guildId, '---');
        roles.forEach((role) => {
            console.log(`- Name: ${role.name} | ID: ${role.id}`);
        });
        console.log('-------------------------------------------\n');
    } catch (err) {
        console.error('Error:', err);
    }
}

getRoles().catch(console.error);

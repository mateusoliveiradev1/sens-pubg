import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('setup onboarding persistence contract', () => {
    it('creates or updates the durable player profile instead of only touching legacy user columns', () => {
        const source = readFileSync(join(process.cwd(), 'src/actions/setup.ts'), 'utf8');

        expect(source).toContain('playerProfiles');
        expect(source).toContain('buildPlayerProfilePersistenceData');
        expect(source).toContain('buildUserSetupPersistenceData');
        expect(source).toContain('db.insert(playerProfiles)');
        expect(source).toContain("revalidatePath('/analyze')");
        expect(source).toContain("revalidatePath('/profile')");
    });
});

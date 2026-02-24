'use server';

import { signOut } from '@/auth';

/**
 * Server Action to sign out the user.
 * This is used by client components since they cannot import signOut directly from @/auth.
 */
export async function handleSignOut() {
    await signOut({ redirectTo: '/' });
}

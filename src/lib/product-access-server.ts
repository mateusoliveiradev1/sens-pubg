import 'server-only';

import { db } from '@/db';
import {
    createDrizzleQuotaLedgerRepository,
    resolveAnalysisSaveAccessWithResolution,
} from '@/lib/quota-ledger';
import {
    resolveProductAccess,
    type ProductAccessResolution,
} from '@/lib/product-entitlements';

export async function resolveServerProductAccess(
    userId: string | null | undefined,
): Promise<ProductAccessResolution> {
    if (!userId) {
        return resolveProductAccess();
    }

    try {
        return (await resolveAnalysisSaveAccessWithResolution({
            repository: createDrizzleQuotaLedgerRepository(db),
            userId,
        })).access;
    } catch {
        return resolveProductAccess({ userId });
    }
}

import { describe, expect, it } from 'vitest';

import {
    isProductEntitlementKey,
    parseProductEntitlementKey,
    productEntitlementKeyValues,
} from './monetization';

describe('monetization type contracts', () => {
    it('keeps Team Coach entitlements in the canonical product key contract', () => {
        expect(productEntitlementKeyValues).toEqual(expect.arrayContaining([
            'team.player_review',
            'team.seats',
        ]));
        expect(isProductEntitlementKey('team.player_review')).toBe(true);
        expect(isProductEntitlementKey('team.seats')).toBe(true);
        expect(() => parseProductEntitlementKey('team.client_state_grant')).toThrow();
    });
});

import { createSearchParamsCache, parseAsString } from 'nuqs/server';

export const loginSearchParamsCache = createSearchParamsCache({
    callbackUrl: parseAsString.withDefault('/analyze'),
});

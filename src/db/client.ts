import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import type { ExtractTablesWithRelations } from 'drizzle-orm/relations';
import { Pool } from 'pg';
import * as schema from './schema';

const LOCAL_DATABASE_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

type GlobalNodePgPool = typeof globalThis & {
    __sensPubgNodePgPool?: Pool;
};

type AppDatabase = PgDatabase<PgQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>> & {
    $client: unknown;
};

function isLocalTcpDatabaseUrl(connectionString: string): boolean {
    try {
        const hostname = new URL(connectionString).hostname.replace(/^\[(.*)\]$/, '$1');
        return LOCAL_DATABASE_HOSTNAMES.has(hostname);
    } catch {
        return false;
    }
}

function getNodePgPool(connectionString: string): Pool {
    const globalForNodePg = globalThis as GlobalNodePgPool;

    if (!globalForNodePg.__sensPubgNodePgPool) {
        globalForNodePg.__sensPubgNodePgPool = new Pool({ connectionString });
    }

    return globalForNodePg.__sensPubgNodePgPool;
}

function createLocalTcpDatabaseClient(connectionString: string): AppDatabase {
    return drizzleNodePg(getNodePgPool(connectionString), { schema }) as AppDatabase;
}

export function createDatabaseClient(connectionString: string): AppDatabase {
    if (isLocalTcpDatabaseUrl(connectionString)) {
        return createLocalTcpDatabaseClient(connectionString);
    }

    return drizzleNeon(neon(connectionString), { schema }) as AppDatabase;
}

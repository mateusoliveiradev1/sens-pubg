/**
 * Database client.
 * Usa Neon HTTP para conexoes remotas e driver TCP para Postgres local/CI.
 */

import { env } from '@/env';
import { createDatabaseClient } from './client';

export const db = createDatabaseClient(env.DATABASE_URL);

export type Database = typeof db;

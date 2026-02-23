/**
 * Database Client — Conexão Drizzle ORM com Neon serverless.
 * Connection pooling automático via @neondatabase/serverless.
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });

export type Database = typeof db;

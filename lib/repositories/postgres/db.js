import { Pool } from "pg";

/**
 * Conexión a PostgreSQL para el modo relacional alternativo
 * Requisito académico: consultas SQL manuales, DATABASE_URL y SSL { rejectUnauthorized: false }
 */

let pool = null;

export function isPostgresConfigured() {
  return Boolean(
    process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes("usuario:contrasenia")
  );
}

export function getPool() {
  if (!pool) {
    if (!isPostgresConfigured()) {
      throw new Error(
        "PostgreSQL no está configurado. Por favor define la variable DATABASE_URL en tu archivo .env.local para usar DB_MODE=postgres."
      );
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function query(text, params = []) {
  const activePool = getPool();
  const client = await activePool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

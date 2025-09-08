// netlify/functions/db.mjs  (ESM)
import { neon, neonConfig } from '@neondatabase/serverless';

// cachea la conexión entre invocaciones (mejor para Netlify)
neonConfig.fetchConnectionCache = true;

// Toma la URL de Neon desde variables de entorno
const URL =
  process.env.NEON_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

if (!URL) {
  throw new Error('Falta NEON_DATABASE_URL en las variables de entorno');
}

/**
 * Exporta una función "sql" etiquetada:
 *   await sql`SELECT * FROM tabla WHERE id=${id}`
 */
export const sql = neon(URL);

/**
 * Exporta también "query(text, params)" por compatibilidad:
 *   await query('SELECT * FROM tabla WHERE id=$1', [id])
 */
export const query = async (text, params = []) => {
  // neon permite pasar texto/params también; normalizamos a { rows }
  const rows = await sql(text, params);
  return Array.isArray(rows) ? { rows } : rows;
};

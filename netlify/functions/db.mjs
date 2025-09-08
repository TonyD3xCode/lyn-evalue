// netlify/functions/db.mjs
import { neon, neonConfig } from '@neondatabase/serverless';

neonConfig.fetchConnectionCache = true;

const URL =
  process.env.NEON_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

if (!URL) throw new Error('Falta NEON_DATABASE_URL');

export const sql = neon(URL);

// query(text, params) compatible (devuelve { rows })
export const query = async (text, params = []) => {
  const rows = await sql(text, params);
  return Array.isArray(rows) ? { rows } : rows;
};

/* ---- Helpers para que el resto de funciones NO rompan ---- */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const json = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json', ...CORS },
  body: JSON.stringify(body),
});

// Si la request es OPTIONS, responde preflight; si no, devuelve null
export const preflight = (event) => {
  if (event?.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }
  return null;
};

// Shim para compatibilidad con código antiguo que usa "getPool().query(...)"
export const getPool = () => ({
  query: (text, params) => query(text, params),
});

// (opcional) default export para quien haga import default
export default { sql, query, json, preflight, getPool };

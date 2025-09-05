
import { Client } from 'pg';

export function getClient() {
  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('Missing NEON_DATABASE_URL');
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  return client;
}

export function jsonResponse(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(body)
  };
}

export function preflight(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }
  return null;
}

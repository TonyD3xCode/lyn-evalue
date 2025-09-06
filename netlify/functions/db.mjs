import pg from "pg";
const { Pool } = pg;

let pool;
export function getPool(){
  if(!pool){
    const conn = process.env.NEON_DATABASE_URL;
    if(!conn) throw new Error("NEON_DATABASE_URL missing");
    pool = new Pool({
      connectionString: conn,
      ssl: { rejectUnauthorized: false },
      max: 4,
      idleTimeoutMillis: 30000
    });
  }
  return pool;
}

export const json = (code, data) => ({
  statusCode: code,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  },
  body: JSON.stringify(data)
});

export const preflight = (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: ""
    };
  }
  return null;
};

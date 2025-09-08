// netlify/functions/vehicles.js  (CommonJS con adaptador a cualquier db.mjs)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  body: JSON.stringify(body),
});

/**
 * Adapta lo que exporte db.mjs a una interfaz tipo:
 *   await sql`SELECT ... WHERE id=${x}`
 * Si no hay función etiquetada, compila la template a "text + params"
 * y llama a .query(text, params) (Pool o Client).
 */
async function getSqlAdapter() {
  const mod = await import('./db.mjs');

  // Candidatos típicos que puede exportar db.mjs
  const tagged =
    (typeof mod.sql === 'function' && mod.sql) ||
    (typeof mod.default === 'function' && mod.default) ||
    (typeof mod.default?.sql === 'function' && mod.default.sql);

  if (tagged) {
    // Ya tenemos la función etiquetada (neon/sql-tag)
    return async (strings, ...values) => tagged(strings, ...values);
  }

  // ¿Existe un "query(text, params)"?
  const rawQuery =
    (typeof mod.query === 'function' && mod.query) ||
    (typeof mod.pool?.query === 'function' && mod.pool.query.bind(mod.pool)) ||
    (typeof mod.default?.query === 'function' && mod.default.query) ||
    (typeof mod.default?.pool?.query === 'function' && mod.default.pool.query.bind(mod.default.pool));

  if (!rawQuery) {
    throw new Error('No se encontró ni sql etiquetado ni query(text, params) en db.mjs');
  }

  // Compila la template etiquetada a text/params: SELECT ... $1 ... $2 ...
  const compiled = async (strings, ...values) => {
    // strings es un array de fragmentos literales
    let text = '';
    const params = [];
    for (let i = 0; i < strings.length; i++) {
      text += strings[i];
      if (i < values.length) {
        params.push(values[i]);
        text += `$${params.length}`;
      }
    }
    const res = await rawQuery(text, params);
    // Normaliza resultado a array de filas
    return res?.rows ?? res ?? [];
  };

  return compiled;
}

exports.handler = async (event) => {
  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  try {
    const sql = await getSqlAdapter();

    if (event.httpMethod === 'GET') {
      const id = event.queryStringParameters && event.queryStringParameters.id;
      if (id) {
        const rows = await sql`SELECT * FROM public.vehicles WHERE veh_id=${id}`;
        return json(200, rows[0] || null);
      }
      const rows = await sql`
        SELECT * FROM public.vehicles
        ORDER BY fecha DESC NULLS LAST, veh_id DESC
      `;
      return json(200, rows);
    }

    if (event.httpMethod === 'POST') {
      const v = JSON.parse(event.body || '{}');

      const fecha = v.fecha ? String(v.fecha).slice(0, 10) : null;
      const anio  = v.anio ? String(v.anio) : null;

      // Genera veh_id si no viene
      let veh_id = v.veh_id && String(v.veh_id).trim();
      if (!veh_id) {
        const r = await sql`SELECT gen_veh_id() AS id`;
        veh_id = (Array.isArray(r) ? r[0]?.id : r?.id) || null;
        if (!veh_id) return json(500, { error: 'No se pudo generar veh_id' });
      }

      // UPSERT
      await sql`
        INSERT INTO public.vehicles
          (veh_id, fecha, vin, marca, modelo, anio, color, pais, notas, foto_vehiculo)
        VALUES
          (${veh_id}, ${fecha}, ${v.vin||null}, ${v.marca||null}, ${v.modelo||null},
           ${anio}, ${v.color||null}, ${v.pais||null}, ${v.notas||null}, ${v.foto_vehiculo||null})
        ON CONFLICT (veh_id) DO UPDATE SET
          fecha=${fecha}, vin=${v.vin||null}, marca=${v.marca||null}, modelo=${v.modelo||null},
          anio=${anio}, color=${v.color||null}, pais=${v.pais||null}, notas=${v.notas||null},
          foto_vehiculo=${v.foto_vehiculo||null};
      `;

      return json(200, { ok: true, veh_id });
    }

    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');
      const id = body && body.id;
      if (!id) return json(400, { error: 'veh_id requerido' });
      await sql`DELETE FROM public.vehicles WHERE veh_id=${id}`;
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (e) {
    console.error('vehicles error:', e);
    return json(500, { error: e.message || 'Internal error' });
  }
};

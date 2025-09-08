import { sql, jsonResponse, preflight } from './db.mjs';

export const handler = async (event) => {
  const pf = preflight(event);
  if (pf) return pf;

  try {
    if (event.httpMethod === 'GET') {
      const id = event.queryStringParameters?.id;
      if (id) {
        const rows = await sql`SELECT * FROM public.vehicles WHERE veh_id=${id}`;
        return jsonResponse(200, rows[0] || null);
      }
      const rows = await sql`SELECT * FROM public.vehicles ORDER BY fecha DESC NULLS LAST, veh_id DESC`;
      return jsonResponse(200, rows);
    }

    if (event.httpMethod === 'POST') {
      const v = JSON.parse(event.body || '{}');

      // Normaliza/castea
      const fecha = v.fecha ? v.fecha.slice(0,10) : null;
      const anio  = v.anio ? String(v.anio) : null;

      // 1) Generar veh_id si no viene
      let veh_id = v.veh_id && String(v.veh_id).trim();
      if (!veh_id) {
        const r = await sql`SELECT gen_veh_id() AS id`;
        veh_id = r[0].id;
      }

      // 2) UPSERT
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

      return jsonResponse(200, { ok:true, veh_id });
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      if (!id) return jsonResponse(400, { error: 'veh_id requerido' });
      await sql`DELETE FROM public.vehicles WHERE veh_id=${id}`;
      return jsonResponse(200, { ok:true });
    }

    return jsonResponse(405, { error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return jsonResponse(500, { error: e.message });
  }
};

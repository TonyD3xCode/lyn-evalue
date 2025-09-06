
import { getClient, jsonResponse, preflight } from './db.mjs';

export const handler = async (event) => {
  const pf = preflight(event);
  if (pf) return pf;

  const client = getClient();
  await client.connect();
  try {
    if (event.httpMethod === 'GET') {
      const { rows } = await client.query('select * from vehicles order by updated_at desc');
      return jsonResponse(200, rows);
    }
    // netlify/functions/vehicles.mjs (fragmento POST)
if (method === 'POST') {
  const body = JSON.parse(event.body || '{}');

  // normaliza nombres (acepta ambos)
  const data = {
    veh_id:        body.veh_id || body.vehId,
    fecha:         body.fecha,
    vin:           body.vin,
    marca:         body.marca,
    modelo:        body.modelo,
    anio:          body.anio,
    color:         body.color,
    pais:          body.pais,
    notas:         body.notas,
    foto_vehiculo: body.foto_vehiculo || body.fotoVehiculo || null
  };

  if (!data.veh_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'veh_id requerido' }) };
  }

  const sql = `
    INSERT INTO vehicles (veh_id, fecha, vin, marca, modelo, anio, color, pais, notas, foto_vehiculo)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (veh_id) DO UPDATE SET
      fecha = EXCLUDED.fecha,
      vin   = EXCLUDED.vin,
      marca = EXCLUDED.marca,
      modelo= EXCLUDED.modelo,
      anio  = EXCLUDED.anio,
      color = EXCLUDED.color,
      pais  = EXCLUDED.pais,
      notas = EXCLUDED.notas,
      foto_vehiculo = EXCLUDED.foto_vehiculo
    RETURNING *;
  `;
  const vals = [
    data.veh_id, data.fecha, data.vin, data.marca, data.modelo,
    data.anio, data.color, data.pais, data.notas, data.foto_vehiculo
  ];

  const { rows } = await client.query(sql, vals);
  return { statusCode: 200, body: JSON.stringify(rows[0]) };
}
    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      await client.query('delete from vehicles where veh_id=$1', [id]);
      return jsonResponse(200, { ok: true });
    }
    return jsonResponse(405, { error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return jsonResponse(500, { error: e.message });
  } finally {
    await client.end();
  }
};

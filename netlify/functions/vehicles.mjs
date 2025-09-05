
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
    if (event.httpMethod === 'POST') {
      const v = JSON.parse(event.body || '{}');
      await client.query(`
        insert into vehicles (veh_id, fecha, vin, marca, modelo, anio, color, pais, notas, foto_vehiculo, updated_at)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
        on conflict (veh_id) do update set
          fecha=excluded.fecha, vin=excluded.vin, marca=excluded.marca, modelo=excluded.modelo,
          anio=excluded.anio, color=excluded.color, pais=excluded.pais, notas=excluded.notas,
          foto_vehiculo=excluded.foto_vehiculo, updated_at=now()
      `, [v.vehId, v.fecha, v.vin, v.marca, v.modelo, v.anio, v.color, v.pais, v.notas, v.fotoVehiculo]);
      return jsonResponse(200, { ok: true });
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

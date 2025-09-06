import { getClient, jsonResponse, preflight } from './db.mjs';

export const handler = async (event) => {
  const pf = preflight(event);
  if (pf) return pf;

  const client = getClient();
  await client.connect();
  try {
    // -------- GET: lista por vehículo --------
    // GET /damages?vehId=LYNA-0001  (también acepta veh_id)
if (event.httpMethod === 'GET') {
  const qs = event.queryStringParameters || {};
  const vehId = qs.veh_id || qs.vehId;
  if (!vehId) return jsonResponse(400, { error: 'vehId required' });

  const { rows } = await client.query(
    'SELECT * FROM damages WHERE veh_id=$1 ORDER BY updated_at DESC',
    [vehId]
  );
  return jsonResponse(200, rows);
}

// POST upsert daño (normaliza vehId/veh_id)
if (event.httpMethod === 'POST') {
  const body = JSON.parse(event.body || '{}');

  const d = {
    id: body.id,
    veh_id: body.veh_id || body.vehId,     // <-- normalizado
    parte: body.parte,
    ubic: body.ubic,
    sev: body.sev,
    descrption: body.descrption,           // <-- tal cual tu columna
    cost: body.cost || 0,
    imgs: Array.isArray(body.imgs) ? body.imgs : []
  };
  if (!d.id || !d.veh_id) {
    return jsonResponse(400, { error: 'id and veh_id required' });
  }

  await client.query(`
    INSERT INTO damages (id, veh_id, parte, ubic, sev, descrption, cost, imgs, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())
    ON CONFLICT (id) DO UPDATE SET
      parte=EXCLUDED.parte,
      ubic=EXCLUDED.ubic,
      sev=EXCLUDED.sev,
      descrption=EXCLUDED.descrption,
      cost=EXCLUDED.cost,
      imgs=EXCLUDED.imgs,
      updated_at=now()
  `, [
    d.id, d.veh_id, d.parte, d.ubic, d.sev, d.descrption, d.cost, JSON.stringify(d.imgs)
  ]);

  return jsonResponse(200, { ok: true });
}

    // -------- DELETE --------
    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      if (!id) return jsonResponse(400, { error: 'id required' });
      await client.query('DELETE FROM damages WHERE id=$1', [id]);
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


import { getClient, jsonResponse, preflight } from './db.mjs';

export const handler = async (event) => {
  const pf = preflight(event);
  if (pf) return pf;

  const client = getClient();
  await client.connect();
  try {
    if (event.httpMethod === 'GET') {
      const vehId = event.queryStringParameters?.vehId;
      if (!vehId) return jsonResponse(400, { error: 'vehId required' });
      const { rows } = await client.query('select * from damages where veh_id=$1 order by updated_at desc', [vehId]);
      return jsonResponse(200, rows);
    }
    if (event.httpMethod === 'POST') {
      const d = JSON.parse(event.body || '{}');
      await client.query(`
        insert into damages (id, veh_id, parte, ubic, sev, descrption, cost, imgs, updated_at)
        values ($1,$2,$3,$4,$5,$6,$7,$8, now())
        on conflict (id) do update set
          parte=excluded.parte, ubic=excluded.ubic, sev=excluded.sev, descrption=excluded.descrption,
          cost=excluded.cost, imgs=excluded.imgs, updated_at=now()
      `, [d.id, d.vehId, d.parte, d.ubic, d.sev, d.descrption, d.cost, JSON.stringify(d.imgs || [])]);
      return jsonResponse(200, { ok: true });
    }
    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      await client.query('delete from damages where id=$1', [id]);
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

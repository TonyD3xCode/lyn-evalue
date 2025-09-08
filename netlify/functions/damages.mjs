import { getPool, json, preflight } from "./db.mjs";

export const handler = async (event) => {
  const pf = preflight(event);
  if (pf) return pf;

  const pool = getPool();
  try {
    // GET /damages?vehId=...&lite=1
if (event.httpMethod === "GET") {
  const qs   = event.queryStringParameters || {};
  const vehId= qs.veh_id || qs.vehId;
  const lite = qs.lite === '1';
  if (!vehId) return json(400, { error: "vehId required" });

  const { rows } = await pool.query(
    "SELECT * FROM damages WHERE veh_id=$1 ORDER BY updated_at DESC",
    [vehId]
  );

  const out = rows.map(r => {
    const imgsRaw = Array.isArray(r.imgs)
      ? r.imgs
      : (typeof r.imgs === 'string' ? JSON.parse(r.imgs || '[]') : (r.imgs || []));
    const imgs = lite
      ? imgsRaw.map(x => (x?.thumb ? { thumb: x.thumb } : (typeof x === 'string' ? { thumb: x } : {})))
      : imgsRaw;
    return { ...r, imgs, fixed: !!r.fixed };
  });

  return json(200, out);
}

// POST /damages (upsert)
if (event.httpMethod === "POST") {
  const b = JSON.parse(event.body || "{}");
  const d = {
    id: b.id,
    veh_id: b.veh_id || b.vehId,
    parte: b.parte || null,
    ubic: b.ubic || null,
    sev: b.sev || null,
    descrption: b.descrption || null,
    cost: b.cost || 0,
    imgs: Array.isArray(b.imgs) ? b.imgs : [],
    fixed: !!b.fixed
  };
  if (!d.id || !d.veh_id) return json(400, { error: "id and veh_id required" });

  await pool.query(`
    INSERT INTO damages (id, veh_id, parte, ubic, sev, descrption, cost, imgs, fixed, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
    ON CONFLICT (id) DO UPDATE SET
      parte=EXCLUDED.parte,
      ubic=EXCLUDED.ubic,
      sev=EXCLUDED.sev,
      descrption=EXCLUDED.descrption,
      cost=EXCLUDED.cost,
      imgs=EXCLUDED.imgs,
      fixed=EXCLUDED.fixed,
      updated_at=now()
  `, [
    d.id, d.veh_id, d.parte, d.ubic, d.sev, d.descrption, d.cost,
    JSON.stringify(d.imgs),
    d.fixed
  ]);

  return json(200, { ok: true });
}
    if (event.httpMethod === "DELETE") {
      const { id } = JSON.parse(event.body || "{}");
      if (!id) return json(400, { error: "id required" });
      await pool.query("DELETE FROM damages WHERE id=$1", [id]);
      return json(200, { ok: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return json(500, { error: e.message });
  }
};

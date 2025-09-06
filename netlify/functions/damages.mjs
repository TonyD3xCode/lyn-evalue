import { getPool, json, preflight } from "./db.mjs";

export const handler = async (event) => {
  const pf = preflight(event);
  if (pf) return pf;

  const pool = getPool();
  try {
    // GET: lista por vehículo
    // /.netlify/functions/damages?vehId=LYNA-0001  (también acepta veh_id)
    if (event.httpMethod === "GET") {
      const qs = event.queryStringParameters || {};
      const vehId = qs.veh_id || qs.vehId;
      if (!vehId) return json(400, { error: "vehId required" });

      const { rows } = await pool.query(
        "SELECT * FROM damages WHERE veh_id=$1 ORDER BY updated_at DESC",
        [vehId]
      );
      return json(200, rows);
    }

    // POST: upsert de daño
    if (event.httpMethod === "POST") {
      const b = JSON.parse(event.body || "{}");

      // Normaliza nombres (acepta veh_id o vehId)
      const d = {
        id: b.id,
        veh_id: b.veh_id || b.vehId,
        parte: b.parte || null,
        ubic: b.ubic || null,
        sev: b.sev || null,
        descrption: b.descrption || null, // nombre tal cual está en tu DB
        cost: b.cost || 0,
        imgs: Array.isArray(b.imgs) ? b.imgs : []
      };

      if (!d.id || !d.veh_id) {
        return json(400, { error: "id and veh_id required" });
      }

      await pool.query(`
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
        d.id, d.veh_id, d.parte, d.ubic, d.sev, d.descrption,
        d.cost, JSON.stringify(d.imgs)
      ]);

      return json(200, { ok: true });
    }

    // DELETE: por id de daño
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

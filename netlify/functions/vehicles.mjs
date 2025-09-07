import { getPool, json, preflight } from "./db.mjs";

export const handler = async (event) => {
  const pf = preflight(event);
  if (pf) return pf;

  const pool = getPool();
  try {
    if (event.httpMethod === "GET") {
      const qs = event.queryStringParameters || {};
      const id = qs.id;
      if (id) {
        const { rows } = await pool.query("SELECT * FROM vehicles WHERE veh_id=$1", [id]);
        return json(200, rows[0] || null);
      }
      const { rows } = await pool.query("SELECT * FROM vehicles ORDER BY veh_id ASC");
      return json(200, rows);
    }

    if (event.httpMethod === "POST") {
      const b = JSON.parse(event.body || "{}");
      const v = {
        veh_id: b.veh_id || b.vehId,
        fecha: b.fecha || null,
        vin: b.vin || null,
        marca: b.marca || null,
        modelo: b.modelo || null,
        anio: b.anio || null,
        color: b.color || null,
        pais: b.pais || null,
        notas: b.notas || null,
        foto_vehiculo: b.foto_vehiculo || b.fotoVehiculo || null
      };
      if (!v.veh_id) return json(400, { error: "veh_id required" });

      const sql = `
        INSERT INTO vehicles
          (veh_id, fecha, vin, marca, modelo, anio, color, pais, notas, foto_vehiculo)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (veh_id) DO UPDATE SET
          fecha=EXCLUDED.fecha, vin=EXCLUDED.vin, marca=EXCLUDED.marca, modelo=EXCLUDED.modelo,
          anio=EXCLUDED.anio, color=EXCLUDED.color, pais=EXCLUDED.pais, notas=EXCLUDED.notas,
          foto_vehiculo=EXCLUDED.foto_vehiculo
        RETURNING *;
      `;
      const vals = [v.veh_id,v.fecha,v.vin,v.marca,v.modelo,v.anio,v.color,v.pais,v.notas,v.foto_vehiculo];
      const { rows } = await pool.query(sql, vals);
      return json(200, rows[0]);
    }

    if (event.httpMethod === "DELETE") {
      const { id } = JSON.parse(event.body || "{}");
      if (!id) return json(400, { error: "id required" });
      await pool.query("DELETE FROM vehicles WHERE veh_id=$1", [id]);
      return json(200, { ok: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return json(500, { error: e.message });
  }
};

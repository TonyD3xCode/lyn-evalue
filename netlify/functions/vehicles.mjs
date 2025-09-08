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
  const pool = getPool();

  const v = {
    veh_id: (b.veh_id || b.vehId || '').trim() || null,
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

  // ¿Existe ese veh_id?
  let exists = false;
  if (v.veh_id) {
    const { rows } = await pool.query(
      "SELECT 1 FROM vehicles WHERE veh_id = $1 LIMIT 1",
      [v.veh_id]
    );
    exists = rows.length > 0;
  }

  if (!exists) {
    // INSERT (veh_id puede venir null; el trigger lo genera)
    const { rows } = await pool.query(`
      INSERT INTO vehicles
        (veh_id, fecha, vin, marca, modelo, anio, color, pais, notas, foto_vehiculo)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *;
    `, [v.veh_id, v.fecha, v.vin, v.marca, v.modelo, v.anio, v.color, v.pais, v.notas, v.foto_vehiculo]);
    return json(200, rows[0]);
  } else {
    // UPDATE (no dejamos cambiar la PK)
    const { rows } = await pool.query(`
      UPDATE vehicles SET
        fecha=$2, vin=$3, marca=$4, modelo=$5, anio=$6, color=$7, pais=$8, notas=$9, foto_vehiculo=$10
      WHERE veh_id=$1
      RETURNING *;
    `, [v.veh_id, v.fecha, v.vin, v.marca, v.modelo, v.anio, v.color, v.pais, v.notas, v.foto_vehiculo]);
    return json(200, rows[0]);
  }
}

    return json(405, { error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return json(500, { error: e.message });
  }
};

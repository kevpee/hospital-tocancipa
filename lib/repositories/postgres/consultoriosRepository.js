import { query } from "./db";
import { CONSULTORIOS_SEMILLA } from "@/lib/seedData";

export const postgresConsultoriosRepo = {
  async getAll() {
    const res = await query("SELECT * FROM consultorios ORDER BY numero ASC");
    if (res.rows.length === 0) {
      for (const cons of CONSULTORIOS_SEMILLA) {
        await query(
          "INSERT INTO consultorios (numero, piso, descripcion) VALUES ($1, $2, $3) ON CONFLICT (numero) DO NOTHING",
          [cons.numero, cons.piso, cons.descripcion]
        );
      }
      const seededRes = await query("SELECT * FROM consultorios ORDER BY numero ASC");
      return seededRes.rows.map(mapConsultorio);
    }
    return res.rows.map(mapConsultorio);
  },

  async getById(id) {
    const res = await query("SELECT * FROM consultorios WHERE id = $1", [id]);
    if (res.rows.length === 0) return null;
    return mapConsultorio(res.rows[0]);
  },
};

function mapConsultorio(row) {
  return {
    id: String(row.id),
    numero: row.numero,
    piso: row.piso,
    descripcion: row.descripcion,
    fechaCreacion: row.fecha_creacion,
  };
}

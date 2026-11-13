import { query } from "./db";
import { ESPECIALIDADES_SEMILLA } from "@/lib/seedData";

export const postgresEspecialidadesRepo = {
  async getAll() {
    const res = await query("SELECT * FROM especialidades ORDER BY nombre ASC");
    if (res.rows.length === 0) {
      for (const esp of ESPECIALIDADES_SEMILLA) {
        await query(
          "INSERT INTO especialidades (nombre, descripcion) VALUES ($1, $2) ON CONFLICT (nombre) DO NOTHING",
          [esp.nombre, esp.descripcion]
        );
      }
      const seededRes = await query("SELECT * FROM especialidades ORDER BY nombre ASC");
      return seededRes.rows.map(mapEspecialidad);
    }
    return res.rows.map(mapEspecialidad);
  },

  async getById(id) {
    const res = await query("SELECT * FROM especialidades WHERE id = $1", [id]);
    if (res.rows.length === 0) return null;
    return mapEspecialidad(res.rows[0]);
  },
};

function mapEspecialidad(row) {
  return {
    id: String(row.id),
    nombre: row.nombre,
    descripcion: row.descripcion,
    fechaCreacion: row.fecha_creacion,
  };
}

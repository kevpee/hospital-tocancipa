import { query } from "./db";

export const postgresMedicosRepo = {
  async getAll() {
    const res = await query(
      `SELECT m.*, e.nombre AS especialidad_nombre
       FROM medicos m
       JOIN especialidades e ON m.especialidad_id = e.id
       ORDER BY m.fecha_registro DESC`
    );
    return res.rows.map(mapMedico);
  },

  async getById(id) {
    const res = await query(
      `SELECT m.*, e.nombre AS especialidad_nombre
       FROM medicos m
       JOIN especialidades e ON m.especialidad_id = e.id
       WHERE m.id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    return mapMedico(res.rows[0]);
  },

  async getByDocumento(documento) {
    const res = await query(
      `SELECT m.*, e.nombre AS especialidad_nombre
       FROM medicos m
       JOIN especialidades e ON m.especialidad_id = e.id
       WHERE m.documento = $1`,
      [documento.trim()]
    );
    if (res.rows.length === 0) return null;
    return mapMedico(res.rows[0]);
  },

  async create(data) {
    const documentoLimpio = String(data.documento).trim();
    const existente = await this.getByDocumento(documentoLimpio);
    if (existente) {
      throw new Error(
        `Ya existe un médico registrado con el número de documento: ${documentoLimpio}`
      );
    }

    // Resolver ID de especialidad si se envió objeto o ID
    let especialidadId = data.especialidadId;
    if (!especialidadId && data.especialidad?.id) {
      especialidadId = data.especialidad.id;
    }

    // Si aún no se tiene ID, buscar por nombre
    if (!especialidadId && (data.especialidad?.nombre || typeof data.especialidad === "string")) {
      const nombreEsp = data.especialidad?.nombre || data.especialidad;
      const espRes = await query(
        "SELECT id FROM especialidades WHERE LOWER(nombre) = LOWER($1)",
        [nombreEsp.trim()]
      );
      if (espRes.rows.length > 0) {
        especialidadId = espRes.rows[0].id;
      }
    }

    if (!especialidadId) {
      throw new Error("Debe seleccionar una especialidad válida para el médico.");
    }

    const insertRes = await query(
      `INSERT INTO medicos (nombre, documento, especialidad_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [String(data.nombre).trim(), documentoLimpio, especialidadId]
    );

    return this.getById(insertRes.rows[0].id);
  },

  async count() {
    const res = await query("SELECT COUNT(*) AS total FROM medicos");
    return parseInt(res.rows[0].total, 10) || 0;
  },
};

function mapMedico(row) {
  return {
    id: String(row.id),
    nombre: row.nombre,
    documento: row.documento,
    especialidad: {
      id: String(row.especialidad_id),
      nombre: row.especialidad_nombre,
    },
    fechaRegistro: row.fecha_registro,
  };
}

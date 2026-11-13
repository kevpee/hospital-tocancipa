import { query } from "./db";

export const postgresDisponibilidadesRepo = {
  async getAll(filters = {}) {
    let sql = `
      SELECT d.*, 
             m.nombre AS medico_nombre,
             e.nombre AS especialidad_nombre,
             co.numero AS consultorio_numero
      FROM disponibilidades d
      JOIN medicos m ON d.documento_de_identidad = m.documento_de_identidad
      JOIN especialidades e ON m.especialidad_id = e.id
      JOIN consultorios co ON d.id_sala = co.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (filters.documento_de_identidad) {
      sql += ` AND d.documento_de_identidad = $${idx++}`;
      params.push(filters.documento_de_identidad);
    }

    if (filters.fecha) {
      sql += ` AND d.fecha = $${idx++}`;
      params.push(filters.fecha);
    }

    if (filters.id_sala) {
      sql += ` AND d.id_sala = $${idx++}`;
      params.push(filters.id_sala);
    }

    if (filters.soloDisponibles === true || filters.estado === 1 || filters.estado === "1") {
      sql += " AND d.estado = 1";
    } else if (filters.estado === 0 || filters.estado === "0") {
      sql += " AND d.estado = 0";
    }

    sql += " ORDER BY d.fecha ASC, d.horario_atencion ASC";

    const res = await query(sql, params);
    return res.rows.map(mapDisponibilidad);
  },

  async getById(id) {
    const sql = `
      SELECT d.*, 
             m.nombre AS medico_nombre,
             e.nombre AS especialidad_nombre,
             co.numero AS consultorio_numero
      FROM disponibilidades d
      JOIN medicos m ON d.documento_de_identidad = m.documento_de_identidad
      JOIN especialidades e ON m.especialidad_id = e.id
      JOIN consultorios co ON d.id_sala = co.id
      WHERE d.id_disponibilidad = $1
    `;
    const res = await query(sql, [id]);
    if (res.rows.length === 0) return null;
    return mapDisponibilidad(res.rows[0]);
  },

  async create(data) {
    const docMedico = String(data.documento_de_identidad || "").trim();
    const fecha = String(data.fecha || "").trim();
    const horarioAtencion = String(data.horario_atencion || "").trim();
    const idSala = data.id_sala;
    const idHorario = data.id_horario;

    const res = await query(
      `INSERT INTO disponibilidades (id_horario, documento_de_identidad, id_sala, fecha, horario_atencion, estado)
       VALUES ($1, $2, $3, $4, $5, 1)
       RETURNING id_disponibilidad`,
      [idHorario, docMedico, idSala, fecha, horarioAtencion]
    );

    return this.getById(res.rows[0].id_disponibilidad);
  },

  async updateEstado(id, nuevoEstado) {
    await query(
      "UPDATE disponibilidades SET estado = $1 WHERE id_disponibilidad = $2",
      [Number(nuevoEstado), id]
    );
    return this.getById(id);
  },

  async delete(id) {
    await query("DELETE FROM disponibilidades WHERE id_disponibilidad = $1", [id]);
    return { success: true };
  },

  async countDisponibles() {
    const res = await query("SELECT COUNT(*) AS total FROM disponibilidades WHERE estado = 1");
    return parseInt(res.rows[0].total, 10) || 0;
  },

  async countOcupadas() {
    const res = await query("SELECT COUNT(*) AS total FROM disponibilidades WHERE estado = 0");
    return parseInt(res.rows[0].total, 10) || 0;
  },
};

function mapDisponibilidad(row) {
  return {
    id: String(row.id_disponibilidad),
    id_disponibilidad: String(row.id_disponibilidad),
    id_horario: String(row.id_horario),
    documento_de_identidad: row.documento_de_identidad,
    id_sala: String(row.id_sala),
    fecha: row.fecha instanceof Date ? row.fecha.toISOString().split("T")[0] : String(row.fecha),
    horario_atencion: row.horario_atencion,
    estado: Number(row.estado),
    medicoNombre: row.medico_nombre,
    especialidad: row.especialidad_nombre,
    consultorioNumero: row.consultorio_numero,
    fechaCreacion: row.fecha_creacion,
  };
}

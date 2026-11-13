import { query } from "./db";

export const postgresHorariosRepo = {
  async getAll(filters = {}) {
    let sql = "SELECT * FROM horarios WHERE 1=1";
    const params = [];
    let idx = 1;

    if (filters.documento_de_identidad) {
      sql += ` AND documento_de_identidad = $${idx++}`;
      params.push(filters.documento_de_identidad);
    }

    if (filters.dia_semana) {
      sql += ` AND LOWER(dia_semana) = LOWER($${idx++})`;
      params.push(filters.dia_semana);
    }

    sql += " ORDER BY id_horario ASC";
    const res = await query(sql, params);
    return res.rows.map(mapHorario);
  },

  async getById(id) {
    const res = await query("SELECT * FROM horarios WHERE id_horario = $1", [id]);
    if (res.rows.length === 0) return null;
    return mapHorario(res.rows[0]);
  },

  async create(data) {
    const docMedico = String(data.documento_de_identidad || "").trim();
    const dia = String(data.dia_semana || "").trim();

    const insertRes = await query(
      `INSERT INTO horarios (documento_de_identidad, dia_semana)
       VALUES ($1, $2)
       RETURNING *`,
      [docMedico, dia]
    );

    return mapHorario(insertRes.rows[0]);
  },

  async delete(id) {
    await query("DELETE FROM horarios WHERE id_horario = $1", [id]);
    return { success: true };
  },
};

function mapHorario(row) {
  return {
    id: String(row.id_horario),
    id_horario: String(row.id_horario),
    documento_de_identidad: row.documento_de_identidad,
    dia_semana: row.dia_semana,
    fechaCreacion: row.fecha_creacion,
  };
}

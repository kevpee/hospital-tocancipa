import { query, getPool } from "./db";

export const postgresCitasRepo = {
  async getAll(filters = {}) {
    let sql = `
      SELECT 
        c.id_cita,
        c.id_paciente,
        c.id_disponibilidad,
        c.motivo,
        c.estado,
        c.fecha_creacion,
        p.nombre AS paciente_nombre,
        p.documento_de_identidad AS paciente_documento,
        d.fecha,
        d.horario_atencion,
        d.documento_de_identidad,
        m.nombre AS medico_nombre,
        e.nombre AS especialidad_nombre,
        co.numero AS consultorio_numero
      FROM citas c
      JOIN pacientes p ON c.id_paciente = p.id_paciente
      JOIN disponibilidades d ON c.id_disponibilidad = d.id_disponibilidad
      JOIN medicos m ON d.documento_de_identidad = m.documento_de_identidad
      JOIN especialidades e ON m.especialidad_id = e.id
      JOIN consultorios co ON d.id_sala = co.id
      WHERE 1=1
    `;

    const params = [];
    let idx = 1;

    if (filters.medicoId || filters.documento_de_identidad) {
      sql += ` AND d.documento_de_identidad = $${idx++}`;
      params.push(filters.medicoId || filters.documento_de_identidad);
    }

    if (filters.fecha) {
      sql += ` AND d.fecha = $${idx++}`;
      params.push(filters.fecha);
    }

    if (filters.estado) {
      sql += ` AND c.estado = $${idx++}`;
      params.push(filters.estado);
    }

    sql += " ORDER BY d.fecha DESC, d.horario_atencion DESC";

    const res = await query(sql, params);
    return res.rows.map(mapCita);
  },

  async getById(id) {
    const sql = `
      SELECT 
        c.id_cita,
        c.id_paciente,
        c.id_disponibilidad,
        c.motivo,
        c.estado,
        c.fecha_creacion,
        p.nombre AS paciente_nombre,
        p.documento_de_identidad AS paciente_documento,
        d.fecha,
        d.horario_atencion,
        d.documento_de_identidad,
        m.nombre AS medico_nombre,
        e.nombre AS especialidad_nombre,
        co.numero AS consultorio_numero
      FROM citas c
      JOIN pacientes p ON c.id_paciente = p.id_paciente
      JOIN disponibilidades d ON c.id_disponibilidad = d.id_disponibilidad
      JOIN medicos m ON d.documento_de_identidad = m.documento_de_identidad
      JOIN especialidades e ON m.especialidad_id = e.id
      JOIN consultorios co ON d.id_sala = co.id
      WHERE c.id_cita = $1
    `;
    const res = await query(sql, [id]);
    if (res.rows.length === 0) return null;
    return mapCita(res.rows[0]);
  },

  /**
   * Crea una cita reservando atómicamente el espacio de disponibilidad con transacción SQL.
   */
  async create(data) {
    const idDisp = data.id_disponibilidad || data.disponibilidadId;
    const idPac = data.id_paciente || data.pacienteId;
    const motivo = String(data.motivo || "").trim();

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Verificar y bloquear disponibilidad
      const dispCheck = await client.query(
        "SELECT * FROM disponibilidades WHERE id_disponibilidad = $1 FOR UPDATE",
        [idDisp]
      );

      if (dispCheck.rows.length === 0) {
        throw new Error("El espacio de disponibilidad no existe.");
      }

      const disp = dispCheck.rows[0];
      if (Number(disp.estado) !== 1) {
        throw new Error("El horario seleccionado ya no está disponible.");
      }

      // 2. Marcar disponibilidad como ocupada
      await client.query(
        "UPDATE disponibilidades SET estado = 0 WHERE id_disponibilidad = $1",
        [idDisp]
      );

      // 3. Insertar la cita médica
      const insertRes = await client.query(
        `INSERT INTO citas (id_paciente, id_disponibilidad, motivo, estado)
         VALUES ($1, $2, $3, 'programada')
         RETURNING id_cita`,
        [idPac, idDisp, motivo]
      );

      await client.query("COMMIT");
      return this.getById(insertRes.rows[0].id_cita);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  async updateEstado(id, nuevoEstado) {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const citaRes = await client.query(
        "SELECT * FROM citas WHERE id_cita = $1 FOR UPDATE",
        [id]
      );
      if (citaRes.rows.length === 0) {
        throw new Error("La cita médica no existe.");
      }

      const cita = citaRes.rows[0];
      if (cita.estado === "atendida") {
        throw new Error("Una cita atendida no puede modificarse.");
      }

      // Si se cancela, liberar la disponibilidad
      if (nuevoEstado === "cancelada" && cita.id_disponibilidad) {
        await client.query(
          "UPDATE disponibilidades SET estado = 1 WHERE id_disponibilidad = $1",
          [cita.id_disponibilidad]
        );
      }

      await client.query(
        "UPDATE citas SET estado = $1 WHERE id_cita = $2",
        [nuevoEstado, id]
      );

      await client.query("COMMIT");
      return this.getById(id);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  async countPorEstado(estado) {
    const res = await query("SELECT COUNT(*) AS total FROM citas WHERE estado = $1", [estado]);
    return parseInt(res.rows[0].total, 10) || 0;
  },

  async countHoy() {
    const res = await query(
      `SELECT COUNT(*) AS total 
       FROM citas c
       JOIN disponibilidades d ON c.id_disponibilidad = d.id_disponibilidad
       WHERE d.fecha = CURRENT_DATE`
    );
    return parseInt(res.rows[0].total, 10) || 0;
  },
};

function mapCita(row) {
  return {
    id: String(row.id_cita),
    id_cita: String(row.id_cita),
    id_paciente: String(row.id_paciente),
    pacienteId: String(row.id_paciente),
    id_disponibilidad: String(row.id_disponibilidad),
    disponibilidadId: String(row.id_disponibilidad),
    fecha: row.fecha instanceof Date ? row.fecha.toISOString().split("T")[0] : String(row.fecha),
    hora: row.horario_atencion,
    horario_atencion: row.horario_atencion,
    motivo: row.motivo,
    estado: row.estado,
    pacienteNombre: row.paciente_nombre,
    documento_de_identidad: row.documento_de_identidad,
    medicoNombre: row.medico_nombre,
    especialidad: row.especialidad_nombre,
    consultorioNumero: row.consultorio_numero,
    createdAt: row.fecha_creacion,
  };
}

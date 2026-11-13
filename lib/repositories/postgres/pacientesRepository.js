import { query } from "./db";

export const postgresPacientesRepo = {
  async getAll() {
    const res = await query(
      "SELECT * FROM pacientes ORDER BY fecha_registro DESC"
    );
    return res.rows.map(mapPaciente);
  },

  async getById(id) {
    const res = await query("SELECT * FROM pacientes WHERE id = $1", [id]);
    if (res.rows.length === 0) return null;
    return mapPaciente(res.rows[0]);
  },

  async getByDocumento(documento) {
    const res = await query("SELECT * FROM pacientes WHERE documento = $1", [
      documento.trim(),
    ]);
    if (res.rows.length === 0) return null;
    return mapPaciente(res.rows[0]);
  },

  async create(data) {
    const documentoLimpio = String(data.documento).trim();
    const existente = await this.getByDocumento(documentoLimpio);
    if (existente) {
      throw new Error(
        `Ya existe un paciente registrado con el número de documento: ${documentoLimpio}`
      );
    }

    const res = await query(
      `INSERT INTO pacientes (nombre, documento, telefono, correo, fecha_nacimiento)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        String(data.nombre).trim(),
        documentoLimpio,
        String(data.telefono).trim(),
        String(data.correo).trim().toLowerCase(),
        String(data.fechaNacimiento).trim(),
      ]
    );

    return mapPaciente(res.rows[0]);
  },

  async count() {
    const res = await query("SELECT COUNT(*) AS total FROM pacientes");
    return parseInt(res.rows[0].total, 10) || 0;
  },
};

function mapPaciente(row) {
  return {
    id: String(row.id),
    nombre: row.nombre,
    documento: row.documento,
    telefono: row.telefono,
    correo: row.correo,
    fechaNacimiento: row.fecha_nacimiento instanceof Date 
      ? row.fecha_nacimiento.toISOString().split("T")[0]
      : String(row.fecha_nacimiento),
    fechaRegistro: row.fecha_registro,
  };
}

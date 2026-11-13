import { getDb } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  runTransaction,
} from "firebase/firestore";

const COLLECTION_NAME = "citas";
const DISP_COLLECTION = "disponibilidades";

export const firestoreCitasRepo = {
  /**
   * Obtiene todas las citas con filtros por médico, fecha o estado.
   */
  async getAll(filters = {}) {
    const db = getDb();
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);

    let list = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        id_cita: docSnap.id,
        ...data,
      };
    });

    if (filters.medicoId || filters.documento_de_identidad) {
      const docMed = String(filters.medicoId || filters.documento_de_identidad);
      list = list.filter(
        (c) =>
          String(c.medicoId) === docMed ||
          String(c.documento_de_identidad) === docMed
      );
    }

    if (filters.fecha) {
      list = list.filter((c) => String(c.fecha) === String(filters.fecha));
    }

    if (filters.estado) {
      list = list.filter((c) => String(c.estado) === String(filters.estado));
    }

    // Ordenar por fecha y hora descendente
    return list.sort((a, b) => {
      const dateTimeA = `${a.fecha || ""}T${a.hora || a.horario_atencion || ""}`;
      const dateTimeB = `${b.fecha || ""}T${b.hora || b.horario_atencion || ""}`;
      return dateTimeB.localeCompare(dateTimeA);
    });
  },

  async getById(id) {
    const db = getDb();
    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, id_cita: snap.id, ...snap.data() };
  },

  /**
   * Crea una cita médica de forma ATÓMICA reservando el espacio de disponibilidad:
   * 1. Verifica dentro de la transacción que la disponibilidad exista y esté libre (estado === 1).
   * 2. Cambia atómicamente la disponibilidad a estado = 0 (ocupada).
   * 3. Registra el documento de la cita con FK id_disponibilidad e id_paciente.
   */
  async create(data) {
    const db = getDb();
    const idDisponibilidad = String(
      data.id_disponibilidad || data.disponibilidadId || ""
    ).trim();
    const idPaciente = String(
      data.id_paciente || data.pacienteId || ""
    ).trim();

    if (!idDisponibilidad || !idPaciente) {
      throw new Error("El paciente y el espacio de disponibilidad son obligatorios.");
    }

    const idCita = `cita_${idDisponibilidad}`;
    const citaDocRef = doc(db, COLLECTION_NAME, idCita);
    const dispDocRef = doc(db, DISP_COLLECTION, idDisponibilidad);

    let citaCreada = null;

    // Transacción atómica en Firestore
    await runTransaction(db, async (transaction) => {
      // 1. Obtener el espacio de disponibilidad
      const dispSnap = await transaction.get(dispDocRef);
      if (!dispSnap.exists()) {
        throw new Error("El espacio de disponibilidad seleccionado no existe.");
      }

      const dispData = dispSnap.data();

      // 2. Verificar que el espacio esté libre (estado === 1)
      if (Number(dispData.estado) !== 1) {
        throw new Error(
          "El espacio de horario seleccionado ya fue reservado por otro paciente. Por favor elija otro horario."
        );
      }

      // 3. Comprobar que no exista una cita activa previa para este espacio
      const citaSnap = await transaction.get(citaDocRef);
      if (citaSnap.exists() && citaSnap.data().estado !== "cancelada") {
        throw new Error(
          "Ya existe una cita médica activa asociada a este espacio de disponibilidad."
        );
      }

      // 4. Marcar la disponibilidad como ocupada (estado: 0)
      transaction.update(dispDocRef, {
        estado: 0,
        updatedAt: new Date().toISOString(),
      });

      // 5. Preparar datos de la cita con el modelo académico y campos desnormalizados
      const citaData = {
        id_paciente: idPaciente,
        pacienteId: idPaciente,
        id_disponibilidad: idDisponibilidad,
        disponibilidadId: idDisponibilidad,
        documento_de_identidad: String(dispData.documento_de_identidad || data.medicoId || ""),
        medicoId: String(dispData.documento_de_identidad || data.medicoId || ""),
        id_sala: String(dispData.id_sala || data.consultorioId || ""),
        consultorioId: String(dispData.id_sala || data.consultorioId || ""),
        fecha: dispData.fecha || data.fecha,
        hora: dispData.horario_atencion || data.hora,
        horario_atencion: dispData.horario_atencion || data.hora,
        motivo: String(data.motivo || "").trim(),
        estado: "programada", // programada | atendida | cancelada
        // Desnormalizados
        pacienteNombre: String(data.pacienteNombre || "").trim(),
        medicoNombre: String(dispData.medicoNombre || data.medicoNombre || "").trim(),
        especialidad: String(dispData.especialidad || data.especialidad || "").trim(),
        consultorioNumero: String(dispData.consultorioNumero || data.consultorioNumero || "").trim(),
        fecha_creacion: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      // 6. Guardar la cita
      transaction.set(citaDocRef, citaData);
      citaCreada = { id: idCita, id_cita: idCita, ...citaData };
    });

    return citaCreada;
  },

  /**
   * Actualiza el estado de la cita ('atendida' o 'cancelada') en una transacción:
   * - Al cancelar: libera el espacio de disponibilidad asociado (estado: 1).
   * - Al atender: se sella la cita (el espacio permanece ocupado, estado: 0).
   */
  async updateEstado(id, nuevoEstado) {
    const db = getDb();
    const estadosPermitidos = ["programada", "atendida", "cancelada"];
    if (!estadosPermitidos.includes(nuevoEstado)) {
      throw new Error(`Estado inválido: '${nuevoEstado}'. Permitidos: ${estadosPermitidos.join(", ")}`);
    }

    const citaDocRef = doc(db, COLLECTION_NAME, id);
    let citaActualizada = null;

    await runTransaction(db, async (transaction) => {
      const citaSnap = await transaction.get(citaDocRef);
      if (!citaSnap.exists()) {
        throw new Error("La cita médica especificada no existe.");
      }

      const citaData = citaSnap.data();

      if (citaData.estado === "atendida") {
        throw new Error("Una cita médica atendida no puede modificarse ni volver a reservarse.");
      }

      if (citaData.estado === "cancelada" && nuevoEstado === "atendida") {
        throw new Error("No es posible marcar como atendida una cita previamente cancelada.");
      }

      const idDisp = citaData.id_disponibilidad || citaData.disponibilidadId;

      // Si se cancela la cita, liberar el espacio de disponibilidad de forma atómica
      if (nuevoEstado === "cancelada" && idDisp) {
        const dispDocRef = doc(db, DISP_COLLECTION, idDisp);
        const dispSnap = await transaction.get(dispDocRef);
        if (dispSnap.exists()) {
          transaction.update(dispDocRef, {
            estado: 1, // Vuelve a estar disponible para otros pacientes
            updatedAt: new Date().toISOString(),
          });
        }
      }

      const updatePayload = {
        estado: nuevoEstado,
        updatedAt: new Date().toISOString(),
      };

      transaction.update(citaDocRef, updatePayload);
      citaActualizada = { id, id_cita: id, ...citaData, ...updatePayload };
    });

    return citaActualizada;
  },

  async countPorEstado(estado) {
    const list = await this.getAll({ estado });
    return list.length;
  },

  async countHoy() {
    const hoy = new Date().toISOString().split("T")[0];
    const list = await this.getAll({ fecha: hoy });
    return list.length;
  },
};

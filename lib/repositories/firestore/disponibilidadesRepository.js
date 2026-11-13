import { getDb } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
} from "firebase/firestore";

const COLLECTION_NAME = "disponibilidades";

export const firestoreDisponibilidadesRepo = {
  /**
   * Obtiene disponibilidades con filtros opcionales.
   * Filtra en memoria para evitar requerir índices compuestos en Firebase.
   */
  async getAll(filters = {}) {
    const db = getDb();
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);

    let list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      id_disponibilidad: docSnap.id,
      ...docSnap.data(),
    }));

    if (filters.documento_de_identidad) {
      list = list.filter(
        (d) => String(d.documento_de_identidad) === String(filters.documento_de_identidad)
      );
    }

    if (filters.fecha) {
      list = list.filter((d) => String(d.fecha) === String(filters.fecha));
    }

    if (filters.id_sala) {
      list = list.filter((d) => String(d.id_sala) === String(filters.id_sala));
    }

    if (filters.especialidad) {
      list = list.filter(
        (d) =>
          String(d.especialidad || "").toLowerCase() ===
          String(filters.especialidad).toLowerCase()
      );
    }

    if (filters.soloDisponibles === true || filters.estado === 1 || filters.estado === "1") {
      list = list.filter((d) => Number(d.estado) === 1);
    } else if (filters.estado === 0 || filters.estado === "0") {
      list = list.filter((d) => Number(d.estado) === 0);
    }

    // Ordenar por fecha y luego por horario de atención
    return list.sort((a, b) => {
      const cmpFecha = (a.fecha || "").localeCompare(b.fecha || "");
      if (cmpFecha !== 0) return cmpFecha;
      return (a.horario_atencion || "").localeCompare(b.horario_atencion || "");
    });
  },

  async getById(id) {
    const db = getDb();
    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, id_disponibilidad: snap.id, ...snap.data() };
  },

  /**
   * Crea un espacio de disponibilidad validando:
   * 1. Que el médico no tenga otro espacio en la misma fecha y franja horaria.
   * 2. Que el consultorio/sala no esté ocupado en la misma fecha y franja horaria.
   */
  async create(data) {
    const db = getDb();
    const docMedico = String(data.documento_de_identidad || "").trim();
    const fecha = String(data.fecha || "").trim();
    const horarioAtencion = String(data.horario_atencion || "").trim();
    const idSala = String(data.id_sala || "").trim();
    const idHorario = String(data.id_horario || "").trim();

    if (!docMedico || !fecha || !horarioAtencion || !idSala) {
      throw new Error(
        "El médico, la fecha, el horario de atención y la sala son obligatorios."
      );
    }

    // Consultar disponibilidades de esa misma fecha para verificar solapamientos
    const existentesEsaFecha = await this.getAll({ fecha });

    // 1. Validar no solapamiento del médico
    const solapamientoMedico = existentesEsaFecha.find(
      (d) =>
        String(d.documento_de_identidad) === docMedico &&
        String(d.horario_atencion).trim() === horarioAtencion
    );
    if (solapamientoMedico) {
      throw new Error(
        `El médico ya cuenta con un espacio de disponibilidad asignado el ${fecha} en el horario ${horarioAtencion}.`
      );
    }

    // 2. Validar no solapamiento del consultorio/sala
    const solapamientoSala = existentesEsaFecha.find(
      (d) =>
        String(d.id_sala) === idSala &&
        String(d.horario_atencion).trim() === horarioAtencion
    );
    if (solapamientoSala) {
      throw new Error(
        `El consultorio/sala seleccionado ya se encuentra asignado a otro médico el ${fecha} en el horario ${horarioAtencion}.`
      );
    }

    // ID normalizado
    const horaNorm = horarioAtencion.replace(/[^a-zA-Z0-9]/g, "");
    const id = `disp_${docMedico}_${fecha}_${horaNorm}`;
    const docRef = doc(db, COLLECTION_NAME, id);

    const dispData = {
      id_horario: idHorario || `hor_${docMedico}`,
      documento_de_identidad: docMedico,
      id_sala: idSala,
      fecha,
      horario_atencion: horarioAtencion,
      estado: 1, // 1 = disponible, 0 = ocupado
      // Campos informativos desnormalizados para acelerar búsquedas
      medicoNombre: String(data.medicoNombre || "").trim(),
      especialidad: String(data.especialidad || "").trim(),
      consultorioNumero: String(data.consultorioNumero || "").trim(),
      fechaCreacion: new Date().toISOString(),
    };

    await setDoc(docRef, dispData);
    return { id, id_disponibilidad: id, ...dispData };
  },

  /**
   * Actualiza el estado (1 = disponible, 0 = ocupado)
   */
  async updateEstado(id, nuevoEstado) {
    const db = getDb();
    const estadoNum = Number(nuevoEstado);
    if (estadoNum !== 0 && estadoNum !== 1) {
      throw new Error("El estado de disponibilidad debe ser 1 (disponible) o 0 (ocupado).");
    }

    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("El espacio de disponibilidad no existe.");
    }

    await updateDoc(docRef, {
      estado: estadoNum,
      updatedAt: new Date().toISOString(),
    });

    return { id, ...snap.data(), estado: estadoNum };
  },

  async delete(id) {
    const db = getDb();
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    return { success: true };
  },

  async countDisponibles() {
    const list = await this.getAll({ soloDisponibles: true });
    return list.length;
  },

  async countOcupadas() {
    const list = await this.getAll({ estado: 0 });
    return list.length;
  },
};

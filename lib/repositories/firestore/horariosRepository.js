import { getDb } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";

const COLLECTION_NAME = "horarios";

export const firestoreHorariosRepo = {
  /**
   * Obtiene todos los horarios, con filtros opcionales por documento del médico o día.
   */
  async getAll(filters = {}) {
    const db = getDb();
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);

    let list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      id_horario: docSnap.id,
      ...docSnap.data(),
    }));

    if (filters.documento_de_identidad) {
      list = list.filter(
        (h) => String(h.documento_de_identidad) === String(filters.documento_de_identidad)
      );
    }

    if (filters.dia_semana) {
      list = list.filter(
        (h) => h.dia_semana.toLowerCase() === filters.dia_semana.toLowerCase()
      );
    }

    return list.sort((a, b) => (a.dia_semana || "").localeCompare(b.dia_semana || ""));
  },

  async getById(id) {
    const db = getDb();
    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, id_horario: snap.id, ...snap.data() };
  },

  /**
   * Crea un horario para un médico. Evita duplicar el mismo día para el mismo médico.
   */
  async create(data) {
    const db = getDb();
    const docIdMedico = String(data.documento_de_identidad || "").trim();
    const dia = String(data.dia_semana || "").trim();

    if (!docIdMedico || !dia) {
      throw new Error("El documento del médico y el día de la semana son obligatorios.");
    }

    // Verificar si ya existe este horario para el médico
    const existentes = await this.getAll({ documento_de_identidad: docIdMedico, dia_semana: dia });
    if (existentes.length > 0) {
      throw new Error(`El médico ya tiene asignado el horario del día ${dia}.`);
    }

    const id = `hor_${docIdMedico}_${dia.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;
    const docRef = doc(db, COLLECTION_NAME, id);

    const horarioData = {
      documento_de_identidad: docIdMedico,
      dia_semana: dia,
      medicoNombre: String(data.medicoNombre || "").trim(),
      fechaCreacion: new Date().toISOString(),
    };

    await setDoc(docRef, horarioData);
    return { id, id_horario: id, ...horarioData };
  },

  async delete(id) {
    const db = getDb();
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    return { success: true };
  },
};

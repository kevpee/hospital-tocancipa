import { getDb } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  query,
  where,
} from "firebase/firestore";

const COLLECTION_NAME = "pacientes";

export const firestorePacientesRepo = {
  async getAll() {
    const db = getDb();
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);
    const list = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const docIdentidad = data.documento_de_identidad || data.documento;
      return {
        id: docSnap.id,
        id_paciente: docSnap.id,
        documento_de_identidad: docIdentidad,
        documento: docIdentidad,
        ...data,
      };
    });

    return list.sort((a, b) => new Date(b.fechaRegistro || 0) - new Date(a.fechaRegistro || 0));
  },

  async getById(id) {
    const db = getDb();
    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    const docIdentidad = data.documento_de_identidad || data.documento;
    return {
      id: snap.id,
      id_paciente: snap.id,
      documento_de_identidad: docIdentidad,
      documento: docIdentidad,
      ...data,
    };
  },

  async getByDocumento(documento) {
    const db = getDb();
    const colRef = collection(db, COLLECTION_NAME);
    const docLimpio = String(documento || "").trim();

    const q1 = query(colRef, where("documento_de_identidad", "==", docLimpio));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const d = snap1.docs[0];
      return { id: d.id, id_paciente: d.id, documento_de_identidad: docLimpio, documento: docLimpio, ...d.data() };
    }

    const q2 = query(colRef, where("documento", "==", docLimpio));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      const d = snap2.docs[0];
      return { id: d.id, id_paciente: d.id, documento_de_identidad: docLimpio, documento: docLimpio, ...d.data() };
    }

    return null;
  },

  async create(data) {
    const db = getDb();
    const documentoLimpio = String(
      data.documento_de_identidad || data.documento || ""
    ).trim();

    if (!documentoLimpio) {
      throw new Error("El documento de identidad es obligatorio.");
    }

    const existente = await this.getByDocumento(documentoLimpio);
    if (existente) {
      throw new Error(`Ya existe un paciente registrado con el número de documento: ${documentoLimpio}`);
    }

    const id = `pac_${documentoLimpio.replace(/[^a-zA-Z0-9_-]/g, "")}_${Date.now()}`;
    const docRef = doc(db, COLLECTION_NAME, id);

    const pacienteData = {
      nombre: String(data.nombre).trim(),
      documento_de_identidad: documentoLimpio,
      documento: documentoLimpio,
      telefono: String(data.telefono).trim(),
      correo: String(data.correo).trim().toLowerCase(),
      fecha_nacimiento: String(data.fecha_nacimiento || data.fechaNacimiento || "").trim(),
      fechaNacimiento: String(data.fecha_nacimiento || data.fechaNacimiento || "").trim(),
      fechaRegistro: new Date().toISOString(),
    };

    await setDoc(docRef, pacienteData);
    return { id, id_paciente: id, ...pacienteData };
  },

  async count() {
    const list = await this.getAll();
    return list.length;
  },
};

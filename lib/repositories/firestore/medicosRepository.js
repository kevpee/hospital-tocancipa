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

const COLLECTION_NAME = "medicos";

export const firestoreMedicosRepo = {
  async getAll() {
    const db = getDb();
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);
    const list = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const docIdentidad = data.documento_de_identidad || data.documento || docSnap.id;
      return {
        id: docSnap.id,
        documento_de_identidad: docIdentidad,
        documento: docIdentidad,
        ...data,
      };
    });

    return list.sort((a, b) => new Date(b.fechaRegistro || 0) - new Date(a.fechaRegistro || 0));
  },

  async getById(id) {
    const db = getDb();
    // Primero buscar por ID directo
    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const docIdentidad = data.documento_de_identidad || data.documento || snap.id;
      return {
        id: snap.id,
        documento_de_identidad: docIdentidad,
        documento: docIdentidad,
        ...data,
      };
    }

    // Si no se encuentra, buscar por documento_de_identidad
    return this.getByDocumento(id);
  },

  async getByDocumento(documento) {
    const db = getDb();
    const colRef = collection(db, COLLECTION_NAME);
    const docLimpio = String(documento || "").trim();

    // Comprobar si el ID del documento es el documento
    const docRef = doc(db, COLLECTION_NAME, docLimpio);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        documento_de_identidad: docLimpio,
        documento: docLimpio,
        ...data,
      };
    }

    // Consulta con where
    const q1 = query(colRef, where("documento_de_identidad", "==", docLimpio));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const d = snap1.docs[0];
      return { id: d.id, documento_de_identidad: docLimpio, documento: docLimpio, ...d.data() };
    }

    const q2 = query(colRef, where("documento", "==", docLimpio));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      const d = snap2.docs[0];
      return { id: d.id, documento_de_identidad: docLimpio, documento: docLimpio, ...d.data() };
    }

    return null;
  },

  async create(data) {
    const db = getDb();
    const docIdentidad = String(
      data.documento_de_identidad || data.documento || ""
    ).trim();

    if (!docIdentidad) {
      throw new Error("El documento de identidad del médico es obligatorio.");
    }

    const existente = await this.getByDocumento(docIdentidad);
    if (existente) {
      throw new Error(
        `Ya existe un médico registrado con el documento de identidad: ${docIdentidad}`
      );
    }

    // El documento de identidad actúa como PK
    const id = docIdentidad;
    const docRef = doc(db, COLLECTION_NAME, id);

    let especialidadObj = { nombre: "General" };
    if (typeof data.especialidad === "object" && data.especialidad !== null) {
      especialidadObj = {
        id: data.especialidad.id || null,
        nombre: String(data.especialidad.nombre || "").trim(),
      };
    } else if (typeof data.especialidad === "string") {
      especialidadObj = { nombre: data.especialidad.trim() };
    }

    const medicoData = {
      nombre: String(data.nombre).trim(),
      documento_de_identidad: docIdentidad,
      documento: docIdentidad,
      especialidad: especialidadObj, // Especialidad embebida como objeto { nombre }
      fechaRegistro: new Date().toISOString(),
    };

    await setDoc(docRef, medicoData);
    return { id, ...medicoData };
  },

  async count() {
    const list = await this.getAll();
    return list.length;
  },
};

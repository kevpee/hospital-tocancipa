import { getDb } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { ESPECIALIDADES_SEMILLA } from "@/lib/seedData";

const COLLECTION_NAME = "especialidades";

export const firestoreEspecialidadesRepo = {
  /**
   * Obtiene todas las especialidades.
   * Si la colección está vacía, inicializa automáticamente las 5 especialidades de ejemplo.
   */
  async getAll() {
    const db = getDb();
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      // Auto-inicialización de especialidades semilla
      for (const esp of ESPECIALIDADES_SEMILLA) {
        const docRef = doc(db, COLLECTION_NAME, esp.id);
        await setDoc(docRef, {
          nombre: esp.nombre,
          descripcion: esp.descripcion,
          fechaCreacion: new Date().toISOString(),
        });
      }

      // Re-consultar después del sembrado
      const seededSnapshot = await getDocs(colRef);
      return seededSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
    }

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  },

  async getById(id) {
    const db = getDb();
    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },
};

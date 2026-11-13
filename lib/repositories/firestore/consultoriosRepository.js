import { getDb } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { CONSULTORIOS_SEMILLA } from "@/lib/seedData";

const COLLECTION_NAME = "consultorios";

export const firestoreConsultoriosRepo = {
  /**
   * Obtiene todos los consultorios.
   * Si la colección está vacía, inicializa automáticamente los 4 consultorios de ejemplo.
   */
  async getAll() {
    const db = getDb();
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      for (const cons of CONSULTORIOS_SEMILLA) {
        const docRef = doc(db, COLLECTION_NAME, cons.id);
        await setDoc(docRef, {
          numero: cons.numero,
          piso: cons.piso,
          descripcion: cons.descripcion,
          fechaCreacion: new Date().toISOString(),
        });
      }

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

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

/**
 * Configuración modular de Firebase Firestore
 * Se obtienen las credenciales desde variables de entorno NEXT_PUBLIC_FIREBASE_*
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Comprueba si las variables mínimas para Firestore están definidas
 */
export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.projectId &&
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "AIzaSyAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  );
}

let app = null;
let db = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
  } catch (error) {
    console.error("Error al inicializar Firebase Firestore:", error);
  }
}

/**
 * Obtiene la instancia activa de Firestore.
 * Lanza un error descriptivo si las credenciales aún no se han suministrado.
 */
export function getDb() {
  if (!db) {
    if (!isFirebaseConfigured()) {
      throw new Error(
        "Firebase Firestore no está configurado. Por favor ingresa tus credenciales en el archivo .env.local tomando como guía .env.example."
      );
    }
    // Reintentar inicialización si falló previamente
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
  }
  return db;
}

export { app, db, firebaseConfig };

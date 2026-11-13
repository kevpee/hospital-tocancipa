import { firestorePacientesRepo } from "./firestore/pacientesRepository";
import { firestoreMedicosRepo } from "./firestore/medicosRepository";
import { firestoreEspecialidadesRepo } from "./firestore/especialidadesRepository";
import { firestoreConsultoriosRepo } from "./firestore/consultoriosRepository";
import { firestoreHorariosRepo } from "./firestore/horariosRepository";
import { firestoreDisponibilidadesRepo } from "./firestore/disponibilidadesRepository";
import { firestoreCitasRepo } from "./firestore/citasRepository";
import { firestoreDashboardRepo } from "./firestore/dashboardRepository";

import { postgresPacientesRepo } from "./postgres/pacientesRepository";
import { postgresMedicosRepo } from "./postgres/medicosRepository";
import { postgresEspecialidadesRepo } from "./postgres/especialidadesRepository";
import { postgresConsultoriosRepo } from "./postgres/consultoriosRepository";
import { postgresHorariosRepo } from "./postgres/horariosRepository";
import { postgresDisponibilidadesRepo } from "./postgres/disponibilidadesRepository";
import { postgresCitasRepo } from "./postgres/citasRepository";
import { postgresDashboardRepo } from "./postgres/dashboardRepository";

/**
 * Selector de Repositorios según la variable de entorno DB_MODE.
 * Modos soportados:
 * - 'firestore' (Principal - Cloud Firestore No Relacional)
 * - 'sql' o 'postgres' (Alternativa - PostgreSQL Relacional)
 */
const rawMode = (process.env.DB_MODE || "firestore").toLowerCase().trim();
const isSqlMode = rawMode === "sql" || rawMode === "postgres" || rawMode === "postgresql";

export const activeDbMode = isSqlMode ? "sql" : "firestore";

export const pacientesRepo = isSqlMode
  ? postgresPacientesRepo
  : firestorePacientesRepo;

export const medicosRepo = isSqlMode
  ? postgresMedicosRepo
  : firestoreMedicosRepo;

export const especialidadesRepo = isSqlMode
  ? postgresEspecialidadesRepo
  : firestoreEspecialidadesRepo;

export const consultoriosRepo = isSqlMode
  ? postgresConsultoriosRepo
  : firestoreConsultoriosRepo;

export const horariosRepo = isSqlMode
  ? postgresHorariosRepo
  : firestoreHorariosRepo;

export const disponibilidadesRepo = isSqlMode
  ? postgresDisponibilidadesRepo
  : firestoreDisponibilidadesRepo;

export const citasRepo = isSqlMode
  ? postgresCitasRepo
  : firestoreCitasRepo;

export const dashboardRepo = isSqlMode
  ? postgresDashboardRepo
  : firestoreDashboardRepo;

export function getDatabaseInfo() {
  if (isSqlMode) {
    return {
      mode: "sql",
      label: "Relacional - PostgreSQL (SQL)",
      engine: "PostgreSQL con pg y consultas SQL manuales",
    };
  }

  return {
    mode: "firestore",
    label: "No relacional - Firestore",
    engine: "Google Cloud Firestore (SDK Modular v13)",
  };
}

import { firestorePacientesRepo } from "./pacientesRepository";
import { firestoreMedicosRepo } from "./medicosRepository";
import { firestoreCitasRepo } from "./citasRepository";
import { firestoreDisponibilidadesRepo } from "./disponibilidadesRepository";

export const firestoreDashboardRepo = {
  async getMetrics() {
    const [
      totalPacientes,
      totalMedicos,
      totalCitasHoy,
      citasProgramadas,
      citasAtendidas,
      citasCanceladas,
      disponibilidadesLibres,
      disponibilidadesOcupadas,
    ] = await Promise.all([
      firestorePacientesRepo.count(),
      firestoreMedicosRepo.count(),
      firestoreCitasRepo.countHoy(),
      firestoreCitasRepo.countPorEstado("programada"),
      firestoreCitasRepo.countPorEstado("atendida"),
      firestoreCitasRepo.countPorEstado("cancelada"),
      firestoreDisponibilidadesRepo.countDisponibles(),
      firestoreDisponibilidadesRepo.countOcupadas(),
    ]);

    return {
      totalPacientes,
      totalMedicos,
      totalCitasHoy,
      citasProgramadas,
      citasAtendidas,
      citasCanceladas,
      disponibilidadesLibres,
      disponibilidadesOcupadas,
      dbMode: "firestore",
      dbLabel: "No relacional - Firestore",
    };
  },
};

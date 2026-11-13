import { postgresPacientesRepo } from "./pacientesRepository";
import { postgresMedicosRepo } from "./medicosRepository";
import { postgresCitasRepo } from "./citasRepository";
import { postgresDisponibilidadesRepo } from "./disponibilidadesRepository";

export const postgresDashboardRepo = {
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
      postgresPacientesRepo.count(),
      postgresMedicosRepo.count(),
      postgresCitasRepo.countHoy(),
      postgresCitasRepo.countPorEstado("programada"),
      postgresCitasRepo.countPorEstado("atendida"),
      postgresCitasRepo.countPorEstado("cancelada"),
      postgresDisponibilidadesRepo.countDisponibles(),
      postgresDisponibilidadesRepo.countOcupadas(),
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
      dbMode: "postgres",
      dbLabel: "Relacional - PostgreSQL",
    };
  },
};

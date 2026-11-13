import { NextResponse } from "next/server";
import { dashboardRepo, getDatabaseInfo } from "@/lib/repositories";

export async function GET() {
  const dbInfo = getDatabaseInfo();

  try {
    const metrics = await dashboardRepo.getMetrics();
    return NextResponse.json({
      success: true,
      data: {
        ...metrics,
        dbEngine: dbInfo.engine,
      },
    });
  } catch (error) {
    console.error("Error en /api/dashboard:", error);
    return NextResponse.json({
      success: false,
      data: {
        totalPacientes: 0,
        totalMedicos: 0,
        totalCitasHoy: 0,
        citasProgramadas: 0,
        citasAtendidas: 0,
        citasCanceladas: 0,
        disponibilidadesLibres: 0,
        disponibilidadesOcupadas: 0,
        dbMode: dbInfo.mode,
        dbLabel: dbInfo.label,
        dbEngine: dbInfo.engine,
        configRequerida: true,
      },
      message: error.message || "Error al consultar las métricas del sistema",
    });
  }
}

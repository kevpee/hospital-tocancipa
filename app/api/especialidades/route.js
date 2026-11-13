import { NextResponse } from "next/server";
import { especialidadesRepo } from "@/lib/repositories";

export async function GET() {
  try {
    const list = await especialidadesRepo.getAll();
    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error("Error en GET /api/especialidades:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error al obtener las especialidades médicas",
        data: [],
      },
      { status: 500 }
    );
  }
}

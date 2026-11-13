import { NextResponse } from "next/server";
import { consultoriosRepo } from "@/lib/repositories";

export async function GET() {
  try {
    const list = await consultoriosRepo.getAll();
    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error("Error en GET /api/consultorios:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error al obtener los consultorios",
        data: [],
      },
      { status: 500 }
    );
  }
}

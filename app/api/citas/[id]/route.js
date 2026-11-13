import { NextResponse } from "next/server";
import { citasRepo } from "@/lib/repositories";

export async function PATCH(request, context) {
  try {
    const { params } = context;
    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID de cita no proporcionado en la solicitud." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { estado } = body;

    const estadosValidos = ["programada", "atendida", "cancelada"];
    if (!estado || !estadosValidos.includes(estado)) {
      return NextResponse.json(
        {
          success: false,
          message: `Estado no válido. Opciones permitidas: ${estadosValidos.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const citaActualizada = await citasRepo.updateEstado(id, estado);

    const mensajesEstado = {
      atendida: "La cita médica fue marcada como atendida con éxito.",
      cancelada: "La cita médica fue cancelada correctamente.",
      programada: "La cita médica fue restablecida a programada.",
    };

    return NextResponse.json({
      success: true,
      message: mensajesEstado[estado] || "Estado de cita actualizado exitosamente.",
      data: citaActualizada,
    });
  } catch (error) {
    console.error("Error en PATCH /api/citas/[id]:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error al actualizar el estado de la cita médica.",
      },
      { status: 400 }
    );
  }
}

import { NextResponse } from "next/server";
import { horariosRepo, medicosRepo } from "@/lib/repositories";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const documento_de_identidad =
      searchParams.get("documento_de_identidad") ||
      searchParams.get("medicoId") ||
      undefined;
    const dia_semana = searchParams.get("dia_semana") || undefined;

    const list = await horariosRepo.getAll({
      documento_de_identidad,
      dia_semana,
    });

    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error("Error en GET /api/horarios:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error al obtener los horarios médicos.",
        data: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { documento_de_identidad, dia_semana } = body;

    if (!documento_de_identidad || String(documento_de_identidad).trim().length < 3) {
      return NextResponse.json(
        { success: false, message: "Debe especificar el documento de identidad del médico." },
        { status: 400 }
      );
    }

    const diasValidos = [
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
      "Domingo",
    ];

    if (!dia_semana || !diasValidos.includes(String(dia_semana).trim())) {
      return NextResponse.json(
        {
          success: false,
          message: `Día de semana no válido. Opciones: ${diasValidos.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Verificar médico
    const medico = await medicosRepo.getById(String(documento_de_identidad).trim());
    const medicoNombre = medico ? medico.nombre : "";

    const nuevoHorario = await horariosRepo.create({
      documento_de_identidad: String(documento_de_identidad).trim(),
      dia_semana: String(dia_semana).trim(),
      medicoNombre,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Horario de atención registrado exitosamente.",
        data: nuevoHorario,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en POST /api/horarios:", error);
    const status = error.message && error.message.includes("ya tiene") ? 409 : 500;
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error al registrar el horario de atención.",
      },
      { status }
    );
  }
}

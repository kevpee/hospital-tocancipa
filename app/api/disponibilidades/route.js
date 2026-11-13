import { NextResponse } from "next/server";
import {
  disponibilidadesRepo,
  medicosRepo,
  consultoriosRepo,
  horariosRepo,
} from "@/lib/repositories";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const documento_de_identidad =
      searchParams.get("documento_de_identidad") ||
      searchParams.get("medicoId") ||
      undefined;
    const fecha = searchParams.get("fecha") || undefined;
    const especialidad = searchParams.get("especialidad") || undefined;
    const soloDisponibles =
      searchParams.get("soloDisponibles") === "true" ||
      searchParams.get("soloLibres") === "true" ||
      undefined;
    const estado = searchParams.get("estado") || undefined;

    const list = await disponibilidadesRepo.getAll({
      documento_de_identidad,
      fecha,
      especialidad,
      soloDisponibles,
      estado,
    });

    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error("Error en GET /api/disponibilidades:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error al obtener las disponibilidades de atención.",
        data: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      documento_de_identidad,
      id_horario,
      id_sala,
      fecha,
      horario_atencion,
    } = body;

    if (!documento_de_identidad) {
      return NextResponse.json(
        { success: false, message: "Debe seleccionar el médico para la disponibilidad." },
        { status: 400 }
      );
    }

    if (!id_sala) {
      return NextResponse.json(
        { success: false, message: "Debe asignar un consultorio o sala de atención." },
        { status: 400 }
      );
    }

    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(String(fecha).trim())) {
      return NextResponse.json(
        { success: false, message: "La fecha concreta es obligatoria (formato AAAA-MM-DD)." },
        { status: 400 }
      );
    }

    if (!horario_atencion || String(horario_atencion).trim().length < 3) {
      return NextResponse.json(
        { success: false, message: "El horario de atención es obligatorio (ej. 08:00 - 08:30)." },
        { status: 400 }
      );
    }

    // Consultar datos complementarios para enriquecer y desnormalizar
    const [medico, consultorio] = await Promise.all([
      medicosRepo.getById(String(documento_de_identidad).trim()),
      consultoriosRepo.getById(String(id_sala).trim()),
    ]);

    if (!medico) {
      return NextResponse.json(
        { success: false, message: "El médico especificado no existe en el sistema." },
        { status: 404 }
      );
    }

    if (!consultorio) {
      return NextResponse.json(
        { success: false, message: "El consultorio seleccionado no existe." },
        { status: 404 }
      );
    }

    const especialidadNombre =
      typeof medico.especialidad === "object" && medico.especialidad !== null
        ? medico.especialidad.nombre
        : String(medico.especialidad || "General");

    const nuevaDisp = await disponibilidadesRepo.create({
      documento_de_identidad: String(documento_de_identidad).trim(),
      id_horario: id_horario || `hor_${documento_de_identidad}`,
      id_sala: String(id_sala).trim(),
      fecha: String(fecha).trim(),
      horario_atencion: String(horario_atencion).trim(),
      medicoNombre: medico.nombre,
      especialidad: especialidadNombre,
      consultorioNumero: consultorio.numero,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Espacio de disponibilidad creado exitosamente.",
        data: nuevaDisp,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en POST /api/disponibilidades:", error);
    const esConflicto =
      error.message &&
      (error.message.includes("ya cuenta con") ||
        error.message.includes("ya se encuentra asignado") ||
        error.message.includes("uq_"));

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error al crear el espacio de disponibilidad.",
      },
      { status: esConflicto ? 409 : 500 }
    );
  }
}

import { NextResponse } from "next/server";
import {
  citasRepo,
  pacientesRepo,
  disponibilidadesRepo,
  medicosRepo,
  consultoriosRepo,
} from "@/lib/repositories";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const medicoId =
      searchParams.get("medicoId") ||
      searchParams.get("documento_de_identidad") ||
      undefined;
    const fecha = searchParams.get("fecha") || undefined;
    const estado = searchParams.get("estado") || undefined;

    const list = await citasRepo.getAll({ medicoId, fecha, estado });
    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error("Error en GET /api/citas:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error al obtener las citas médicas",
        data: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    let {
      id_paciente,
      pacienteId,
      id_disponibilidad,
      disponibilidadId,
      motivo,
      // Campos opcionales para compatibilidad
      medicoId,
      consultorioId,
      fecha,
      hora,
    } = body;

    const pacienteKey = id_paciente || pacienteId;
    let dispKey = id_disponibilidad || disponibilidadId;

    if (!pacienteKey) {
      return NextResponse.json(
        { success: false, message: "Debe seleccionar un paciente para agendar la cita." },
        { status: 400 }
      );
    }

    if (!motivo || typeof motivo !== "string" || motivo.trim().length < 4) {
      return NextResponse.json(
        { success: false, message: "El motivo de la consulta es obligatorio (mínimo 4 caracteres)." },
        { status: 400 }
      );
    }

    // Obtener datos del paciente
    const paciente = await pacientesRepo.getById(String(pacienteKey));
    if (!paciente) {
      return NextResponse.json(
        { success: false, message: "El paciente seleccionado no existe en el sistema." },
        { status: 404 }
      );
    }

    // Si no se proporcionó id_disponibilidad directamente, pero se pasaron médico, consultorio, fecha y hora:
    // buscamos o creamos el espacio de disponibilidad correspondiente
    if (!dispKey && medicoId && consultorioId && fecha && hora) {
      const dispExistentes = await disponibilidadesRepo.getAll({
        documento_de_identidad: medicoId,
        fecha,
      });

      const match = dispExistentes.find(
        (d) => d.horario_atencion === hora && Number(d.estado) === 1
      );

      if (match) {
        dispKey = match.id || match.id_disponibilidad;
      } else {
        // Crear el espacio de disponibilidad
        const nuevaDisp = await disponibilidadesRepo.create({
          documento_de_identidad: medicoId,
          id_sala: consultorioId,
          fecha,
          horario_atencion: hora,
        });
        dispKey = nuevaDisp.id || nuevaDisp.id_disponibilidad;
      }
    }

    if (!dispKey) {
      return NextResponse.json(
        { success: false, message: "Debe seleccionar un espacio de disponibilidad válido." },
        { status: 400 }
      );
    }

    // Crear cita mediante la transacción atómica
    const nuevaCita = await citasRepo.create({
      id_paciente: paciente.id_paciente || paciente.id,
      id_disponibilidad: dispKey,
      motivo,
      pacienteNombre: paciente.nombre,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Cita médica reservada y agendada exitosamente.",
        data: nuevaCita,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en POST /api/citas:", error);
    const esConflicto =
      error.message &&
      (error.message.includes("ya fue reservado") ||
        error.message.includes("ya no está disponible") ||
        error.message.includes("ya existe una cita") ||
        error.message.includes("conflicto"));

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Error al reservar la cita. El espacio ya no está disponible.",
      },
      { status: esConflicto ? 409 : 500 }
    );
  }
}

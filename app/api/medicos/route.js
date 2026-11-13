import { NextResponse } from "next/server";
import { medicosRepo, especialidadesRepo } from "@/lib/repositories";

export async function GET() {
  try {
    const list = await medicosRepo.getAll();
    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error("Error en GET /api/medicos:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error al obtener la lista de médicos",
        data: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, documento, especialidadId } = body;

    if (!nombre || typeof nombre !== "string" || nombre.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: "El nombre del médico es obligatorio y debe tener al menos 3 caracteres." },
        { status: 400 }
      );
    }

    if (!documento || typeof documento !== "string" || documento.trim().length < 4) {
      return NextResponse.json(
        { success: false, message: "El documento de identidad es obligatorio y debe tener al menos 4 caracteres." },
        { status: 400 }
      );
    }

    if (!especialidadId) {
      return NextResponse.json(
        { success: false, message: "Debe seleccionar una especialidad médica de la lista." },
        { status: 400 }
      );
    }

    // Buscar la especialidad para obtener su nombre y embeberla como objeto { nombre }
    let especialidadObj = null;
    try {
      const espDoc = await especialidadesRepo.getById(String(especialidadId));
      if (espDoc) {
        especialidadObj = {
          id: espDoc.id,
          nombre: espDoc.nombre,
        };
      }
    } catch {
      // Si falla o no se encuentra por id, puede haberse pasado ya como nombre
    }

    if (!especialidadObj) {
      // Buscar en el listado general
      const todasEspecialidades = await especialidadesRepo.getAll();
      const match = todasEspecialidades.find(
        (e) => String(e.id) === String(especialidadId) || e.nombre === especialidadId
      );
      if (match) {
        especialidadObj = { id: match.id, nombre: match.nombre };
      } else {
        especialidadObj = { nombre: String(especialidadId).trim() };
      }
    }

    const nuevoMedico = await medicosRepo.create({
      nombre,
      documento,
      especialidadId: especialidadObj.id || especialidadId,
      especialidad: {
        nombre: especialidadObj.nombre, // Requisito estricto: especialidad embebida como { nombre }
        id: especialidadObj.id || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Médico registrado exitosamente en el sistema.",
        data: nuevoMedico,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en POST /api/medicos:", error);
    const status = error.message && error.message.includes("Ya existe") ? 409 : 500;
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error interno al registrar el médico.",
      },
      { status }
    );
  }
}

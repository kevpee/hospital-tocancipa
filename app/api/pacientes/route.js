import { NextResponse } from "next/server";
import { pacientesRepo } from "@/lib/repositories";

export async function GET() {
  try {
    const list = await pacientesRepo.getAll();
    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error("Error en GET /api/pacientes:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error al obtener la lista de pacientes",
        data: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, documento, telefono, correo, fechaNacimiento } = body;

    // Validaciones estrictas con mensajes en español
    if (!nombre || typeof nombre !== "string" || nombre.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: "El nombre completo es obligatorio y debe tener al menos 3 caracteres." },
        { status: 400 }
      );
    }

    if (!documento || typeof documento !== "string" || documento.trim().length < 4) {
      return NextResponse.json(
        { success: false, message: "El documento de identidad es obligatorio y debe contener al menos 4 caracteres." },
        { status: 400 }
      );
    }

    if (!telefono || typeof telefono !== "string" || telefono.trim().length < 6) {
      return NextResponse.json(
        { success: false, message: "El teléfono de contacto es obligatorio y debe tener al menos 6 dígitos." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!correo || !emailRegex.test(String(correo).trim())) {
      return NextResponse.json(
        { success: false, message: "El correo electrónico proporcionado no tiene un formato válido." },
        { status: 400 }
      );
    }

    if (!fechaNacimiento || !/^\d{4}-\d{2}-\d{2}$/.test(String(fechaNacimiento).trim())) {
      return NextResponse.json(
        { success: false, message: "La fecha de nacimiento es obligatoria (formato AAAA-MM-DD)." },
        { status: 400 }
      );
    }

    // Comprobar que la fecha de nacimiento no sea futura
    const birthDate = new Date(fechaNacimiento);
    if (isNaN(birthDate.getTime()) || birthDate > new Date()) {
      return NextResponse.json(
        { success: false, message: "La fecha de nacimiento no puede ser una fecha futura ni inválida." },
        { status: 400 }
      );
    }

    // Creación en el repositorio (incluye validación de documento duplicado)
    const nuevoPaciente = await pacientesRepo.create({
      nombre,
      documento,
      telefono,
      correo,
      fechaNacimiento,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Paciente registrado exitosamente en el sistema.",
        data: nuevoPaciente,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en POST /api/pacientes:", error);
    const status = error.message && error.message.includes("Ya existe") ? 409 : 500;
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error interno al registrar el paciente.",
      },
      { status }
    );
  }
}

/**
 * Datos semilla iniciales para especialidades, consultorios,
 * horarios de médicos y espacios de disponibilidad.
 */

export const ESPECIALIDADES_SEMILLA = [
  {
    id: "esp-med-gen",
    nombre: "Medicina General",
    descripcion: "Atención integral para la prevención, diagnóstico y tratamiento de patologías comunes.",
  },
  {
    id: "esp-pediatria",
    nombre: "Pediatría",
    descripcion: "Atención médica integral especializada para recién nacidos, niños y adolescentes.",
  },
  {
    id: "esp-cardiologia",
    nombre: "Cardiología",
    descripcion: "Prevención, diagnóstico y tratamiento de enfermedades del sistema cardiovascular y del corazón.",
  },
  {
    id: "esp-traumatologia",
    nombre: "Traumatología",
    descripcion: "Diagnóstico y tratamiento de lesiones del aparato locomotor, huesos y articulaciones.",
  },
  {
    id: "esp-ginecologia",
    nombre: "Ginecología",
    descripcion: "Cuidado de la salud integral de la mujer y atención en salud reproductiva.",
  },
];

export const CONSULTORIOS_SEMILLA = [
  {
    id: "cons-101",
    numero: "101",
    piso: "Piso 1",
    descripcion: "Consultorio de Medicina General y Triaje",
  },
  {
    id: "cons-102",
    numero: "102",
    piso: "Piso 1",
    descripcion: "Consultorio de Pediatría y Control de Niño Sano",
  },
  {
    id: "cons-201",
    numero: "201",
    piso: "Piso 2",
    descripcion: "Consultorio de Cardiología y Pruebas no Invasivas",
  },
  {
    id: "cons-202",
    numero: "202",
    piso: "Piso 2",
    descripcion: "Consultorio de Traumatología y Curaciones Menores",
  },
];

export const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const FRANJAS_HORARIAS_EJEMPLO = [
  "08:00 - 08:30",
  "08:30 - 09:00",
  "09:00 - 09:30",
  "09:30 - 10:00",
  "10:00 - 10:30",
  "10:30 - 11:00",
  "14:00 - 14:30",
  "14:30 - 15:00",
  "15:00 - 15:30",
  "15:30 - 16:00",
];

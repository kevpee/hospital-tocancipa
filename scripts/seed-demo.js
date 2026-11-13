#!/usr/bin/env node
/*
 * Hospital Tocancipá: conjunto sintético de carga (revisión seed-v1).
 * Los nombres son combinaciones generadas; documentos y teléfonos son ficticios.
 * Los correos usan example.com. seed_metadata identifica internamente los datos.
 *
 * Escritura administrativa local: gcloud ADC + Firestore REST/IAM.
 * Las operaciones IAM evitan Firestore Rules; por eso solo se escriben
 * documentos nuevos con precondición exists:false y confirmación interactiva.
 */

const REVISION = "hospital-tocancipa-seed-v1";
const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const COLLECTION_NAMES = ["pacientes", "medicos", "horarios", "disponibilidades", "citas", "especialidades", "consultorios"];
const SPECIALTIES = [
  ["esp-med-gen", "Medicina General", "Atención integral para la prevención, diagnóstico y tratamiento de patologías comunes."],
  ["esp-pediatria", "Pediatría", "Atención médica integral especializada para recién nacidos, niños y adolescentes."],
  ["esp-cardiologia", "Cardiología", "Prevención, diagnóstico y tratamiento de enfermedades del sistema cardiovascular y del corazón."],
  ["esp-traumatologia", "Traumatología", "Diagnóstico y tratamiento de lesiones del aparato locomotor, huesos y articulaciones."],
  ["esp-ginecologia", "Ginecología", "Cuidado de la salud integral de la mujer y atención en salud reproductiva."],
];
const ROOMS = [
  { id: "cons-101", numero: "101", piso: "Piso 1", descripcion: "Consultorio de Medicina General y Triaje" },
  { id: "cons-102", numero: "102", piso: "Piso 1", descripcion: "Consultorio de Pediatría y Control de Niño Sano" },
  { id: "cons-201", numero: "201", piso: "Piso 2", descripcion: "Consultorio de Cardiología y Pruebas no Invasivas" },
  { id: "cons-202", numero: "202", piso: "Piso 2", descripcion: "Consultorio de Traumatología y Curaciones Menores" },
  { id: "cons-103", numero: "103", piso: "Piso 1", descripcion: "Consultorio de Medicina General" },
  { id: "cons-203", numero: "203", piso: "Piso 2", descripcion: "Consultorio de Medicina Interna" },
  { id: "cons-204", numero: "204", piso: "Piso 2", descripcion: "Consultorio de Ginecología" },
  { id: "cons-301", numero: "301", piso: "Piso 3", descripcion: "Consultorio de Atención Ambulatoria" },
];

const DOCTORS = [
  ["8999000101", "Laura Marcela Rincón Pardo", 0, [1, 2, 4, 6], 0],
  ["8999000102", "Andrés Felipe Cárdenas Gil", 1, [1, 3, 5], 1],
  ["8999000103", "Diana Carolina Méndez Ruiz", 2, [1, 2, 3, 4, 5], 2],
  ["8999000104", "Juan Sebastián Torres León", 3, [2, 4, 5, 6], 3],
  ["8999000105", "Paola Andrea Vargas Rojas", 4, [1, 3, 4, 6], 4],
  ["8999000106", "Camilo José Herrera Díaz", 0, [1, 2, 3, 5, 6], 5],
  ["8999000107", "Natalia Sofía Castro Peña", 1, [2, 3, 5, 6], 6],
  ["8999000108", "Miguel Ángel Suárez López", 2, [1, 3, 4, 5], 7],
  ["8999000109", "Juliana Marcela Ortiz Vega", 3, [1, 2, 4, 6], 3],
  ["8999000110", "David Santiago Beltrán Mora", 4, [1, 2, 3, 5, 6], 6],
  ["8999000111", "María Fernanda Rojas Cifuentes", 0, [2, 3, 4, 5], 0],
  ["8999000112", "Carlos Eduardo Pineda Salazar", 1, [1, 2, 4, 5, 6], 1],
  ["8999000113", "Angélica María León Ramírez", 2, [1, 3, 5, 6], 2],
  ["8999000114", "Óscar Mauricio Gutiérrez Niño", 3, [1, 2, 3, 4], 5],
  ["8999000115", "Carolina Isabel Acosta Rueda", 4, [2, 4, 5, 6], 4],
];
const FIRST_NAMES = ["Valentina", "Samuel", "Isabella", "Mateo", "Mariana", "Nicolás", "Lucía", "Emmanuel", "Gabriela", "Tomás", "Salomé", "Daniel", "Antonella", "David", "Sara", "Esteban", "Manuela", "Juan Pablo", "Camila", "Felipe", "María José", "Santiago", "Laura", "Alejandro", "Sofía", "Miguel", "Juliana", "Andrés", "Paula", "Sebastián"];
const LAST_NAMES = ["Gómez", "Rodríguez", "Martínez", "López", "Hernández", "García", "Pérez", "Sánchez", "Ramírez", "Torres", "Díaz", "Vargas", "Castro", "Rojas", "Moreno", "Suárez", "Romero", "Herrera", "Mendoza", "Ortiz", "Medina", "Cárdenas", "León", "Pardo", "Gil", "Peña", "Salazar", "Rincón", "Acosta", "Beltrán"];
const SHIFTS = [["07:00", "12:00"], ["08:00", "13:00"], ["13:00", "18:00"], ["14:00", "18:00"]];
const MOTIVES = ["Consulta de medicina general", "Control pediátrico", "Valoración cardiológica", "Valoración traumatológica", "Consulta ginecológica"];

function bogotaToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function dateAtOffset(offset, anchorDate) {
  const d = new Date(`${anchorDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
function dayIndex(date) { return new Date(`${date}T12:00:00Z`).getUTCDay(); }
function hash(value) {
  let h = 2166136261;
  for (const char of value) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return h >>> 0;
}
function idSlug(value) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]/g, ""); }
function timeLabel(minutes) {
  const fmt = (n) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  return `${fmt(minutes)} - ${fmt(minutes + 30)}`;
}
function makeDataset(anchorDate) {
  const doctors = DOCTORS.map(([documento, nombre, specialtyIndex, weekdays, roomIndex]) => ({
    id: documento,
    documento_de_identidad: documento,
    documento,
    nombre,
    especialidad: { id: SPECIALTIES[specialtyIndex][0], nombre: SPECIALTIES[specialtyIndex][1] },
    fechaRegistro: `${anchorDate}T08:00:00.000Z`,
    seed_metadata: { revision: REVISION, synthetic: true },
    weekdays,
    roomIndex,
    shift: SHIFTS[hash(documento) % SHIFTS.length],
  }));

  const patients = Array.from({ length: 120 }, (_, i) => {
    const first = FIRST_NAMES[(i * 7 + Math.floor(i / 5)) % FIRST_NAMES.length];
    const last1 = LAST_NAMES[(i * 11 + 3) % LAST_NAMES.length];
    const last2 = LAST_NAMES[(i * 13 + 9) % LAST_NAMES.length];
    const document = String(1000000000 + i + 1);
    const id = `pac_${document}_seedv1`;
    const year = 1948 + ((i * 17) % 59);
    const month = 1 + ((i * 7) % 12);
    const day = 1 + ((i * 11) % 27);
    const dob = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { id, id_paciente: id, documento_de_identidad: document, documento: document,
      nombre: `${first} ${last1} ${last2}`, telefono: `+57 300 000 ${String(i + 1).padStart(4, "0")}`,
      correo: `paciente.${String(i + 1).padStart(3, "0")}@example.com`, fecha_nacimiento: dob,
      fechaNacimiento: dob, fechaRegistro: `${anchorDate}T08:00:00.000Z`,
      seed_metadata: { revision: REVISION, synthetic: true } };
  });

  const schedules = [];
  for (const doctor of doctors) for (const weekday of doctor.weekdays) {
    const day = DAY_NAMES[weekday];
    schedules.push({ id: `hor_${doctor.id}_${idSlug(day.toLowerCase())}`, id_horario: `hor_${doctor.id}_${idSlug(day.toLowerCase())}`,
      documento_de_identidad: doctor.id, dia_semana: day, medicoNombre: doctor.nombre,
      fechaCreacion: `${anchorDate}T08:00:00.000Z`, seed_metadata: { revision: REVISION, synthetic: true } });
  }

  const candidates = [];
  for (let offset = -21; offset <= 34; offset++) {
    const date = dateAtOffset(offset, anchorDate);
    const weekday = dayIndex(date);
    for (const doctor of doctors) {
      if (!doctor.weekdays.includes(weekday)) continue;
      const [start, end] = doctor.shift;
      const startMin = Number(start.slice(0, 2)) * 60 + Number(start.slice(3));
      const endMin = Number(end.slice(0, 2)) * 60 + Number(end.slice(3));
      for (let minutes = startMin; minutes + 30 <= endMin; minutes += 30) {
        const horario_atencion = timeLabel(minutes);
        const room = ROOMS[doctor.roomIndex];
        const id = `disp_${doctor.id}_${date}_${horario_atencion.replace(/[^a-zA-Z0-9]/g, "")}`;
        candidates.push({ id, id_disponibilidad: id, id_horario: `hor_${doctor.id}_${idSlug(DAY_NAMES[weekday].toLowerCase())}`,
          documento_de_identidad: doctor.id, id_sala: room.id, fecha: date, horario_atencion,
          estado: 1, medicoNombre: doctor.nombre, especialidad: doctor.especialidad.nombre,
          consultorioNumero: room.numero, fechaCreacion: `${anchorDate}T08:00:00.000Z`,
          seed_metadata: { revision: REVISION, synthetic: true }, _doctor: doctor });
      }
    }
  }
  candidates.sort((a, b) => hash(a.id) - hash(b.id));
  const availabilities = [];
  const doctorSlots = new Set();
  const roomSlots = new Set();
  for (const item of candidates) {
    const start = item.horario_atencion.slice(0, 5);
    const doctorKey = `${item.documento_de_identidad}|${item.fecha}|${start}`;
    const roomKey = `${item.id_sala}|${item.fecha}|${start}`;
    if (doctorSlots.has(doctorKey) || roomSlots.has(roomKey)) continue;
    doctorSlots.add(doctorKey); roomSlots.add(roomKey);
    availabilities.push(item);
    if (availabilities.length === 300) break;
  }
  if (availabilities.length !== 300) throw new Error(`Solo fue posible generar ${availabilities.length} disponibilidades.`);

  const chronological = [...availabilities].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horario_atencion.localeCompare(b.horario_atencion));
  const selected = chronological.filter((_, i) => i % 5 !== 1).slice(0, 180);
  while (selected.length < 180) {
    const next = chronological.find((item) => !selected.includes(item));
    if (!next) throw new Error("No fue posible completar las citas sin duplicar cupos.");
    selected.push(next);
  }
  const appointments = selected.map((slot, i) => {
    const dateOffset = Math.round((new Date(`${slot.fecha}T12:00:00Z`) - new Date(`${anchorDate}T12:00:00Z`)) / 86400000);
    const status = i % 9 === 0 ? "cancelada" : dateOffset < 0 ? "atendida" : "programada";
    slot.estado = status === "cancelada" ? 1 : 0;
    const patient = patients[(i * 17 + Math.floor(i / 7)) % patients.length];
    const doctor = slot._doctor;
    const id = `cita_${slot.id}`;
    return { id, id_cita: id, id_paciente: patient.id, pacienteId: patient.id,
      id_disponibilidad: slot.id, disponibilidadId: slot.id,
      documento_de_identidad: doctor.id, medicoId: doctor.id, id_sala: slot.id_sala, consultorioId: slot.id_sala,
      fecha: slot.fecha, hora: slot.horario_atencion, horario_atencion: slot.horario_atencion,
      motivo: MOTIVES[DOCTORS.findIndex((row) => row[0] === doctor.id) % MOTIVES.length], estado: status,
      pacienteNombre: patient.nombre, medicoNombre: doctor.nombre, especialidad: doctor.especialidad.nombre,
      consultorioNumero: slot.consultorioNumero, fecha_creacion: `${anchorDate}T08:00:00.000Z`,
      createdAt: `${anchorDate}T08:00:00.000Z`, seed_metadata: { revision: REVISION, synthetic: true } };
  });
  for (const slot of availabilities) delete slot._doctor;

  const specialties = SPECIALTIES.map(([id, nombre, descripcion]) => ({ id, nombre, descripcion,
    fechaCreacion: `${anchorDate}T08:00:00.000Z`, seed_metadata: { revision: REVISION, synthetic: true } }));
  const rooms = ROOMS.map((room) => ({ ...room, fechaCreacion: `${anchorDate}T08:00:00.000Z`, seed_metadata: { revision: REVISION, synthetic: true } }));
  const doctorRecords = doctors.map(({ id, documento_de_identidad, documento, nombre, especialidad, fechaRegistro, seed_metadata }) =>
    ({ id, documento_de_identidad, documento, nombre, especialidad, fechaRegistro, seed_metadata }));
  return { patients, doctors: doctorRecords, schedules, availabilities, appointments, specialties, rooms };
}

function validate(data, anchorDate) {
  const errors = [];
  const groups = ["patients", "doctors", "schedules", "availabilities", "appointments", "specialties", "rooms"];
  const expectedCounts = { patients: 120, doctors: 15, schedules: 63, availabilities: 300, appointments: 180, specialties: 5, rooms: 8 };
  for (const group of groups) {
    const ids = data[group].map((row) => row.id);
    if (new Set(ids).size !== ids.length) errors.push(`${group}: identificadores duplicados.`);
    if (ids.length !== expectedCounts[group]) errors.push(`${group}: cantidad incorrecta (${ids.length}; esperado ${expectedCounts[group]}).`);
  }
  for (const field of ["documento_de_identidad", "correo"]) {
    const values = data.patients.map((row) => row[field]);
    if (new Set(values).size !== values.length) errors.push(`patients: ${field} duplicado.`);
  }
  const doctorIds = new Set(data.doctors.map((x) => x.id));
  const patientIds = new Set(data.patients.map((x) => x.id));
  const roomIds = new Set(data.rooms.map((x) => x.id));
  const scheduleIds = new Set(data.schedules.map((x) => x.id));
  const doctorTimes = new Map(); const roomTimes = new Map();
  for (const slot of data.availabilities) {
    const interval = parseInterval(slot.horario_atencion);
    if (!interval || !scheduleIds.has(slot.id_horario)) errors.push(`Disponibilidad ${slot.id}: horario o relación inválida.`);
    const doctorKey = `${slot.documento_de_identidad}|${slot.fecha}`;
    const roomKey = `${slot.id_sala}|${slot.fecha}`;
    if (!doctorIds.has(slot.documento_de_identidad) || !roomIds.has(slot.id_sala) || !scheduleIds.has(slot.id_horario)) errors.push(`Disponibilidad ${slot.id}: relación inválida.`);
    if (interval) {
      for (const prior of doctorTimes.get(doctorKey) || []) if (overlaps(interval, prior.interval)) errors.push(`Disponibilidad solapada para médico en ${slot.fecha} ${slot.horario_atencion}.`);
      for (const prior of roomTimes.get(roomKey) || []) if (overlaps(interval, prior.interval)) errors.push(`Consultorio duplicado en ${slot.fecha} ${slot.horario_atencion}.`);
      doctorTimes.set(doctorKey, [...(doctorTimes.get(doctorKey) || []), { interval, id: slot.id }]);
      roomTimes.set(roomKey, [...(roomTimes.get(roomKey) || []), { interval, id: slot.id }]);
    }
  }
  const usedSlots = new Set();
  for (const appointment of data.appointments) {
    const slot = data.availabilities.find((x) => x.id === appointment.id_disponibilidad);
    if (!patientIds.has(appointment.id_paciente) || !slot) errors.push(`Cita ${appointment.id}: paciente o disponibilidad inexistente.`);
    if (usedSlots.has(appointment.id_disponibilidad)) errors.push(`Doble reserva para ${appointment.id_disponibilidad}.`);
    usedSlots.add(appointment.id_disponibilidad);
    if (appointment.estado === "atendida" && appointment.fecha >= anchorDate) errors.push(`Cita atendida no anterior al ancla: ${appointment.id}.`);
    if (appointment.estado === "cancelada" && slot && slot.estado !== 1) errors.push(`Cita cancelada no liberó ${slot.id}.`);
    if (appointment.estado !== "cancelada" && slot && slot.estado !== 0) errors.push(`Cita activa sin cupo ocupado: ${slot.id}.`);
    if (!["programada", "atendida", "cancelada"].includes(appointment.estado)) errors.push(`Estado inválido en ${appointment.id}.`);
  }
  if (errors.length) throw new Error(`Validación fallida:\n- ${errors.join("\n- ")}`);
}

function parseInterval(label) {
  const match = /^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/.exec(String(label || "").trim());
  if (!match) return null;
  const [, shRaw, smRaw, ehRaw, emRaw] = match;
  const [sh, sm, eh, em] = [shRaw, smRaw, ehRaw, emRaw].map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (sh > 23 || eh > 23 || sm > 59 || em > 59 || end <= start) return null;
  return { start, end };
}
function overlaps(a, b) { return a.start < b.end && b.start < a.end; }

function printSummary(data, anchorDate) {
  console.log(`Conjunto sintético ${REVISION} (fecha de referencia ${anchorDate}; sin datos reales).`);
  console.log(`Pacientes: ${data.patients.length}`);
  console.log(`Médicos: ${data.doctors.length}`);
  console.log(`Especialidades: ${data.specialties.length}`);
  console.log(`Consultorios: ${data.rooms.length}`);
  console.log(`Horarios: ${data.schedules.length}`);
  console.log(`Disponibilidades: ${data.availabilities.length}`);
  console.log(`Citas: ${data.appointments.length}`);
  console.log(`Estados de cita: ${["programada", "atendida", "cancelada"].map((state) => `${state} ${data.appointments.filter((x) => x.estado === state).length}`).join(", ")}.`);
  console.log("Validaciones: identificadores y relaciones únicas; sin dobles reservas ni solapamientos de médico/consultorio.");
}

function parseArguments(args) {
  const parsed = { mode: null, projectId: null, anchorDate: null };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run" || arg === "--write") {
      if (parsed.mode) throw new Error("Indica solo uno de --dry-run o --write.");
      parsed.mode = arg;
    } else if (arg === "--project-id" && args[i + 1]) parsed.projectId = args[++i];
    else if (arg === "--anchor-date" && args[i + 1]) parsed.anchorDate = args[++i];
    else throw new Error(`Argumento desconocido o incompleto: ${arg}`);
  }
  if (!parsed.mode) throw new Error("Indica --dry-run o --write.");
  parsed.anchorDate ||= bogotaToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.anchorDate) || new Date(`${parsed.anchorDate}T00:00:00Z`).toISOString().slice(0, 10) !== parsed.anchorDate) {
    throw new Error("La fecha de referencia debe existir y usar el formato AAAA-MM-DD.");
  }
  if (parsed.mode === "--write") {
    if (!parsed.projectId || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(parsed.projectId)) {
      throw new Error("La carga requiere --project-id con el ID válido del proyecto Firebase.");
    }
    if (!args.includes("--anchor-date")) throw new Error("Para una carga idempotente, --write requiere una fecha fija con --anchor-date AAAA-MM-DD.");
  }
  return parsed;
}

function storedData(collection, record) {
  const { id, ...data } = record;
  if (collection === "pacientes") delete data.id_paciente;
  if (collection === "horarios") delete data.id_horario;
  if (collection === "disponibilidades") delete data.id_disponibilidad;
  if (collection === "citas") delete data.id_cita;
  return data;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function sameData(a, b) { return JSON.stringify(stable(a)) === JSON.stringify(stable(b)); }

function firestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (typeof value === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, firestoreValue(item)])) } };
  throw new Error(`Tipo de dato no compatible con Firestore: ${typeof value}`);
}
function parseFirestoreValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("mapValue" in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, parseFirestoreValue(item)]));
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(parseFirestoreValue);
  return undefined;
}
function parseFirestoreDocument(document) {
  return Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, parseFirestoreValue(value)]));
}

function getGcloudOutput(args) {
  const { spawnSync } = require("node:child_process");
  const { existsSync } = require("node:fs");
  const { delimiter, join } = require("node:path");
  const isWindows = process.platform === "win32";
  const candidates = isWindows
    ? [
        ...(process.env.PATH || "").split(delimiter).map((directory) => join(directory, "gcloud.cmd")),
        process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google", "Cloud SDK", "google-cloud-sdk", "bin", "gcloud.cmd"),
        process.env.ProgramFiles && join(process.env.ProgramFiles, "Google", "Cloud SDK", "google-cloud-sdk", "bin", "gcloud.cmd"),
        process.env["ProgramFiles(x86)"] && join(process.env["ProgramFiles(x86)"], "Google", "Cloud SDK", "google-cloud-sdk", "bin", "gcloud.cmd"),
      ].filter(Boolean)
    : ["gcloud"];
  const command = isWindows ? candidates.find((candidate) => existsSync(candidate)) : candidates[0];
  if (!command) throw new Error("No se encontró gcloud. Instala Google Cloud CLI y autentica una cuenta con permisos de lectura y creación en Firestore.");
  // Windows distribuye gcloud como .cmd; shell es necesario para ejecutar ese lanzador.
  // Los únicos argumentos usados aquí son constantes internas del script.
  const result = spawnSync(command, args, { encoding: "utf8", windowsHide: true, timeout: 30000, shell: isWindows });
  if (result.error?.code === "ENOENT") throw new Error("No se encontró gcloud. Instala Google Cloud CLI y autentica una cuenta con permisos de lectura y creación en Firestore.");
  if (result.error) throw new Error(`No se pudo ejecutar gcloud: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`gcloud falló: ${(result.stderr || result.stdout || "sin detalle").trim()}`);
  return result.stdout.trim();
}

function activeGcloudAccount() {
  const account = getGcloudOutput(["auth", "list", "--filter=status:ACTIVE", "--format=value(account)", "--quiet"]).split(/\r?\n/).filter(Boolean)[0];
  if (!account) throw new Error("gcloud no tiene una cuenta activa. Inicia sesión con gcloud auth login.");
  return account;
}

async function firestoreRequest(projectId, token, path, options = {}) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body.error?.message || `HTTP ${response.status}`;
    throw new Error(`Firestore respondió ${response.status}: ${message}`);
  }
  return body;
}

async function listCollection(projectId, token, collection) {
  const documents = [];
  let pageToken;
  do {
    const query = new URLSearchParams({ pageSize: "1000" });
    if (pageToken) query.set("pageToken", pageToken);
    const page = await firestoreRequest(projectId, token, `${collection}?${query}`);
    for (const document of page.documents || []) {
      const id = document.name.slice(document.name.lastIndexOf("/") + 1);
      documents.push({ id, data: parseFirestoreDocument(document) });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return documents;
}

function recordsByCollection(data) {
  return [
    ["especialidades", data.specialties], ["consultorios", data.rooms], ["medicos", data.doctors],
    ["pacientes", data.patients], ["horarios", data.schedules],
    ["disponibilidades", data.availabilities], ["citas", data.appointments],
  ].map(([collection, records]) => [collection, records.map((record) => ({ id: record.id, data: storedData(collection, record) }))]);
}

function compatibleCatalogDocument(collection, existing, expected) {
  const keys = collection === "especialidades" ? ["nombre", "descripcion"] : ["numero", "piso", "descripcion"];
  return keys.every((key) => existing[key] === expected[key]);
}

function checkRemoteConflicts(data, remote) {
  const errors = [];
  const plan = recordsByCollection(data).map(([collection, records]) => {
    const existing = new Map(remote[collection].map((doc) => [doc.id, doc.data]));
    const pending = [];
    for (const record of records) {
      const current = existing.get(record.id);
      if (!current) { pending.push(record); continue; }
      if (sameData(current, record.data)) continue;
      if (["especialidades", "consultorios"].includes(collection) && compatibleCatalogDocument(collection, current, record.data)) continue;
      errors.push(`${collection}/${record.id} ya existe con contenido distinto; no se sobrescribirá.`);
    }
    return [collection, pending];
  });
  const exactSeedAlreadyPresent = (collection, id) => {
    const current = remote[collection].find((doc) => doc.id === id)?.data;
    return current?.seed_metadata?.revision === REVISION;
  };
  const patientDocs = remote.pacientes;
  for (const patient of data.patients) {
    const duplicate = patientDocs.find((doc) => String(doc.data.documento_de_identidad || doc.data.documento || "") === patient.documento_de_identidad && doc.id !== patient.id);
    if (duplicate) errors.push(`Documento de paciente ${patient.documento_de_identidad} ya existe en pacientes/${duplicate.id}.`);
  }
  for (const doctor of data.doctors) {
    const duplicate = remote.medicos.find((doc) => String(doc.data.documento_de_identidad || doc.data.documento || doc.id) === doctor.documento_de_identidad && doc.id !== doctor.id);
    if (duplicate) errors.push(`Documento de médico ${doctor.documento_de_identidad} ya existe en medicos/${duplicate.id}.`);
  }
  for (const schedule of data.schedules) {
    const duplicate = remote.horarios.find((doc) => doc.data.documento_de_identidad === schedule.documento_de_identidad && doc.data.dia_semana === schedule.dia_semana && doc.id !== schedule.id);
    if (duplicate) errors.push(`El médico ${schedule.documento_de_identidad} ya tiene horario ${schedule.dia_semana} (${duplicate.id}).`);
  }
  for (const slot of data.availabilities) {
    const interval = parseInterval(slot.horario_atencion);
    for (const doc of remote.disponibilidades) {
      if (doc.id === slot.id && exactSeedAlreadyPresent("disponibilidades", slot.id)) continue;
      if (doc.data.fecha !== slot.fecha) continue;
      const existingInterval = parseInterval(doc.data.horario_atencion);
      const sameDoctor = doc.data.documento_de_identidad === slot.documento_de_identidad;
      const sameRoom = doc.data.id_sala === slot.id_sala;
      if ((sameDoctor || sameRoom) && !existingInterval) {
        errors.push(`No se puede comprobar el horario de ${doc.id}; requiere revisión manual antes de cargar.`);
        continue;
      }
      if (!existingInterval || !interval || !overlaps(interval, existingInterval)) continue;
      if (sameDoctor) errors.push(`Conflicto con disponibilidad existente ${doc.id}: mismo médico y franja solapada.`);
      if (sameRoom) errors.push(`Conflicto con disponibilidad existente ${doc.id}: mismo consultorio y franja solapada.`);
    }
  }
  for (const appointment of data.appointments) {
    const duplicate = remote.citas.find((doc) => (doc.data.id_disponibilidad || doc.data.disponibilidadId) === appointment.id_disponibilidad && doc.id !== appointment.id);
    if (duplicate) errors.push(`La disponibilidad ${appointment.id_disponibilidad} ya tiene cita ${duplicate.id}.`);
  }
  if (errors.length) throw new Error(`Preflight detenido: se encontraron conflictos; no se escribió nada.\n- ${[...new Set(errors)].join("\n- ")}`);
  return plan;
}

async function confirmWrite(projectId, account, plan) {
  const { createInterface } = require("node:readline/promises");
  const { stdin, stdout } = require("node:process");
  const pending = plan.reduce((sum, [, records]) => sum + records.length, 0);
  console.log(`Cuenta gcloud: ${account}`);
  console.log(`Proyecto destino: ${projectId}`);
  console.log(`Documentos nuevos a crear: ${pending}; los existentes no se actualizarán ni eliminarán.`);
  for (const [collection, records] of plan) console.log(`  ${collection}: ${records.length} nuevos.`);
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(`Para confirmar, escribe exactamente CARGAR ${projectId}: `);
    if (answer !== `CARGAR ${projectId}`) throw new Error("Confirmación incorrecta; no se escribió nada.");
  } finally { rl.close(); }
}

async function writePlan(projectId, token, plan) {
  const base = `projects/${projectId}/databases/(default)/documents`;
  const writes = [];
  for (const [collection, records] of plan) for (const record of records) {
    writes.push({ update: { name: `${base}/${collection}/${record.id}`, fields: Object.fromEntries(Object.entries(record.data).map(([key, value]) => [key, firestoreValue(value)])) }, currentDocument: { exists: false } });
  }
  for (let offset = 0; offset < writes.length; offset += 400) {
    const chunk = writes.slice(offset, offset + 400);
    try {
      await firestoreRequest(projectId, token, ":commit", { method: "POST", body: JSON.stringify({ writes: chunk }) });
    } catch (error) {
      throw new Error(`${error.message}\nLa carga se detuvo en el lote ${Math.floor(offset / 400) + 1}; los lotes anteriores pueden haber quedado creados. Repite el mismo comando y la misma fecha para reanudar: el preflight reconocerá los documentos idénticos y no los sobrescribirá.`);
    }
    console.log(`Lote confirmado: ${Math.min(offset + chunk.length, writes.length)} de ${writes.length}.`);
  }
  console.log(`Carga completa: ${writes.length} documentos creados; no se actualizaron ni eliminaron documentos existentes.`);
}

async function main() {
  let options;
  try { options = parseArguments(process.argv.slice(2)); }
  catch (error) {
    console.error(`${error.message}\nUso: node scripts/seed-demo.js --dry-run [--anchor-date AAAA-MM-DD]`);
    console.error("     node scripts/seed-demo.js --write --project-id ID --anchor-date AAAA-MM-DD");
    process.exitCode = 2; return;
  }
  const { mode, projectId, anchorDate } = options;
  const data = makeDataset(anchorDate);
  validate(data, anchorDate);
  printSummary(data, anchorDate);
  if (mode === "--dry-run") {
    console.log("Modo simulación: no se inicializó Firebase y no se realizaron escrituras.");
    return;
  }
  const { readFileSync } = require("node:fs");
  const { join } = require("node:path");
  const firebaseConfig = JSON.parse(readFileSync(join(__dirname, "..", ".firebaserc"), "utf8"));
  const configuredProject = firebaseConfig.projects?.default;
  if (!configuredProject || configuredProject !== projectId) throw new Error(`El proyecto confirmado (${projectId}) no coincide con .firebaserc (${configuredProject || "sin proyecto predeterminado"}); se cancela la carga.`);
  const account = activeGcloudAccount();
  const token = getGcloudOutput(["auth", "print-access-token", "--quiet"]);
  const remotePairs = await Promise.all(COLLECTION_NAMES.map(async (collection) => [collection, await listCollection(projectId, token, collection)]));
  const remote = Object.fromEntries(remotePairs);
  const plan = checkRemoteConflicts(data, remote);
  const createCount = plan.reduce((sum, [, records]) => sum + records.length, 0);
  console.log(`Preflight correcto: ${createCount} documentos nuevos; colecciones catalogadas también se revisaron.`);
  await confirmWrite(projectId, account, plan);
  const freshToken = getGcloudOutput(["auth", "print-access-token", "--quiet"]);
  await writePlan(projectId, freshToken, plan);
}

main().catch((error) => { console.error(error.message || error); process.exitCode = 1; });

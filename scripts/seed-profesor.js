#!/usr/bin/env node
/*
 * Datos sintéticos pequeños para la presentación académica de Hospital Tocancipá.
 *
 * La simulación consulta Firestore con gcloud, pero nunca escribe.
 * La escritura requiere --write, preflight limpio y confirmación interactiva.
 * Solo crea documentos ausentes con precondición exists:false; no actualiza ni borra.
 */

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const { createInterface } = require("node:readline/promises");
const { stdin, stdout } = require("node:process");

const PROJECT_ID = "citas-hospital-29a1c";
const REVISION = "hospital-tocancipa-seed-profesor-v1";
const COLLECTIONS = [
  "pacientes",
  "medicos",
  "especialidades",
  "consultorios",
  "horarios",
  "disponibilidades",
  "citas",
];
const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const SPECIALTIES = [
  {
    id: "esp-prof-demo-med-gen",
    nombre: "Medicina General",
    descripcion: "Atención integral para la prevención, diagnóstico y tratamiento de patologías comunes.",
  },
  {
    id: "esp-prof-demo-pediatria",
    nombre: "Pediatría",
    descripcion: "Atención médica integral especializada para recién nacidos, niños y adolescentes.",
  },
  {
    id: "esp-prof-demo-dermatologia",
    nombre: "Dermatología",
    descripcion: "Prevención, diagnóstico y tratamiento de afecciones de la piel, cabello y uñas.",
  },
];

const ROOMS = [
  { id: "cons-prof-demo-101", numero: "101", piso: "Piso 1", descripcion: "Consultorio de Medicina General y Triaje" },
  { id: "cons-prof-demo-102", numero: "102", piso: "Piso 1", descripcion: "Consultorio de Pediatría y Control de Niño Sano" },
];

const DOCTORS = [
  {
    id: "SYN-MED-001",
    nombre: "Laura Marcela Rincón Pardo",
    especialidad: SPECIALTIES[0],
    roomId: "cons-prof-demo-101",
    schedules: ["Lunes", "Miércoles"],
    times: ["08:00 - 08:30", "08:30 - 09:00"],
  },
  {
    id: "SYN-MED-002",
    nombre: "Andrés Felipe Cárdenas Gil",
    especialidad: SPECIALTIES[1],
    roomId: "cons-prof-demo-102",
    schedules: ["Martes", "Jueves"],
    times: ["09:00 - 09:30", "09:30 - 10:00"],
  },
  {
    id: "SYN-MED-003",
    nombre: "Diana Carolina Méndez Ruiz",
    especialidad: SPECIALTIES[2],
    roomId: "cons-prof-demo-102",
    schedules: ["Miércoles", "Viernes"],
    times: ["10:00 - 10:30", "10:30 - 11:00"],
  },
];

const PATIENTS = [
  ["Marta Lucía Restrepo Gil", "SYN-PAC-001", "3000000101", "marta.restrepo@example.com", "1988-04-12"],
  ["Nicolás Andrés Pardo Ruiz", "SYN-PAC-002", "3000000102", "nicolas.pardo@example.com", "1994-09-23"],
  ["Isabella Torres Cifuentes", "SYN-PAC-003", "3000000103", "isabella.torres@example.com", "2015-02-08"],
  ["Samuel Moreno Vargas", "SYN-PAC-004", "3000000104", "samuel.moreno@example.com", "2017-06-17"],
  ["Camila Rojas Beltrán", "SYN-PAC-005", "3000000105", "camila.rojas@example.com", "1991-11-30"],
];

function bogotaToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function assertDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new Error("La fecha debe existir y usar formato AAAA-MM-DD.");
  }
}

function addDays(date, amount) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function dayIndex(date) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function nextWeekday(anchorDate, weekdayName) {
  const target = DAYS.indexOf(weekdayName);
  if (target < 0) throw new Error(`Día no reconocido: ${weekdayName}`);
  let offset = (target - dayIndex(anchorDate) + 7) % 7;
  if (offset === 0) offset = 7;
  return addDays(anchorDate, offset);
}

function daySlug(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]/g, "");
}

function seedMetadata() {
  return { revision: REVISION, synthetic: true };
}

function makeDataset(anchorDate) {
  const specialties = SPECIALTIES.map((item) => ({
    ...item,
    fechaCreacion: `${anchorDate}T12:00:00.000Z`,
    seed_metadata: seedMetadata(),
  }));
  const rooms = ROOMS.map((item) => ({
    ...item,
    fechaCreacion: `${anchorDate}T12:00:00.000Z`,
    seed_metadata: seedMetadata(),
  }));
  const patients = PATIENTS.map(([nombre, documento, telefono, correo, fechaNacimiento], index) => {
    const id = `pac_demo_prof_${String(index + 1).padStart(3, "0")}`;
    return {
      id,
      id_paciente: id,
      nombre,
      documento,
      documento_de_identidad: documento,
      telefono,
      correo,
      fecha_nacimiento: fechaNacimiento,
      fechaNacimiento,
      fechaRegistro: `${anchorDate}T12:00:00.000Z`,
      seed_metadata: seedMetadata(),
    };
  });
  const doctors = DOCTORS.map((item) => ({
    id: item.id,
    documento: item.id,
    documento_de_identidad: item.id,
    nombre: item.nombre,
    especialidad: { id: item.especialidad.id, nombre: item.especialidad.nombre },
    fechaRegistro: `${anchorDate}T12:00:00.000Z`,
    seed_metadata: seedMetadata(),
  }));

  const schedules = [];
  const availabilities = [];
  for (const doctor of DOCTORS) {
    const room = ROOMS.find((item) => item.id === doctor.roomId);
    for (const weekday of doctor.schedules) {
      const scheduleId = `hor_${doctor.id}_${daySlug(weekday.toLowerCase())}`;
      schedules.push({
        id: scheduleId,
        id_horario: scheduleId,
        documento_de_identidad: doctor.id,
        dia_semana: weekday,
        medicoNombre: doctor.nombre,
        fechaCreacion: `${anchorDate}T12:00:00.000Z`,
        seed_metadata: seedMetadata(),
      });

      const date = nextWeekday(anchorDate, weekday);
      for (const horario_atencion of doctor.times) {
        const id = `disp_${doctor.id}_${date}_${horario_atencion.replace(/[^a-zA-Z0-9]/g, "")}`;
        availabilities.push({
          id,
          id_disponibilidad: id,
          id_horario: scheduleId,
          documento_de_identidad: doctor.id,
          id_sala: room.id,
          fecha: date,
          horario_atencion,
          estado: 1,
          medicoNombre: doctor.nombre,
          especialidad: doctor.especialidad.nombre,
          consultorioNumero: room.numero,
          fechaCreacion: `${anchorDate}T12:00:00.000Z`,
          seed_metadata: seedMetadata(),
        });
      }
    }
  }

  const appointments = [0, 4].map((availabilityIndex, index) => {
    const availability = availabilities[availabilityIndex];
    const patient = patients[index];
    const doctor = DOCTORS.find((item) => item.id === availability.documento_de_identidad);
    const room = ROOMS.find((item) => item.id === availability.id_sala);
    availability.estado = 0;
    const id = `cita_${availability.id}`;
    return {
      id,
      id_cita: id,
      id_paciente: patient.id,
      pacienteId: patient.id,
      id_disponibilidad: availability.id,
      disponibilidadId: availability.id,
      documento_de_identidad: doctor.id,
      medicoId: doctor.id,
      id_sala: room.id,
      consultorioId: room.id,
      fecha: availability.fecha,
      hora: availability.horario_atencion,
      horario_atencion: availability.horario_atencion,
      motivo: index === 0 ? "Consulta general de ejemplo" : "Control médico de ejemplo",
      estado: "programada",
      pacienteNombre: patient.nombre,
      medicoNombre: doctor.nombre,
      especialidad: doctor.especialidad.nombre,
      consultorioNumero: room.numero,
      fecha_creacion: `${anchorDate}T12:00:00.000Z`,
      createdAt: `${anchorDate}T12:00:00.000Z`,
      seed_metadata: seedMetadata(),
    };
  });

  return { patients, doctors, specialties, rooms, schedules, availabilities, appointments };
}

function storedRecords(data) {
  const fields = [
    ["pacientes", data.patients],
    ["medicos", data.doctors],
    ["especialidades", data.specialties],
    ["consultorios", data.rooms],
    ["horarios", data.schedules],
    ["disponibilidades", data.availabilities],
    ["citas", data.appointments],
  ];
  return fields.map(([collection, records]) => [collection, records.map((record) => {
    const document = { ...record };
    delete document.id;
    if (collection === "pacientes") delete document.id_paciente;
    if (collection === "horarios") delete document.id_horario;
    if (collection === "disponibilidades") delete document.id_disponibilidad;
    if (collection === "citas") delete document.id_cita;
    const id = record.id;
    return { id, data: document };
  })]);
}

function validateDataset(data) {
  const errors = [];
  const counts = [
    ["patients", 5], ["doctors", 3], ["specialties", 3], ["rooms", 2],
    ["schedules", 6], ["availabilities", 12], ["appointments", 2],
  ];
  for (const [key, expected] of counts) {
    if (data[key].length !== expected) errors.push(`${key}: se esperaban ${expected} y se generaron ${data[key].length}.`);
    if (new Set(data[key].map((item) => item.id)).size !== data[key].length) errors.push(`${key}: IDs duplicados.`);
  }
  const patients = new Set(data.patients.map((item) => item.id));
  const doctors = new Set(data.doctors.map((item) => item.id));
  const schedules = new Set(data.schedules.map((item) => item.id));
  const rooms = new Set(data.rooms.map((item) => item.id));
  const availabilityById = new Map(data.availabilities.map((item) => [item.id, item]));
  for (const schedule of data.schedules) if (!doctors.has(schedule.documento_de_identidad)) errors.push(`Horario sin médico: ${schedule.id}`);
  for (const slot of data.availabilities) {
    if (!doctors.has(slot.documento_de_identidad) || !rooms.has(slot.id_sala) || !schedules.has(slot.id_horario)) errors.push(`Disponibilidad con relación rota: ${slot.id}`);
    if (DAYS[dayIndex(slot.fecha)] !== data.schedules.find((item) => item.id === slot.id_horario)?.dia_semana) errors.push(`Fecha no coincide con el día del horario: ${slot.id}`);
  }
  for (const appointment of data.appointments) {
    const slot = availabilityById.get(appointment.id_disponibilidad);
    if (!patients.has(appointment.id_paciente) || !slot || slot.estado !== 0) errors.push(`Cita con relación o cupo ocupado inválido: ${appointment.id}`);
  }
  const pairs = data.availabilities.map((slot) => `${slot.documento_de_identidad}|${slot.fecha}|${slot.horario_atencion}|${slot.id_sala}`);
  if (new Set(pairs).size !== pairs.length) errors.push("Disponibilidades duplicadas.");
  if (data.availabilities.filter((slot) => slot.estado === 1).length !== 10) errors.push("Deben quedar exactamente 10 cupos libres.");
  if (errors.length) throw new Error(`Validación local fallida:\n- ${errors.join("\n- ")}`);
}

function parseInterval(label) {
  const match = /^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/.exec(String(label || "").trim());
  if (!match) return null;
  const [, sh, sm, eh, em] = match.map((part) => part);
  const start = Number(sh) * 60 + Number(sm);
  const end = Number(eh) * 60 + Number(em);
  if (Number(sh) > 23 || Number(eh) > 23 || Number(sm) > 59 || Number(em) > 59 || end <= start) return null;
  return { start, end };
}

function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function sameData(a, b) {
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

function compatibleSeedRecord(existing, expected, collection) {
  if (existing.seed_metadata?.revision !== REVISION) return false;
  const stableFields = {
    pacientes: ["documento_de_identidad", "nombre", "correo"],
    medicos: ["documento_de_identidad", "nombre"],
    horarios: ["documento_de_identidad", "dia_semana"],
    disponibilidades: ["documento_de_identidad", "fecha", "horario_atencion", "id_sala", "id_horario"],
    citas: ["id_paciente", "id_disponibilidad"],
  }[collection];
  if (!stableFields) return false;
  return stableFields.every((key) => existing[key] === expected[key]);
}

function compatibleCatalog(collection, existing, expected) {
  if (collection === "especialidades") {
    return typeof existing.nombre === "string" && normalizeCatalogName(existing.nombre) === normalizeCatalogName(expected.nombre);
  }
  return collection === "consultorios" && typeof existing.numero === "string" && existing.numero.trim() === expected.numero;
}

function normalizeCatalogName(value) {
  return String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}

function resolveCatalogReferences(data, remote) {
  const chooseCompatible = (collection, planned, matches) => {
    if (matches.length > 1) {
      throw new Error(`Preflight detenido: hay varios ${collection} compatibles con "${planned.nombre || planned.numero}"; no se elegirá uno arbitrariamente.`);
    }
    if (matches[0]) return matches[0].id;

    const occupiedIds = new Set(remote[collection].map((item) => item.id));
    if (!occupiedIds.has(planned.id)) return planned.id;
    let version = 2;
    while (occupiedIds.has(`${planned.id}-v${version}`)) version += 1;
    return `${planned.id}-v${version}`;
  };

  const specialtyIdsByName = new Map();
  for (const specialty of data.specialties) {
    const matches = remote.especialidades.filter((item) => compatibleCatalog("especialidades", item.data, specialty));
    specialty.id = chooseCompatible("especialidades", specialty, matches);
    specialtyIdsByName.set(normalizeCatalogName(specialty.nombre), specialty.id);
  }

  const roomIdsByNumber = new Map();
  for (const room of data.rooms) {
    const matches = remote.consultorios.filter((item) => compatibleCatalog("consultorios", item.data, room));
    room.id = chooseCompatible("consultorios", room, matches);
    roomIdsByNumber.set(room.numero, room.id);
  }

  for (const doctor of data.doctors) {
    doctor.especialidad.id = specialtyIdsByName.get(normalizeCatalogName(doctor.especialidad.nombre));
  }
  for (const slot of data.availabilities) {
    slot.id_sala = roomIdsByNumber.get(slot.consultorioNumero);
  }
  for (const appointment of data.appointments) {
    const slot = data.availabilities.find((item) => item.id === appointment.id_disponibilidad);
    if (slot) {
      appointment.id_sala = slot.id_sala;
      appointment.consultorioId = slot.id_sala;
    }
  }
}

function checkRemoteConflicts(data, remote) {
  const errors = [];
  const plan = storedRecords(data).map(([collection, records]) => {
    const existingById = new Map(remote[collection].map((item) => [item.id, item.data]));
    const pending = [];
    for (const record of records) {
      const current = existingById.get(record.id);
      if (!current) {
        pending.push(record);
      } else if (sameData(current, record.data) || compatibleSeedRecord(current, record.data, collection)) {
        // Conserva el documento actual; nunca se actualiza, aunque haya cambiado de estado.
      } else if (["especialidades", "consultorios"].includes(collection) && compatibleCatalog(collection, current, record.data)) {
        // Catálogos compartidos ya existentes: se reutilizan sin cambiar sus datos.
      } else if (collection === "horarios" && current.documento_de_identidad === record.data.documento_de_identidad && current.dia_semana === record.data.dia_semana) {
        // Horario equivalente preexistente, posiblemente creado desde la aplicación.
      } else {
        errors.push(`${collection}/${record.id} ya existe con otros datos; se conserva y se detiene la carga.`);
      }
    }
    return [collection, pending];
  });

  for (const patient of data.patients) {
    const duplicate = remote.pacientes.find((item) => item.id !== patient.id && String(item.data.documento_de_identidad || item.data.documento || "") === patient.documento_de_identidad);
    if (duplicate) errors.push(`Documento de paciente ficticio ya existe en ${duplicate.id}; no se crea un duplicado.`);
  }
  for (const doctor of data.doctors) {
    const duplicate = remote.medicos.find((item) => item.id !== doctor.id && String(item.data.documento_de_identidad || item.data.documento || item.id) === doctor.documento_de_identidad);
    if (duplicate) errors.push(`Documento de médico ficticio ya existe en ${duplicate.id}; no se crea un duplicado.`);
  }
  for (const schedule of data.schedules) {
    const duplicate = remote.horarios.find((item) => item.id !== schedule.id && item.data.documento_de_identidad === schedule.documento_de_identidad && item.data.dia_semana === schedule.dia_semana);
    if (duplicate) errors.push(`Ya existe el horario ${schedule.dia_semana} del médico ${schedule.documento_de_identidad} (${duplicate.id}).`);
  }

  const expectedAvailabilityById = new Map(
    storedRecords(data).find(([name]) => name === "disponibilidades")[1].map((record) => [record.id, record.data])
  );
  for (const slot of data.availabilities) {
    const sameId = remote.disponibilidades.find((item) => item.id === slot.id);
    if (sameId && compatibleSeedRecord(sameId.data, expectedAvailabilityById.get(slot.id), "disponibilidades")) continue;
    const interval = parseInterval(slot.horario_atencion);
    for (const item of remote.disponibilidades) {
      if (item.data.fecha !== slot.fecha) continue;
      const sameDoctor = item.data.documento_de_identidad === slot.documento_de_identidad;
      const sameRoom = item.data.id_sala === slot.id_sala;
      if (!sameDoctor && !sameRoom) continue;
      const existingInterval = parseInterval(item.data.horario_atencion);
      if (!existingInterval) {
        errors.push(`No se puede validar el intervalo de la disponibilidad existente ${item.id}; no se agregan cupos a esa fecha.`);
      } else if (overlaps(interval, existingInterval)) {
        errors.push(`Conflicto de horario con disponibilidad existente ${item.id} (${sameDoctor ? "mismo médico" : "mismo consultorio"}).`);
      }
    }
  }
  for (const appointment of data.appointments) {
    const duplicate = remote.citas.find((item) => item.id !== appointment.id && (item.data.id_disponibilidad || item.data.disponibilidadId) === appointment.id_disponibilidad);
    if (duplicate) errors.push(`La disponibilidad ${appointment.id_disponibilidad} ya tiene cita ${duplicate.id}.`);
  }

  if (errors.length) throw new Error(`Preflight detenido: no se escribirá nada.\n- ${[...new Set(errors)].join("\n- ")}`);
  return plan;
}

function firestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (typeof value === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, firestoreValue(item)])) } };
  throw new Error(`Tipo de dato incompatible: ${typeof value}`);
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

function parseDocument(document) {
  return Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, parseFirestoreValue(value)]));
}

function getGcloudOutput(args) {
  const { delimiter, join } = path;
  const isWindows = process.platform === "win32";
  const candidates = isWindows
    ? [
        ...(process.env.PATH || "").split(delimiter).map((directory) => join(directory, "gcloud.cmd")),
        process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google", "Cloud SDK", "google-cloud-sdk", "bin", "gcloud.cmd"),
        join(process.env.USERPROFILE || os.homedir(), "AppData", "Local", "Google", "Cloud SDK", "google-cloud-sdk", "bin", "gcloud.cmd"),
        process.env.ProgramFiles && join(process.env.ProgramFiles, "Google", "Cloud SDK", "google-cloud-sdk", "bin", "gcloud.cmd"),
        process.env["ProgramFiles(x86)"] && join(process.env["ProgramFiles(x86)"], "Google", "Cloud SDK", "google-cloud-sdk", "bin", "gcloud.cmd"),
      ].filter(Boolean)
    : ["gcloud"];
  const command = isWindows
    ? candidates.find((candidate) => fs.existsSync(candidate)) ||
      candidates.find((candidate) => /Google[\\/]Cloud SDK[\\/]google-cloud-sdk[\\/]bin[\\/]gcloud\.cmd$/i.test(candidate)) ||
      "gcloud.cmd"
    : candidates[0];
  if (!command) throw new Error("No se encontró o no se tiene permiso para ejecutar Google Cloud CLI (gcloud). No se usará una clave privada ni se intentará otro método de autenticación.");
  let result;
  if (isWindows && command.toLowerCase().endsWith(".cmd")) {
    // .cmd no es ejecutable directamente por CreateProcess. Lanzamos PowerShell
    // sin shell:true y pasamos el código por EncodedCommand; ruta y argumentos
    // se codifican como literales PowerShell escapados, incluidos espacios.
    const quotePowerShell = (value) => `'${String(value).replace(/'/g, "''")}'`;
    const psCommand = `$ErrorActionPreference = 'Stop'; try { & ${quotePowerShell(command)} ${args.map(quotePowerShell).join(" ")}; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } } catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }`;
    const encodedCommand = Buffer.from(psCommand, "utf16le").toString("base64");
    result = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", encodedCommand], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 30000,
      shell: false,
    });
  } else {
    result = spawnSync(command, args, { encoding: "utf8", windowsHide: true, timeout: 30000, shell: false });
  }
  if (result.error || result.status !== 0) {
    const detail = (result.stderr || result.stdout || result.error?.message || "sin detalle").trim();
    throw new Error(`Falló gcloud: ${detail}`);
  }
  return result.stdout.trim();
}

function ensureGcloudAuthenticated() {
  const account = getGcloudOutput(["auth", "list", "--filter=status:ACTIVE", "--format=value(account)", "--quiet"]);
  if (!account) throw new Error("gcloud no tiene una sesión activa. Inicia sesión localmente y vuelve a ejecutar la simulación.");
  return getGcloudOutput(["auth", "print-access-token", "--quiet"]);
}

async function firestoreRequest(projectId, token, resource, options = {}) {
  const documentRoot = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
  const url = resource.startsWith(":") ? `${documentRoot}${resource}` : `${documentRoot}/${resource}`;
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Firestore respondió HTTP ${response.status}: ${body.error?.message || "sin detalle"}`);
  return body;
}

async function listCollection(projectId, token, collectionName) {
  const documents = [];
  let pageToken;
  do {
    const params = new URLSearchParams({ pageSize: "1000" });
    if (pageToken) params.set("pageToken", pageToken);
    const page = await firestoreRequest(projectId, token, `${collectionName}?${params}`);
    for (const document of page.documents || []) {
      documents.push({ id: document.name.slice(document.name.lastIndexOf("/") + 1), data: parseDocument(document) });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return documents;
}

function printPlan(data, plan, anchorDate, remoteChecked = true) {
  const pendingCounts = Object.fromEntries(plan.map(([name, records]) => [name, records.length]));
  const plannedCounts = Object.fromEntries(storedRecords(data).map(([name, records]) => [name, records.length]));
  console.log(`Proyecto verificado: ${PROJECT_ID}`);
  console.log(`Fecha de referencia: ${anchorDate} (fechas calculadas en zona local de Colombia).`);
  console.log("Solo datos ficticios; no se muestran ni usan documentos personales reales.");
  console.log(remoteChecked
    ? "\nPlan previsto / documentos nuevos tras revisar Firestore:"
    : "\nPlan local previsto (la existencia en Firestore aún no está comprobada):");
  for (const [name, expected] of Object.entries(plannedCounts)) {
    if (remoteChecked) {
      console.log(`  ${name}: ${expected} previstos; ${pendingCounts[name]} nuevos; ${expected - pendingCounts[name]} existentes conservados.`);
    } else {
      console.log(`  ${name}: ${expected} previstos; cantidad nueva pendiente de preflight remoto.`);
    }
  }
  console.log("\nEspecialidades previstas:");
  for (const specialty of data.specialties) console.log(`  ${specialty.id} | ${specialty.nombre}`);
  console.log("\nConsultorios previstos:");
  for (const room of data.rooms) console.log(`  ${room.id} | ${room.numero} | ${room.piso}`);
  console.log("\nPacientes de ejemplo:");
  for (const patient of data.patients) console.log(`  ${patient.id} | ${patient.nombre} | ${patient.documento_de_identidad}`);
  console.log("\nMédicos y especialidades:");
  for (const doctor of data.doctors) console.log(`  ${doctor.documento_de_identidad} | ${doctor.nombre} | ${doctor.especialidad.nombre}`);
  console.log("\nHorarios:");
  for (const schedule of data.schedules) console.log(`  ${schedule.id} | ${schedule.dia_semana} | ${schedule.medicoNombre}`);
  console.log("\nDisponibilidades:");
  for (const slot of data.availabilities) console.log(`  ${slot.id} | ${slot.fecha} ${slot.horario_atencion} | ${slot.medicoNombre} | Consultorio ${slot.consultorioNumero} | ${slot.estado === 0 ? "ocupado por cita de ejemplo" : "libre"}`);
  console.log("\nCitas de ejemplo:");
  for (const appointment of data.appointments) console.log(`  ${appointment.id} | ${appointment.pacienteNombre} | ${appointment.medicoNombre} | ${appointment.fecha} ${appointment.hora}`);
  console.log("\nValidación local: 5 pacientes, 3 médicos, 3 especialidades, 2 consultorios, 6 horarios, 12 disponibilidades, 2 citas; 10 cupos quedan libres.");
}

function parseArguments(args) {
  const result = { mode: null, projectId: null, anchorDate: bogotaToday() };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--plan-only" || arg === "--dry-run" || arg === "--write") {
      if (result.mode) throw new Error("Usa solo uno de --plan-only, --dry-run o --write.");
      result.mode = arg;
    } else if (arg === "--project-id" && args[index + 1]) {
      result.projectId = args[++index];
    } else if (arg === "--anchor-date" && args[index + 1]) {
      result.anchorDate = args[++index];
    } else {
      throw new Error(`Argumento desconocido o incompleto: ${arg}`);
    }
  }
  if (!result.mode) throw new Error("Indica --dry-run o --write.");
  result.projectId ||= PROJECT_ID;
  if (result.projectId !== PROJECT_ID) throw new Error(`Este script solo admite el proyecto autorizado ${PROJECT_ID}.`);
  assertDate(result.anchorDate);
  if (result.mode === "--write" && !args.includes("--anchor-date")) {
    throw new Error("La escritura requiere --anchor-date explícita para que una repetición sea idempotente.");
  }
  return result;
}

async function writeNewDocuments(projectId, token, plan) {
  const base = `projects/${projectId}/databases/(default)/documents`;
  const writes = [];
  for (const [collection, records] of plan) {
    for (const record of records) {
      writes.push({
        update: {
          name: `${base}/${collection}/${record.id}`,
          fields: Object.fromEntries(Object.entries(record.data).map(([key, value]) => [key, firestoreValue(value)])),
        },
        currentDocument: { exists: false },
      });
    }
  }
  if (!writes.length) {
    console.log("No hay documentos nuevos; la información existente se conserva.");
    return;
  }
  await firestoreRequest(projectId, token, ":commit", { method: "POST", body: JSON.stringify({ writes }) });
  console.log(`Carga completa: ${writes.length} documentos creados; no se actualizaron ni eliminaron documentos existentes.`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const firebaseRc = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".firebaserc"), "utf8"));
  if (firebaseRc.projects?.default !== PROJECT_ID) {
    throw new Error(`El proyecto de .firebaserc no es ${PROJECT_ID}; se cancela sin escribir.`);
  }

  const data = makeDataset(options.anchorDate);
  validateDataset(data);
  if (options.mode === "--plan-only") {
    const plan = storedRecords(data);
    printPlan(data, plan, options.anchorDate, false);
    console.log("\nPlan local únicamente: Firestore no se consultó y no se escribió ningún documento.");
    return;
  }
  const token = ensureGcloudAuthenticated();
  const remotePairs = await Promise.all(COLLECTIONS.map(async (name) => [name, await listCollection(PROJECT_ID, token, name)]));
  const remote = Object.fromEntries(remotePairs);
  resolveCatalogReferences(data, remote);
  validateDataset(data);
  const plan = checkRemoteConflicts(data, remote);
  console.log("Preflight de solo lectura correcto: se consultó el proyecto Firestore indicado y no se detectaron duplicados ni conflictos.");
  printPlan(data, plan, options.anchorDate);

  if (options.mode === "--dry-run") {
    console.log("\nModo simulación: no se escribió ningún documento en Firestore.");
    return;
  }

  const pending = plan.reduce((count, [, records]) => count + records.length, 0);
  if (pending === 0) {
    console.log("\nNo hay nada que escribir.");
    return;
  }
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(`\nPara autorizar la escritura, escribe exactamente CARGAR ${PROJECT_ID}: `);
    if (answer !== `CARGAR ${PROJECT_ID}`) throw new Error("Confirmación incorrecta; no se escribió nada.");
  } finally {
    rl.close();
  }
  const freshToken = getGcloudOutput(["auth", "print-access-token", "--quiet"]);
  // Repetir lectura justo antes de la escritura para detectar cambios desde el preflight.
  const freshPairs = await Promise.all(COLLECTIONS.map(async (name) => [name, await listCollection(PROJECT_ID, freshToken, name)]));
  const freshRemote = Object.fromEntries(freshPairs);
  resolveCatalogReferences(data, freshRemote);
  validateDataset(data);
  const freshPlan = checkRemoteConflicts(data, freshRemote);
  await writeNewDocuments(PROJECT_ID, freshToken, freshPlan);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});

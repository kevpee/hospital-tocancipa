"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LayoutWrapper from "@/components/LayoutWrapper";
import Modal from "@/components/Modal";
import {
  CalendarDays,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  MapPin,
  User,
  X,
  Check,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CalendarCheck2,
  CircleCheck,
} from "lucide-react";

function fechaHoyColombia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

function horaAhoraColombia() {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
}

function fechaLegible(fecha, options = { weekday: "long", day: "numeric", month: "long", year: "numeric" }) {
  if (!fecha) return "";
  return new Intl.DateTimeFormat("es-CO", { ...options, timeZone: "UTC" }).format(new Date(`${fecha}T12:00:00Z`));
}

function normalizarTexto(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function nombreEspecialidad(medico) {
  return typeof medico?.especialidad === "object" && medico.especialidad !== null
    ? medico.especialidad.nombre || "General"
    : String(medico?.especialidad || "General");
}

function idMedico(medico) {
  return String(medico?.documento_de_identidad || medico?.documento || medico?.id || "");
}

function idDisponibilidad(disponibilidad) {
  return String(disponibilidad?.id || disponibilidad?.id_disponibilidad || "");
}

export default function CitasPage() {
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [medicos, setMedicos] = useState([]);

  // Snapshot de horarios reales consultados mediante la API del servidor.
  const [disponibilidades, setDisponibilidades] = useState([]);
  const [cargandoDisponibilidades, setCargandoDisponibilidades] = useState(true);
  const [errorDisponibilidades, setErrorDisponibilidades] = useState("");
  const [errorCatalogos, setErrorCatalogos] = useState("");
  const [paginaFechas, setPaginaFechas] = useState(0);

  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [actualizandoId, setActualizandoId] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  // Filtros de la tabla
  const [filtroMedico, setFiltroMedico] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  // Notificaciones
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeError, setMensajeError] = useState("");

  // Estado del formulario de agendamiento guiado (Pasos 1 al 8)
  const [formCita, setFormCita] = useState({
    pacienteId: "",
    especialidadId: "",
    medicoId: "",
    fecha: "",
    id_disponibilidad: "",
    motivo: "",
  });
  const disponibilidadEnCurso = useRef(false);

  const cargarCatalogos = useCallback(async () => {
    try {
      const [resPac, resEsp, resMed] = await Promise.all([
        fetch("/api/pacientes"),
        fetch("/api/especialidades"),
        fetch("/api/medicos"),
      ]);

      const [jsonPac, jsonEsp, jsonMed] = await Promise.all([
        resPac.json(),
        resEsp.json(),
        resMed.json(),
      ]);

      if (!resPac.ok || !jsonPac.success || !resEsp.ok || !jsonEsp.success || !resMed.ok || !jsonMed.success) {
        throw new Error("No fue posible cargar los pacientes, especialidades o médicos.");
      }

      if (jsonPac.success && Array.isArray(jsonPac.data)) setPacientes(jsonPac.data);
      if (jsonEsp.success && Array.isArray(jsonEsp.data)) setEspecialidades(jsonEsp.data);
      if (jsonMed.success && Array.isArray(jsonMed.data)) setMedicos(jsonMed.data);
      setErrorCatalogos("");
    } catch (err) {
      setErrorCatalogos(err.message || "Error al cargar los datos necesarios para agendar.");
    }
  }, []);

  const cargarCitas = useCallback(async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (filtroMedico) params.append("medicoId", filtroMedico);
      if (filtroFecha) params.append("fecha", filtroFecha);
      if (filtroEstado) params.append("estado", filtroEstado);

      const url = `/api/citas${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setCitas(json.data);
      }
    } catch {
      setMensajeError("Error de conexión al cargar la agenda de citas.");
    } finally {
      setCargando(false);
    }
  }, [filtroMedico, filtroFecha, filtroEstado]);

  // Estas consultas externas llenan el estado al resolverse; la regla las interpreta como síncronas.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { cargarCatalogos(); }, [cargarCatalogos]);

  // Al cambiar filtros se inicia una lectura y el indicador acompaña la petición.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { cargarCitas(); }, [cargarCitas]);

  const cargarDisponibilidades = useCallback(async ({ silencioso = false } = {}) => {
    if (disponibilidadEnCurso.current) return null;
    disponibilidadEnCurso.current = true;
    if (!silencioso) setCargandoDisponibilidades(true);
    try {
      const response = await fetch("/api/disponibilidades", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result?.success || !Array.isArray(result.data)) {
        throw new Error(result?.message || "No fue posible consultar la disponibilidad actual.");
      }
      setDisponibilidades(result.data);
      setErrorDisponibilidades("");
      return result.data;
    } catch (error) {
      setErrorDisponibilidades(error.message || "No fue posible consultar los cupos.");
      return null;
    } finally {
      setCargandoDisponibilidades(false);
      disponibilidadEnCurso.current = false;
    }
  }, []);

  // La carga inicial sincroniza el componente con la API; las actualizaciones son asíncronas.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { cargarDisponibilidades(); }, [cargarDisponibilidades]);

  // Mientras se diligencia el formulario, refrescar para reflejar reservas hechas en otra sesión.
  useEffect(() => {
    if (!modalAbierto) return undefined;
    const timer = window.setInterval(() => cargarDisponibilidades({ silencioso: true }), 30000);
    const onFocus = () => cargarDisponibilidades({ silencioso: true });
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [modalAbierto, cargarDisponibilidades]);

  const hoyStr = fechaHoyColombia();
  const ahoraColombia = horaAhoraColombia();
  const medicosFiltradosPorEspecialidad = useMemo(() => medicos.filter((medico) => {
    if (!formCita.especialidadId) return true;
    const especialidad = especialidades.find((item) => String(item.id) === String(formCita.especialidadId));
    return !especialidad || normalizarTexto(nombreEspecialidad(medico)) === normalizarTexto(especialidad.nombre);
  }), [medicos, especialidades, formCita.especialidadId]);

  const opcionesDisponibilidad = useMemo(() => disponibilidades
    .filter((item) => {
      if (!item.fecha || String(item.fecha) < hoyStr) return false;
      if (Number(item.estado) !== 0 && Number(item.estado) !== 1) return false;
      if (String(item.fecha) === hoyStr) {
        const horaInicio = String(item.horario_atencion || "").match(/\b(\d{1,2}:\d{2})\b/)?.[1];
        if (horaInicio && horaInicio.padStart(5, "0") < ahoraColombia) return false;
      }
      const medico = medicos.find((entry) => idMedico(entry) === String(item.documento_de_identidad || ""));
      const especialidad = medico ? nombreEspecialidad(medico) : item.especialidad;
      if (formCita.medicoId && String(item.documento_de_identidad) !== String(formCita.medicoId)) return false;
      if (formCita.especialidadId) {
        const selected = especialidades.find((entry) => String(entry.id) === String(formCita.especialidadId));
        if (selected && normalizarTexto(especialidad) !== normalizarTexto(selected.nombre)) return false;
      }
      return true;
    })
    .sort((a, b) => `${a.fecha} ${a.horario_atencion || ""}`.localeCompare(`${b.fecha} ${b.horario_atencion || ""}`)),
  [disponibilidades, hoyStr, ahoraColombia, medicos, formCita.medicoId, formCita.especialidadId, especialidades]);

  const gruposPorFecha = useMemo(() => {
    const groups = new Map();
    opcionesDisponibilidad.forEach((item) => {
      if (!groups.has(item.fecha)) groups.set(item.fecha, { fecha: item.fecha, items: [], libres: 0, ocupados: 0 });
      const group = groups.get(item.fecha);
      group.items.push(item);
      if (Number(item.estado) === 1) group.libres += 1;
      else group.ocupados += 1;
    });
    return Array.from(groups.values());
  }, [opcionesDisponibilidad]);

  const gruposPagina = gruposPorFecha.slice(paginaFechas * 7, paginaFechas * 7 + 7);
  const grupoElegido = gruposPorFecha.find((group) => group.fecha === formCita.fecha)
    || gruposPagina.find((group) => group.libres > 0)
    || gruposPagina[0]
    || null;
  const fechaElegida = grupoElegido?.fecha || "";
  const horariosFecha = grupoElegido?.items || [];
  const cupoElegido = horariosFecha.find((item) => idDisponibilidad(item) === formCita.id_disponibilidad && Number(item.estado) === 1);
  const fechasVisibles = gruposPagina;
  const proximosCupos = disponibilidades
    .filter((item) => {
      if (String(item.fecha || "") < hoyStr || Number(item.estado) !== 1) return false;
      if (String(item.fecha) === hoyStr) {
        const start = String(item.horario_atencion || "").match(/\b(\d{1,2}:\d{2})\b/)?.[1];
        if (start && start.padStart(5, "0") < ahoraColombia) return false;
      }
      return true;
    })
    .sort((a, b) => `${a.fecha} ${a.horario_atencion || ""}`.localeCompare(`${b.fecha} ${b.horario_atencion || ""}`))
    .slice(0, 4);

  const abrirAgendamiento = (slot = null) => {
    setMensajeError("");
    setMensajeExito("");
    setPaginaFechas(0);
    if (slot) {
      const profesional = medicos.find((item) => idMedico(item) === String(slot.documento_de_identidad || ""));
      const specialty = especialidades.find((item) => normalizarTexto(item.nombre) === normalizarTexto(nombreEspecialidad(profesional)));
      setFormCita((previous) => ({
        ...previous,
        medicoId: String(slot.documento_de_identidad || ""),
        especialidadId: specialty?.id || "",
        fecha: slot.fecha,
        id_disponibilidad: idDisponibilidad(slot),
      }));
    } else {
      setFormCita((previous) => ({ ...previous, especialidadId: "", medicoId: "", fecha: "", id_disponibilidad: "" }));
    }
    setModalAbierto(true);
    cargarDisponibilidades({ silencioso: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensajeError("");
    setMensajeExito("");

    if (!formCita.pacienteId) {
      setMensajeError("Paso 1: Debe seleccionar un paciente.");
      return;
    }

    if (!fechaElegida) {
      setMensajeError("Selecciona una fecha que tenga cupos disponibles.");
      return;
    }

    if (!cupoElegido) {
      setMensajeError("Selecciona un horario libre. El cupo pudo cambiar mientras diligenciabas la cita.");
      return;
    }

    if (!formCita.motivo.trim() || formCita.motivo.trim().length < 4) {
      setMensajeError("Paso 7: El motivo de la consulta debe tener al menos 4 caracteres.");
      return;
    }

    try {
      setEnviando(true);
      const preflightParams = new URLSearchParams({
        documento_de_identidad: String(cupoElegido.documento_de_identidad),
        fecha: fechaElegida,
        soloDisponibles: "true",
      });
      const preflightResponse = await fetch(`/api/disponibilidades?${preflightParams}`, { cache: "no-store" });
      const preflight = await preflightResponse.json();
      if (!preflightResponse.ok || !preflight.success || !Array.isArray(preflight.data)) {
        throw new Error(preflight.message || "No fue posible comprobar el cupo. No se reservó la cita.");
      }
      const slotStillFree = preflight.data.some((item) => idDisponibilidad(item) === idDisponibilidad(cupoElegido) && Number(item.estado) === 1);
      if (!slotStillFree) {
        throw new Error("Este horario acaba de ocuparse. La agenda se actualizó; elige otro cupo disponible.");
      }

      const res = await fetch("/api/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_paciente: formCita.pacienteId,
          id_disponibilidad: formCita.id_disponibilidad,
          motivo: formCita.motivo,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(
          json.message ||
            "Error al reservar la cita. Verifique que el espacio continúe disponible."
        );
      }

      const medicoConfirmado = medicos.find((item) => idMedico(item) === String(cupoElegido.documento_de_identidad));
      const nombreMedico = medicoConfirmado?.nombre || cupoElegido.medicoNombre || "Médico";
      const horaConfirmada = cupoElegido.horario_atencion || "";
      setMensajeExito(`Cita confirmada con ${nombreMedico} para el ${fechaLegible(fechaElegida)} a las ${horaConfirmada}.`);
      setFormCita({
        pacienteId: "",
        especialidadId: "",
        medicoId: "",
        fecha: "",
        id_disponibilidad: "",
        motivo: "",
      });
      setModalAbierto(false);
      await cargarCitas();
      await cargarDisponibilidades({ silencioso: true });
    } catch (err) {
      await cargarDisponibilidades({ silencioso: true });
      setMensajeError(err.message || "Error al procesar el agendamiento.");
    } finally {
      setEnviando(false);
    }
  };

  const handleCambiarEstado = async (id, nuevoEstado) => {
    try {
      setActualizandoId(id);
      setMensajeError("");
      setMensajeExito("");

      const res = await fetch(`/api/citas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudo actualizar el estado de la cita.");
      }

      setMensajeExito(
        nuevoEstado === "cancelada"
          ? "Cita cancelada con éxito. El espacio de disponibilidad fue liberado automáticamente."
          : json.message
      );
      await cargarCitas();
      await cargarDisponibilidades({ silencioso: true });
    } catch (err) {
      setMensajeError(err.message || "Error al actualizar estado.");
    } finally {
      setActualizandoId(null);
    }
  };

  const limpiarFiltros = () => {
    setFiltroMedico("");
    setFiltroFecha("");
    setFiltroEstado("");
  };

  const cambiarPaginaFechas = (incremento) => {
    const maxPagina = Math.max(0, Math.ceil(gruposPorFecha.length / 7) - 1);
    const nuevaPagina = Math.min(maxPagina, Math.max(0, paginaFechas + incremento));
    const grupo = gruposPorFecha.slice(nuevaPagina * 7, nuevaPagina * 7 + 7).find((item) => item.libres > 0)
      || gruposPorFecha[nuevaPagina * 7];
    setPaginaFechas(nuevaPagina);
    if (grupo) setFormCita((previous) => ({ ...previous, fecha: grupo.fecha, id_disponibilidad: "" }));
  };

  return (
    <LayoutWrapper
      title="Gestión de Citas Médicas"
      subtitle="Agendamiento guiado por disponibilidad libre, confirmación atómica y control de citas"
    >
      <div className="space-y-6">
        {/* Notificaciones */}
        {mensajeExito && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-xs">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold">{mensajeExito}</p>
          </div>
        )}

        {mensajeError && !modalAbierto && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-xs">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <p className="text-sm font-semibold">{mensajeError}</p>
          </div>
        )}

        {/* Barra de Acciones y Filtros */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">
              Agenda General de Citas Médicas
            </h3>
            <p className="text-xs text-slate-500">
              {citas.length} citas registradas en el sistema
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={cargarCitas}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
              title="Recargar agenda"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => abrirAgendamiento()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              Agendar Cita Médica
            </button>
          </div>
        </div>

        <section className="appointment-discovery" aria-labelledby="availability-heading">
          <div className="appointment-discovery-heading">
            <div>
              <p className="appointment-kicker"><CalendarCheck2 size={14} /> DISPONIBILIDAD EN TIEMPO REAL</p>
              <h3 id="availability-heading">Próximos cupos libres</h3>
              <p>Horarios consultados desde la agenda actual. Selecciona uno para iniciar la reserva.</p>
            </div>
            <button type="button" className="availability-refresh" onClick={() => cargarDisponibilidades()} disabled={cargandoDisponibilidades} aria-label="Actualizar disponibilidad">
              <RefreshCw size={15} className={cargandoDisponibilidades ? "animate-spin" : ""} />
              <span>Actualizar</span>
            </button>
          </div>
          {errorDisponibilidades ? (
            <div className="availability-state availability-error" role="alert"><AlertCircle size={18} /><span>{errorDisponibilidades}</span><button type="button" onClick={() => cargarDisponibilidades()}>Reintentar</button></div>
          ) : cargandoDisponibilidades ? (
            <div className="availability-state"><RefreshCw size={17} className="animate-spin" /> Consultando cupos disponibles…</div>
          ) : proximosCupos.length === 0 ? (
            <div className="availability-state availability-empty"><CalendarDays size={20} /><div><strong>No hay próximos cupos disponibles</strong><span>Prueba otro momento o consulta nuevamente cuando se publiquen nuevos horarios.</span></div></div>
          ) : (
            <div className="next-slots-grid">
              {proximosCupos.map((slot) => {
                const professional = medicos.find((item) => idMedico(item) === String(slot.documento_de_identidad || ""));
                return (
                  <button type="button" className="next-slot-card" key={idDisponibilidad(slot)} onClick={() => abrirAgendamiento(slot)}>
                    <span className="next-slot-date"><CalendarDays size={14} />{fechaLegible(slot.fecha, { weekday: "short", day: "numeric", month: "short" })}</span>
                    <strong>{slot.medicoNombre || professional?.nombre || "Profesional disponible"}</strong>
                    <span>{slot.especialidad || nombreEspecialidad(professional)}</span>
                    <span className="next-slot-meta"><span><Clock size={13} />{slot.horario_atencion}</span><span><MapPin size={13} />Consultorio {slot.consultorioNumero || slot.id_sala || "—"}</span></span>
                    <span className="next-slot-action">Elegir horario <ChevronRight size={14} /></span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* PANEL DE FILTROS */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
              <Filter className="h-4 w-4 text-blue-600" />
              <span>Filtros de Búsqueda</span>
            </div>
            {(filtroMedico || filtroFecha || filtroEstado) && (
              <button
                onClick={limpiarFiltros}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Limpiar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Filtrar por Médico
              </label>
              <select
                value={filtroMedico}
                onChange={(e) => setFiltroMedico(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden"
              >
                <option value="">Todos los médicos</option>
                {medicos.map((m) => (
                  <option key={m.id} value={m.documento_de_identidad || m.documento}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Filtrar por Fecha
              </label>
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Filtrar por Estado
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden"
              >
                <option value="">Todos los estados</option>
                <option value="programada">Programadas</option>
                <option value="atendida">Atendidas</option>
                <option value="cancelada">Canceladas</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABLA PRINCIPAL DE CITAS */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Fecha y Horario</th>
                  <th className="px-5 py-3.5">Paciente</th>
                  <th className="px-5 py-3.5">Médico / Especialidad</th>
                  <th className="px-5 py-3.5">Consultorio</th>
                  <th className="px-5 py-3.5">Motivo</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cargando ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                      Consultando agenda médica...
                    </td>
                  </tr>
                ) : citas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
                        <CalendarDays className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">
                        No se encontraron citas con los filtros seleccionados
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Ajusta los filtros o haz clic en &apos;Agendar Cita Médica&apos;.
                      </p>
                    </td>
                  </tr>
                ) : (
                  citas.map((cita) => {
                    const esActualizando = actualizandoId === cita.id;

                    return (
                      <tr
                        key={cita.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 font-bold text-slate-900">
                            <Clock className="h-4 w-4 text-blue-600" />
                            {cita.hora || cita.horario_atencion}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {cita.fecha}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {cita.pacienteNombre}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-800">
                            Dr(a). {cita.medicoNombre}
                          </div>
                          <div className="text-xs text-blue-600 font-bold">
                            {cita.especialidad}
                          </div>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                            <MapPin className="h-3.5 w-3.5 text-slate-500" />
                            Consultorio {cita.consultorioNumero}
                          </span>
                        </td>

                        <td className="px-5 py-4 max-w-xs">
                          <p className="text-xs text-slate-600 line-clamp-2" title={cita.motivo}>
                            {cita.motivo}
                          </p>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                              cita.estado === "atendida"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : cita.estado === "cancelada"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {cita.estado.charAt(0).toUpperCase() + cita.estado.slice(1)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={
                                esActualizando ||
                                cita.estado === "atendida" ||
                                cita.estado === "cancelada"
                              }
                              onClick={() => handleCambiarEstado(cita.id, "atendida")}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition"
                              title="Marcar como atendida"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Atendida</span>
                            </button>

                            <button
                              type="button"
                              disabled={
                                esActualizando ||
                                cita.estado === "cancelada" ||
                                cita.estado === "atendida"
                              }
                              onClick={() => handleCambiarEstado(cita.id, "cancelada")}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed border border-rose-200 transition"
                              title="Cancelar cita (libera el cupo)"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Cancelar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL GUIADO DE AGENDAMIENTO DE CITA (8 PASOS OBLIGATORIOS) */}
        <Modal
          isOpen={modalAbierto}
          onClose={() => setModalAbierto(false)}
          title="Agendar Nueva Cita Médica"
          subtitle="Elige un paciente y consulta los cupos reales disponibles"
          maxWidth="max-w-3xl"
        >
          {errorCatalogos && (
            <div className="booking-inline-error mb-3" role="alert">
              <AlertCircle size={16} /><span>{errorCatalogos}</span>
              <button type="button" onClick={cargarCatalogos}>Reintentar</button>
            </div>
          )}
          {mensajeError && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{mensajeError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="booking-form">
            <section className="booking-step">
              <div className="booking-step-heading"><span>1</span><div><strong>Paciente</strong><small>Selecciona a quién se le asignará la cita.</small></div></div>
              <label className="sr-only" htmlFor="booking-patient">Paciente</label>
              <select id="booking-patient" required value={formCita.pacienteId} onChange={(event) => setFormCita((previous) => ({ ...previous, pacienteId: event.target.value }))}>
                <option value="">Seleccionar paciente…</option>
                {pacientes.map((patient) => <option key={patient.id} value={patient.id_paciente || patient.id}>{patient.nombre} · {patient.documento_de_identidad || patient.documento}</option>)}
              </select>
            </section>

            <section className="booking-step">
              <div className="booking-step-heading"><span>2</span><div><strong>Profesional</strong><small>Filtra por especialidad, por médico o consulta todas las opciones.</small></div></div>
              <div className="booking-filter-grid">
                <label>Especialidad
                  <select value={formCita.especialidadId} onChange={(event) => { setPaginaFechas(0); setFormCita((previous) => ({ ...previous, especialidadId: event.target.value, medicoId: "", fecha: "", id_disponibilidad: "" })); }}>
                    <option value="">Todas las especialidades</option>
                    {especialidades.map((specialty) => <option key={specialty.id} value={specialty.id}>{specialty.nombre}</option>)}
                  </select>
                </label>
                <label>Médico
                  <select value={formCita.medicoId} onChange={(event) => { setPaginaFechas(0); setFormCita((previous) => ({ ...previous, medicoId: event.target.value, fecha: "", id_disponibilidad: "" })); }}>
                    <option value="">Todos los médicos</option>
                    {medicosFiltradosPorEspecialidad.map((doctor) => <option key={doctor.id} value={idMedico(doctor)}>{doctor.nombre}</option>)}
                  </select>
                </label>
              </div>
            </section>

            <section className="booking-step">
              <div className="booking-step-heading"><span>3</span><div><strong>Fecha de atención</strong><small>Las fechas anteriores a hoy se excluyen. Cada fecha indica sus cupos libres.</small></div></div>
              {cargandoDisponibilidades ? (
                <div className="booking-inline-state"><RefreshCw size={16} className="animate-spin" /> Actualizando disponibilidad real…</div>
              ) : errorDisponibilidades ? (
                <div className="booking-inline-error" role="alert"><AlertCircle size={16} />{errorDisponibilidades}<button type="button" onClick={() => cargarDisponibilidades()}>Reintentar</button></div>
              ) : gruposPorFecha.length === 0 ? (
                <div className="booking-inline-state booking-no-slots"><CalendarDays size={18} /><div><strong>No hay fechas con disponibilidad futura</strong><span>Prueba otra especialidad o médico, o vuelve a consultar más tarde.</span></div></div>
              ) : (
                <>
                  <div className="date-picker-toolbar">
                    <span>{gruposPorFecha.length} {gruposPorFecha.length === 1 ? "fecha encontrada" : "fechas encontradas"}</span>
                    <div>
                      <button type="button" aria-label="Fechas anteriores" disabled={paginaFechas === 0} onClick={() => cambiarPaginaFechas(-1)}><ChevronLeft size={16} /></button>
                      <button type="button" aria-label="Fechas siguientes" disabled={(paginaFechas + 1) * 7 >= gruposPorFecha.length} onClick={() => cambiarPaginaFechas(1)}><ChevronRight size={16} /></button>
                    </div>
                  </div>
                  <div className="date-picker-grid" role="group" aria-label="Fechas con horarios registrados">
                    {fechasVisibles.map((group) => (
                      <button type="button" key={group.fecha} aria-pressed={fechaElegida === group.fecha} className={`date-choice ${fechaElegida === group.fecha ? "is-selected" : ""} ${group.libres === 0 ? "is-full" : ""}`} onClick={() => setFormCita((previous) => ({ ...previous, fecha: group.fecha, id_disponibilidad: "" }))}>
                        <span>{fechaLegible(group.fecha, { weekday: "short" })}</span><strong>{fechaLegible(group.fecha, { day: "numeric" })}</strong><small>{group.libres > 0 ? `${group.libres} libre${group.libres === 1 ? "" : "s"}` : `${group.ocupados} ocupado${group.ocupados === 1 ? "" : "s"}`}</small>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="booking-step">
              <div className="booking-step-heading"><span>4</span><div><strong>Horario y consultorio</strong><small>Los horarios ocupados se muestran deshabilitados y no se pueden reservar.</small></div></div>
              {grupoElegido && horariosFecha.length > 0 ? (
                <div className="booking-slot-grid">
                  {horariosFecha.map((slot) => {
                    const available = Number(slot.estado) === 1;
                    const selected = formCita.id_disponibilidad === idDisponibilidad(slot) && available;
                    const doctor = medicos.find((item) => idMedico(item) === String(slot.documento_de_identidad || ""));
                    return (
                      <button type="button" key={idDisponibilidad(slot)} disabled={!available} aria-pressed={selected} className={`booking-slot ${selected ? "is-selected" : ""} ${available ? "is-free" : "is-occupied"}`} onClick={() => setFormCita((previous) => ({ ...previous, fecha: fechaElegida, id_disponibilidad: idDisponibilidad(slot) }))}>
                        <span className="booking-slot-status">{available ? <CircleCheck size={14} /> : <XCircle size={14} />}{available ? "Libre" : "Ocupado"}</span>
                        <strong><Clock size={15} />{slot.horario_atencion || "Hora pendiente"}</strong>
                        <span>{slot.medicoNombre || doctor?.nombre || "Médico"} · {slot.especialidad || nombreEspecialidad(doctor)}</span>
                        <span><MapPin size={13} />Consultorio {slot.consultorioNumero || slot.id_sala || "—"}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="booking-inline-state booking-no-slots"><CalendarDays size={18} /><div><strong>{gruposPorFecha.length ? "No hay fechas para este filtro" : "No hay horarios para mostrar"}</strong><span>{gruposPorFecha.length ? "Ajusta el filtro de especialidad o médico para encontrar cupos." : "Las próximas disponibilidades aparecerán aquí."}</span></div></div>
              )}
              {formCita.id_disponibilidad && !cupoElegido && <div className="booking-inline-error" role="status"><AlertCircle size={16} />El cupo seleccionado ya no está libre. La agenda se actualizará automáticamente; elige otro horario.</div>}
              {cupoElegido && <div className="booking-confirmation"><CheckCircle2 size={17} /><span>Seleccionado: <strong>{cupoElegido.medicoNombre || "Médico"}</strong> · {fechaLegible(fechaElegida)} · {cupoElegido.horario_atencion} · Consultorio {cupoElegido.consultorioNumero || cupoElegido.id_sala || "—"}</span></div>}
            </section>

            <section className="booking-step">
              <div className="booking-step-heading"><span>5</span><div><strong>Motivo de consulta</strong><small>Información breve para identificar el propósito de la cita.</small></div></div>
              <label className="sr-only" htmlFor="booking-reason">Motivo de consulta</label>
              <textarea id="booking-reason" required minLength={4} rows={2} value={formCita.motivo} onChange={(event) => setFormCita((previous) => ({ ...previous, motivo: event.target.value }))} placeholder="Ej. Control médico, consulta general…" />
            </section>

            <div className="booking-footer">
              <button type="button" className="booking-cancel" onClick={() => setModalAbierto(false)}>Cancelar</button>
              <button type="submit" className="booking-submit" disabled={enviando || cargandoDisponibilidades || !formCita.pacienteId || !cupoElegido || !formCita.motivo.trim() || formCita.motivo.trim().length < 4}>
                {enviando ? <><RefreshCw size={15} className="animate-spin" /> Confirmando reserva…</> : <><CheckCircle2 size={16} /> Confirmar cita</>}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </LayoutWrapper>
  );
}

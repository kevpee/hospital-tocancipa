"use client";

import { useEffect, useState } from "react";
import LayoutWrapper from "@/components/LayoutWrapper";
import Modal from "@/components/Modal";
import {
  CalendarClock,
  CalendarDays,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  MapPin,
  X,
  Calendar,
  Layers,
} from "lucide-react";

import { DIAS_SEMANA, FRANJAS_HORARIAS_EJEMPLO } from "@/lib/seedData";

function fechaVisible(value) {
  if (!value) return "Fecha sin asignar";
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("es-CO", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(parsed);
}

export default function DisponibilidadPage() {
  const [disponibilidades, setDisponibilidades] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [consultorios, setConsultorios] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [pestanaActiva, setPestanaActiva] = useState("disponibilidades"); // 'disponibilidades' | 'horarios'

  // Filtros
  const [filtroMedico, setFiltroMedico] = useState("");
  const [filtroEspecialidad, setFiltroEspecialidad] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroEstado, setFiltroEstado] = useState(""); // '' | '1' | '0'

  // Modales
  const [modalDispAbierto, setModalDispAbierto] = useState(false);
  const [modalHorarioAbierto, setModalHorarioAbierto] = useState(false);

  // Estados de formularios
  const [formDisp, setFormDisp] = useState({
    documento_de_identidad: "",
    id_sala: "",
    fecha: "",
    horario_atencion: "08:00 - 08:30",
  });

  const [formHorario, setFormHorario] = useState({
    documento_de_identidad: "",
    dia_semana: "Lunes",
  });

  const [enviando, setEnviando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeError, setMensajeError] = useState("");

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (filtroMedico) params.append("documento_de_identidad", filtroMedico);
      if (filtroFecha) params.append("fecha", filtroFecha);
      if (filtroEspecialidad) params.append("especialidad", filtroEspecialidad);
      if (filtroEstado !== "") params.append("estado", filtroEstado);

      const [resDisp, resHor] = await Promise.all([
        fetch(`/api/disponibilidades?${params.toString()}`),
        fetch(`/api/horarios${filtroMedico ? `?documento_de_identidad=${filtroMedico}` : ""}`),
      ]);

      const [jsonDisp, jsonHor] = await Promise.all([
        resDisp.json(),
        resHor.json(),
      ]);

      if (!resDisp.ok || !jsonDisp.success || !Array.isArray(jsonDisp.data)
        || !resHor.ok || !jsonHor.success || !Array.isArray(jsonHor.data)) {
        throw new Error("No fue posible consultar las disponibilidades y horarios.");
      }

      setDisponibilidades(jsonDisp.data);
      setHorarios(jsonHor.data);
      setMensajeError("");
    } catch (error) {
      setMensajeError(error.message || "Error de conexión al cargar las disponibilidades.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    let activo = true;
    Promise.all([fetch("/api/medicos"), fetch("/api/consultorios"), fetch("/api/especialidades")])
      .then(async ([medicosResponse, consultoriosResponse, especialidadesResponse]) => {
        const [medicosJson, consultoriosJson, especialidadesJson] = await Promise.all([
          medicosResponse.json(), consultoriosResponse.json(), especialidadesResponse.json(),
        ]);
        if (!medicosResponse.ok || !medicosJson.success || !Array.isArray(medicosJson.data)
          || !consultoriosResponse.ok || !consultoriosJson.success || !Array.isArray(consultoriosJson.data)
          || !especialidadesResponse.ok || !especialidadesJson.success || !Array.isArray(especialidadesJson.data)) {
          throw new Error("No fue posible consultar los catálogos de médicos, consultorios y especialidades.");
        }
        return [medicosJson.data, consultoriosJson.data, especialidadesJson.data];
      })
      .then(([medicosData, consultoriosData, especialidadesData]) => {
        if (!activo) return;
        setMedicos(medicosData);
        setConsultorios(consultoriosData);
        setEspecialidades(especialidadesData);
      })
      .catch((error) => { if (activo) setMensajeError(error.message || "Error al cargar los catálogos."); });

    return () => { activo = false; };
  }, []);

  useEffect(() => {
    let activo = true;
    const params = new URLSearchParams();
    if (filtroMedico) params.append("documento_de_identidad", filtroMedico);
    if (filtroFecha) params.append("fecha", filtroFecha);
    if (filtroEspecialidad) params.append("especialidad", filtroEspecialidad);
    if (filtroEstado !== "") params.append("estado", filtroEstado);

    Promise.all([
      fetch(`/api/disponibilidades?${params.toString()}`),
      fetch(`/api/horarios${filtroMedico ? `?documento_de_identidad=${encodeURIComponent(filtroMedico)}` : ""}`),
    ])
      .then(async ([disponibilidadesResponse, horariosResponse]) => {
        const [disponibilidadesJson, horariosJson] = await Promise.all([
          disponibilidadesResponse.json(), horariosResponse.json(),
        ]);
        if (!disponibilidadesResponse.ok || !disponibilidadesJson.success || !Array.isArray(disponibilidadesJson.data)
          || !horariosResponse.ok || !horariosJson.success || !Array.isArray(horariosJson.data)) {
          throw new Error("No fue posible actualizar los horarios y las disponibilidades.");
        }
        return [disponibilidadesJson.data, horariosJson.data];
      })
      .then(([disponibilidadesData, horariosData]) => {
        if (!activo) return;
        setDisponibilidades(disponibilidadesData);
        setHorarios(horariosData);
        setMensajeError("");
      })
      .catch((error) => { if (activo) setMensajeError(error.message || "Error de conexión al cargar las disponibilidades."); })
      .finally(() => { if (activo) setCargando(false); });

    return () => { activo = false; };
  }, [filtroMedico, filtroFecha, filtroEspecialidad, filtroEstado]);

  // Manejar creación de Disponibilidad
  const handleCrearDisponibilidad = async (e) => {
    e.preventDefault();
    setMensajeError("");
    setMensajeExito("");

    if (!formDisp.documento_de_identidad || !formDisp.id_sala || !formDisp.fecha || !formDisp.horario_atencion) {
      setMensajeError("Todos los campos son obligatorios para generar el cupo de atención.");
      return;
    }

    try {
      setEnviando(true);
      const res = await fetch("/api/disponibilidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formDisp),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Error al registrar la disponibilidad.");
      }

      setMensajeExito("Espacio de disponibilidad generado correctamente.");
      setModalDispAbierto(false);
      await cargarDatos();
    } catch (err) {
      setMensajeError(err.message || "Error al procesar la solicitud.");
    } finally {
      setEnviando(false);
    }
  };

  // Manejar creación de Horario
  const handleCrearHorario = async (e) => {
    e.preventDefault();
    setMensajeError("");
    setMensajeExito("");

    if (!formHorario.documento_de_identidad || !formHorario.dia_semana) {
      setMensajeError("Selecciona el médico y el día de la semana.");
      return;
    }

    try {
      setEnviando(true);
      const res = await fetch("/api/horarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formHorario),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Error al registrar el horario.");
      }

      setMensajeExito("Día de atención habitual asignado al médico con éxito.");
      setModalHorarioAbierto(false);
      await cargarDatos();
    } catch (err) {
      setMensajeError(err.message || "Error al asignar horario.");
    } finally {
      setEnviando(false);
    }
  };

  const limpiarFiltros = () => {
    setCargando(true);
    setFiltroMedico("");
    setFiltroEspecialidad("");
    setFiltroFecha("");
    setFiltroEstado("");
  };

  const cuposLibres = disponibilidades.filter((item) => Number(item.estado) === 1).length;
  const cuposOcupados = disponibilidades.filter((item) => Number(item.estado) === 0).length;

  return (
    <LayoutWrapper
      title="Horarios y Disponibilidad Médica"
      subtitle="Programación de cupos de atención, consultorios y calendario semanal"
    >
      <div className="space-y-6 availability-page">
        {/* Notificaciones */}
        {mensajeExito && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-xs">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold">{mensajeExito}</p>
          </div>
        )}

        {mensajeError && !modalDispAbierto && !modalHorarioAbierto && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-xs">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <p className="text-sm font-semibold">{mensajeError}</p>
          </div>
        )}

        <section className="module-intro">
          <span className="module-intro-icon"><CalendarClock size={20} /></span>
          <div className="module-intro-copy"><span>PROGRAMACIÓN CLÍNICA</span><h2>Horarios y cupos</h2><p>Consulta las asignaciones semanales y el estado real de cada espacio de atención.</p></div>
          <div className="module-count"><strong>{disponibilidades.length}</strong><span>cupo{disponibilidades.length === 1 ? "" : "s"} en vista</span></div>
        </section>

        <section className="availability-summary" aria-label="Resumen de cupos">
          <article className="availability-summary-card"><span className="availability-summary-mark free-mark"><CheckCircle2 size={16} /></span><div><strong>{cargando ? "—" : cuposLibres}</strong><span>Libres</span></div><small>Listos para reservar</small></article>
          <article className="availability-summary-card"><span className="availability-summary-mark busy-mark"><Clock size={16} /></span><div><strong>{cargando ? "—" : cuposOcupados}</strong><span>Ocupados</span></div><small>Ya asignados a una cita</small></article>
          <article className="availability-summary-card"><span className="availability-summary-mark calendar-mark"><CalendarDays size={16} /></span><div><strong>{cargando ? "—" : horarios.length}</strong><span>Horarios semanales</span></div><small>Patrones de atención</small></article>
        </section>

        {/* Barra superior con pestañas y botones de acción */}
        <div className="availability-toolbar flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          {/* Selector de pestañas */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1.5">
            <button
              type="button"
              onClick={() => setPestanaActiva("disponibilidades")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition ${
                pestanaActiva === "disponibilidades"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarClock className="h-4 w-4" />
              <span>Espacios de Disponibilidad ({disponibilidades.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setPestanaActiva("horarios")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition ${
                pestanaActiva === "horarios"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Horarios semanales ({horarios.length})</span>
            </button>
          </div>

          {/* Botones para abrir modales */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { setCargando(true); cargarDatos(); }}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
              title="Recargar"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setMensajeError("");
                setModalHorarioAbierto(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs sm:text-sm font-bold text-blue-700 hover:bg-blue-100 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Asignar Día</span>
            </button>
            <button
              onClick={() => {
                setMensajeError("");
                setModalDispAbierto(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Cupo</span>
            </button>
          </div>
        </div>

        {/* PANEL DE FILTROS */}
        {pestanaActiva === "disponibilidades" && (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <Filter className="h-4 w-4 text-blue-600" />
                <span>Filtros de Disponibilidad</span>
              </div>
              {(filtroMedico || filtroEspecialidad || filtroFecha || filtroEstado !== "") && (
                <button
                  onClick={limpiarFiltros}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Limpiar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Filtro Médico */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Médico
                </label>
                <select
                  value={filtroMedico}
                  onChange={(e) => { setCargando(true); setFiltroMedico(e.target.value); }}
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

              {/* Filtro Especialidad */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Especialidad
                </label>
                <select
                  value={filtroEspecialidad}
                  onChange={(e) => { setCargando(true); setFiltroEspecialidad(e.target.value); }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                >
                  <option value="">Todas las especialidades</option>
                  {especialidades.map((esp) => (
                    <option key={esp.id} value={esp.nombre}>
                      {esp.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro Fecha */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Fecha Concreta
                </label>
                <input
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => { setCargando(true); setFiltroFecha(e.target.value); }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Filtro Estado */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Estado del Cupo
                </label>
                <select
                  value={filtroEstado}
                  onChange={(e) => { setCargando(true); setFiltroEstado(e.target.value); }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                >
                  <option value="">Todos los estados</option>
                  <option value="1">Solo Disponibles (Libres)</option>
                  <option value="0">Solo Ocupados (Reservados)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 1: TABLA DE ESPACIOS DE DISPONIBILIDAD */}
        {pestanaActiva === "disponibilidades" && (
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">
                Cupos de Atención Programados ({disponibilidades.length})
              </span>
              <span className="text-xs text-slate-400">
                1 = Disponible | 0 = Ocupado
              </span>
            </div>

            <div className="overflow-x-auto">
            <table className="registry-table availability-table w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Fecha y Horario</th>
                    <th className="px-6 py-3.5">Médico Especialista</th>
                    <th className="px-6 py-3.5">Consultorio / Sala</th>
                    <th className="px-6 py-3.5">Estado del Cupo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cargando ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-sm text-slate-400">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                        Consultando cupos de disponibilidad...
                      </td>
                    </tr>
                  ) : disponibilidades.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
                          <CalendarClock className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-700">
                          No se encontraron espacios de disponibilidad
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Ajusta los filtros o haz clic en &apos;Nuevo Cupo&apos; para programar atención médica.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    disponibilidades.map((disp) => {
                      const estaLibre = Number(disp.estado) === 1;

                      return (
                        <tr
                          key={disp.id}
                          className={`availability-row ${estaLibre ? "is-free" : "is-occupied"}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 font-bold text-slate-900">
                              <Clock className="h-4 w-4 text-blue-600" />
                              {disp.horario_atencion}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {fechaVisible(disp.fecha)}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">
                              Dr(a). {disp.medicoNombre || `Médico ${disp.documento_de_identidad || ""}`}
                            </div>
                            <div className="text-xs text-blue-600 font-semibold">
                              {disp.especialidad} (Doc: {disp.documento_de_identidad})
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                              <MapPin className="h-3.5 w-3.5 text-slate-500" />
                              Consultorio {disp.consultorioNumero}
                            </span>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            {estaLibre ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                Libre
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200">
                                <Clock className="h-3.5 w-3.5 text-slate-500" />
                                Ocupado
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: DÍAS HABITUALES DE ATENCIÓN (HORARIOS) */}
        {pestanaActiva === "horarios" && (
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">
                Días de Atención Semanal por Médico ({horarios.length})
              </span>
              <button
                onClick={() => setModalHorarioAbierto(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                + Asignar Día
              </button>
            </div>

            <div className="overflow-x-auto">
            <table className="registry-table w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Médico</th>
                    <th className="px-6 py-3.5">Documento</th>
                    <th className="px-6 py-3.5">Día de Semana</th>
                    <th className="px-6 py-3.5">ID Horario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {horarios.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-sm text-slate-400">
                        No hay horarios semanales asignados aún.
                      </td>
                    </tr>
                  ) : (
                    horarios.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {h.medicoNombre || `Médico ${h.documento_de_identidad}`}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-600">
                          {h.documento_de_identidad}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                            {h.dia_semana}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">
                          {h.id_horario || h.id}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL 1: NUEVO ESPACIO DE DISPONIBILIDAD */}
        <Modal
          isOpen={modalDispAbierto}
          onClose={() => setModalDispAbierto(false)}
          title="Generar Nuevo Espacio de Disponibilidad"
          subtitle="Asigna un cupo con fecha concreta, médico, horario de atención y consultorio"
        >
          {mensajeError && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{mensajeError}</span>
            </div>
          )}

          <form onSubmit={handleCrearDisponibilidad} className="clinical-form space-y-4">
            <div>
              <label htmlFor="slot-doctor" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Médico Especialista *
              </label>
              <select
                id="slot-doctor"
                required
                value={formDisp.documento_de_identidad}
                onChange={(e) =>
                  setFormDisp((prev) => ({
                    ...prev,
                    documento_de_identidad: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
              >
                <option value="">Seleccione un médico...</option>
                {medicos.map((m) => {
                  const doc = m.documento_de_identidad || m.documento;
                  const esp =
                    typeof m.especialidad === "object" && m.especialidad !== null
                      ? m.especialidad.nombre
                      : String(m.especialidad || "");
                  return (
                    <option key={m.id} value={doc}>
                      {m.nombre} - {esp}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label htmlFor="slot-room" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Consultorio / Sala *
              </label>
              <select
                id="slot-room"
                required
                value={formDisp.id_sala}
                onChange={(e) =>
                  setFormDisp((prev) => ({ ...prev, id_sala: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
              >
                <option value="">Seleccione consultorio o sala...</option>
                {consultorios.map((c) => (
                  <option key={c.id} value={c.id}>
                    Consultorio {c.numero} ({c.piso}) - {c.descripcion}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="slot-date" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Fecha Concreta *
                </label>
                <input
                  type="date"
                  id="slot-date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={formDisp.fecha}
                  onChange={(e) =>
                    setFormDisp((prev) => ({ ...prev, fecha: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
                />
              </div>

              <div>
                <label htmlFor="slot-time" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Franja Horaria *
                </label>
                <select
                  id="slot-time"
                  required
                  value={formDisp.horario_atencion}
                  onChange={(e) =>
                    setFormDisp((prev) => ({
                      ...prev,
                      horario_atencion: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
                >
                  {FRANJAS_HORARIAS_EJEMPLO.map((franja) => (
                    <option key={franja} value={franja}>
                      {franja}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalDispAbierto(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {enviando ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Generar Cupo (Estado: 1)
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>

        {/* MODAL 2: ASIGNAR DÍA HABITUAL DE ATENCIÓN */}
        <Modal
          isOpen={modalHorarioAbierto}
          onClose={() => setModalHorarioAbierto(false)}
          title="Asignar Día Habitual de Atención"
          subtitle="Registra qué días de la semana atiende el médico en el hospital"
        >
          {mensajeError && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{mensajeError}</span>
            </div>
          )}

          <form onSubmit={handleCrearHorario} className="clinical-form space-y-4">
            <div>
              <label htmlFor="weekly-doctor" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Médico *
              </label>
              <select
                id="weekly-doctor"
                required
                value={formHorario.documento_de_identidad}
                onChange={(e) =>
                  setFormHorario((prev) => ({
                    ...prev,
                    documento_de_identidad: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
              >
                <option value="">Seleccione un médico...</option>
                {medicos.map((m) => (
                  <option
                    key={m.id}
                    value={m.documento_de_identidad || m.documento}
                  >
                    {m.nombre} (Doc: {m.documento_de_identidad || m.documento})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="weekly-day" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Día de la Semana *
              </label>
              <select
                id="weekly-day"
                required
                value={formHorario.dia_semana}
                onChange={(e) =>
                  setFormHorario((prev) => ({
                    ...prev,
                    dia_semana: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
              >
                {DIAS_SEMANA.map((dia) => (
                  <option key={dia} value={dia}>
                    {dia}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalHorarioAbierto(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {enviando ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Asignando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Guardar Horario
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </LayoutWrapper>
  );
}

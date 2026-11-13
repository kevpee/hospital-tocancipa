"use client";

import { useEffect, useState } from "react";
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
  Stethoscope,
  User,
  X,
  Check,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";

export default function CitasPage() {
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [consultorios, setConsultorios] = useState([]);

  // Disponibilidades libres para el agendamiento guiado
  const [disponibilidadesLibres, setDisponibilidadesLibres] = useState([]);
  const [cargandoDisponibilidades, setCargandoDisponibilidades] = useState(false);

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

  const cargarCatalogos = async () => {
    try {
      const [resPac, resEsp, resMed, resCons] = await Promise.all([
        fetch("/api/pacientes"),
        fetch("/api/especialidades"),
        fetch("/api/medicos"),
        fetch("/api/consultorios"),
      ]);

      const [jsonPac, jsonEsp, jsonMed, jsonCons] = await Promise.all([
        resPac.json(),
        resEsp.json(),
        resMed.json(),
        resCons.json(),
      ]);

      if (jsonPac.success && Array.isArray(jsonPac.data)) setPacientes(jsonPac.data);
      if (jsonEsp.success && Array.isArray(jsonEsp.data)) setEspecialidades(jsonEsp.data);
      if (jsonMed.success && Array.isArray(jsonMed.data)) setMedicos(jsonMed.data);
      if (jsonCons.success && Array.isArray(jsonCons.data)) setConsultorios(jsonCons.data);
    } catch (err) {
      console.error("Error al cargar catálogos:", err);
    }
  };

  const cargarCitas = async () => {
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
  };

  useEffect(() => {
    cargarCatalogos();
  }, []);

  useEffect(() => {
    cargarCitas();
  }, [filtroMedico, filtroFecha, filtroEstado]);

  // Médicos filtrados por la especialidad seleccionada en el formulario
  const medicosFiltradosPorEspecialidad = medicos.filter((m) => {
    if (!formCita.especialidadId) return true;
    const espNombre =
      typeof m.especialidad === "object" && m.especialidad !== null
        ? m.especialidad.nombre
        : String(m.especialidad || "");
    const espSeleccionada = especialidades.find(
      (e) => String(e.id) === String(formCita.especialidadId)
    );
    return espSeleccionada ? espNombre.toLowerCase() === espSeleccionada.nombre.toLowerCase() : true;
  });

  // Cuando cambian médico o fecha en el formulario, cargar ÚNICAMENTE disponibilidades libres (estado: 1)
  useEffect(() => {
    const consultarDisponibilidadesLibres = async () => {
      if (!formCita.medicoId || !formCita.fecha) {
        setDisponibilidadesLibres([]);
        return;
      }

      try {
        setCargandoDisponibilidades(true);
        const res = await fetch(
          `/api/disponibilidades?documento_de_identidad=${formCita.medicoId}&fecha=${formCita.fecha}&soloDisponibles=true`
        );
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          // Filtrar rigurosamente solo las que tengan estado == 1
          const libres = json.data.filter((d) => Number(d.estado) === 1);
          setDisponibilidadesLibres(libres);
          if (libres.length > 0 && !formCita.id_disponibilidad) {
            setFormCita((prev) => ({ ...prev, id_disponibilidad: libres[0].id }));
          }
        } else {
          setDisponibilidadesLibres([]);
        }
      } catch {
        setDisponibilidadesLibres([]);
      } finally {
        setCargandoDisponibilidades(false);
      }
    };

    consultarDisponibilidadesLibres();
  }, [formCita.medicoId, formCita.fecha]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensajeError("");
    setMensajeExito("");

    if (!formCita.pacienteId) {
      setMensajeError("Paso 1: Debe seleccionar un paciente.");
      return;
    }

    if (!formCita.medicoId) {
      setMensajeError("Paso 3: Debe seleccionar el médico especialista.");
      return;
    }

    if (!formCita.fecha) {
      setMensajeError("Paso 4: Debe seleccionar la fecha de la cita.");
      return;
    }

    if (!formCita.id_disponibilidad) {
      setMensajeError("Paso 5 y 6: Debe seleccionar un espacio de disponibilidad libre.");
      return;
    }

    if (!formCita.motivo.trim() || formCita.motivo.trim().length < 4) {
      setMensajeError("Paso 7: El motivo de la consulta debe tener al menos 4 caracteres.");
      return;
    }

    try {
      setEnviando(true);
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

      setMensajeExito("¡Cita médica reservada y confirmada exitosamente!");
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
    } catch (err) {
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

  const hoyStr = new Date().toISOString().split("T")[0];

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
              onClick={() => {
                setMensajeError("");
                setModalAbierto(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              Agendar Cita Médica
            </button>
          </div>
        </div>

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
          subtitle="Proceso guiado de 8 pasos según el modelo de disponibilidad hospitalaria"
          maxWidth="max-w-2xl"
        >
          {mensajeError && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{mensajeError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Paso 1: Seleccionar Paciente */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Paso 1: Seleccionar Paciente *
              </label>
              <select
                required
                value={formCita.pacienteId}
                onChange={(e) =>
                  setFormCita((prev) => ({ ...prev, pacienteId: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
              >
                <option value="">Seleccione el paciente...</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id_paciente || p.id}>
                    {p.nombre} (Documento: {p.documento_de_identidad || p.documento})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Paso 2: Seleccionar Especialidad */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Paso 2: Especialidad *
                </label>
                <select
                  required
                  value={formCita.especialidadId}
                  onChange={(e) =>
                    setFormCita((prev) => ({
                      ...prev,
                      especialidadId: e.target.value,
                      medicoId: "", // reset médico al cambiar especialidad
                      id_disponibilidad: "",
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
                >
                  <option value="">Seleccione especialidad...</option>
                  {especialidades.map((esp) => (
                    <option key={esp.id} value={esp.id}>
                      {esp.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Paso 3: Seleccionar Médico */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Paso 3: Médico Tratante *
                </label>
                <select
                  required
                  value={formCita.medicoId}
                  onChange={(e) =>
                    setFormCita((prev) => ({
                      ...prev,
                      medicoId: e.target.value,
                      id_disponibilidad: "",
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
                >
                  <option value="">Seleccione médico...</option>
                  {medicosFiltradosPorEspecialidad.map((m) => {
                    const doc = m.documento_de_identidad || m.documento;
                    return (
                      <option key={m.id} value={doc}>
                        {m.nombre}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Paso 4: Seleccionar Fecha */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Paso 4: Seleccionar Fecha de Atención *
              </label>
              <input
                type="date"
                required
                min={hoyStr}
                value={formCita.fecha}
                onChange={(e) =>
                  setFormCita((prev) => ({
                    ...prev,
                    fecha: e.target.value,
                    id_disponibilidad: "",
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
              />
            </div>

            {/* Paso 5 y 6: Mostrar ÚNICAMENTE disponibilidades libres y Seleccionar Consultorio / Horario */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Paso 5 y 6: Espacio de Disponibilidad Libre (Consultorio y Horario) *
              </label>

              {!formCita.medicoId || !formCita.fecha ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-500">
                  Selecciona primero el médico y la fecha para consultar los cupos libres.
                </div>
              ) : cargandoDisponibilidades ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                  Buscando disponibilidades libres en Firestore...
                </div>
              ) : disponibilidadesLibres.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-center text-xs text-amber-900">
                  <p className="font-bold">No hay cupos libres para este médico en la fecha seleccionada.</p>
                  <p className="mt-0.5 text-amber-800">
                    Ve a la sección &apos;Horarios y Disponibilidad&apos; para generar nuevos cupos o selecciona otra fecha.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1">
                  {disponibilidadesLibres.map((disp) => {
                    const isSelected = formCita.id_disponibilidad === disp.id;
                    return (
                      <div
                        key={disp.id}
                        onClick={() =>
                          setFormCita((prev) => ({
                            ...prev,
                            id_disponibilidad: disp.id,
                          }))
                        }
                        className={`cursor-pointer rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/90 shadow-xs"
                            : "border-slate-200 bg-white hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-blue-600" />
                            {disp.horario_atencion}
                          </span>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Libre (1)
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-600 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          Consultorio {disp.consultorioNumero}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Paso 7: Motivo de la Consulta */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Paso 7: Motivo de la Consulta *
              </label>
              <textarea
                required
                rows={2}
                value={formCita.motivo}
                onChange={(e) =>
                  setFormCita((prev) => ({ ...prev, motivo: e.target.value }))
                }
                placeholder="Describe el motivo, síntoma o control médico..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition resize-none"
              />
            </div>

            {/* Paso 8: Confirmar Cita Médica */}
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando || !formCita.id_disponibilidad}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {enviando ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Ejecutando Transacción...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Paso 8: Confirmar Cita (Reserva Atómica)
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

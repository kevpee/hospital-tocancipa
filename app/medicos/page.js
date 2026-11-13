"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LayoutWrapper from "@/components/LayoutWrapper";
import Modal from "@/components/Modal";
import {
  UserCheck,
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Award,
  FileText,
  Stethoscope,
  CalendarClock,
  Plus,
} from "lucide-react";

export default function MedicosPage() {
  const [medicos, setMedicos] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);

  // Formulario
  const [formData, setFormData] = useState({
    nombre: "",
    documento: "",
    especialidadId: "",
  });

  const [enviando, setEnviando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeError, setMensajeError] = useState("");

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [resMed, resEsp] = await Promise.all([
        fetch("/api/medicos"),
        fetch("/api/especialidades"),
      ]);

      const [jsonMed, jsonEsp] = await Promise.all([
        resMed.json(),
        resEsp.json(),
      ]);

      if (!resMed.ok || !jsonMed.success || !Array.isArray(jsonMed.data)
        || !resEsp.ok || !jsonEsp.success || !Array.isArray(jsonEsp.data)) {
        throw new Error("No fue posible consultar el equipo médico y sus especialidades.");
      }

      setMedicos(jsonMed.data);
      setEspecialidades(jsonEsp.data);
      setFormData((previous) => previous.especialidadId || !jsonEsp.data.length
        ? previous
        : { ...previous, especialidadId: jsonEsp.data[0].id });
      setMensajeError("");
    } catch (error) {
      setMensajeError(error.message || "Error al cargar los médicos y especialidades desde la API.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    let activo = true;
    Promise.all([fetch("/api/medicos"), fetch("/api/especialidades")])
      .then(async ([medicosResponse, especialidadesResponse]) => {
        const [medicosJson, especialidadesJson] = await Promise.all([
          medicosResponse.json(),
          especialidadesResponse.json(),
        ]);
        if (!medicosResponse.ok || !medicosJson.success || !Array.isArray(medicosJson.data)
          || !especialidadesResponse.ok || !especialidadesJson.success || !Array.isArray(especialidadesJson.data)) {
          throw new Error("No fue posible consultar el directorio médico y sus especialidades.");
        }
        return [medicosJson.data, especialidadesJson.data];
      })
      .then(([medicosData, especialidadesData]) => {
        if (!activo) return;
        setMedicos(medicosData);
        setEspecialidades(especialidadesData);
        setFormData((previous) => previous.especialidadId || !especialidadesData.length
          ? previous
          : { ...previous, especialidadId: especialidadesData[0].id });
      })
      .catch((error) => { if (activo) setMensajeError(error.message || "Error al cargar los médicos y especialidades desde la API."); })
      .finally(() => { if (activo) setCargando(false); });

    return () => { activo = false; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (mensajeError) setMensajeError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensajeError("");
    setMensajeExito("");

    if (!formData.nombre.trim() || formData.nombre.trim().length < 3) {
      setMensajeError("El nombre del médico debe contener al menos 3 caracteres.");
      return;
    }

    if (!formData.documento.trim() || formData.documento.trim().length < 4) {
      setMensajeError("El documento de identidad debe tener al menos 4 caracteres.");
      return;
    }

    if (!formData.especialidadId) {
      setMensajeError("Seleccione una especialidad médica de la lista.");
      return;
    }

    try {
      setEnviando(true);
      const res = await fetch("/api/medicos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudo registrar el médico.");
      }

      setMensajeExito(json.message || "Médico registrado exitosamente.");
      setFormData((prev) => ({
        nombre: "",
        documento: "",
        especialidadId: especialidades.length > 0 ? especialidades[0].id : "",
      }));
      setModalAbierto(false);

      const resMed = await fetch("/api/medicos");
      const jsonMed = await resMed.json();
      if (!resMed.ok || !jsonMed.success || !Array.isArray(jsonMed.data)) throw new Error(jsonMed.message || "No fue posible actualizar el directorio médico.");
      setMedicos(jsonMed.data);
    } catch (err) {
      setMensajeError(err.message || "Error al procesar la solicitud.");
    } finally {
      setEnviando(false);
    }
  };

  const medicosFiltrados = medicos.filter((m) => {
    const termino = busqueda.toLowerCase().trim();
    if (!termino) return true;
    const doc = m.documento_de_identidad || m.documento || "";
    const nombreEsp =
      typeof m.especialidad === "object" && m.especialidad !== null
        ? m.especialidad.nombre
        : String(m.especialidad || "");
    return (
      (m.nombre || "").toLowerCase().includes(termino) ||
      doc.toLowerCase().includes(termino) ||
      nombreEsp.toLowerCase().includes(termino)
    );
  });

  return (
    <LayoutWrapper
      title="Cuerpo Médico Especializado"
      subtitle="Directorio de profesionales de la salud, credenciales y asignación de disponibilidad"
    >
      <div className="space-y-6 registry-page">
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

        <section className="module-intro">
          <span className="module-intro-icon"><Stethoscope size={20} /></span>
          <div className="module-intro-copy"><span>DIRECTORIO CLÍNICO</span><h2>Equipo médico</h2><p>Profesionales, especialidades y acceso a sus horarios de atención.</p></div>
          <div className="module-count"><strong>{medicos.length}</strong><span>profesionales</span></div>
        </section>

        {/* Barra de Acciones y Búsqueda */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              aria-label="Buscar médicos por nombre, documento o especialidad"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por médico, documento o especialidad..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={cargarDatos}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
              title="Recargar directorio médico"
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
              Nuevo Médico
            </button>
          </div>
        </div>

        {/* TABLA PRINCIPAL DE MÉDICOS */}
        <div className="registry-panel rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          <div className="registry-panel-heading px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm">
              Especialistas Registrados ({medicosFiltrados.length})
            </span>
            <span className="text-xs text-slate-400">
              {medicos.length} en el cuerpo médico
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="registry-table w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Médico</th>
                  <th className="px-6 py-3.5">Documento (PK)</th>
                  <th className="px-6 py-3.5">Especialidad</th>
                  <th className="px-6 py-3.5">Fecha de Registro</th>
                  <th className="px-6 py-3.5 text-right">Disponibilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cargando ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                      Cargando médicos desde el repositorio...
                    </td>
                  </tr>
                ) : medicosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
                        <UserCheck className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">
                        {busqueda ? "No se encontraron coincidencias" : "No hay médicos registrados aún"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {busqueda
                          ? "Prueba buscando por otro nombre o área."
                          : "Haz clic en 'Nuevo Médico' para dar de alta al primer especialista."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  medicosFiltrados.map((medico) => {
                    const docId = medico.documento_de_identidad || medico.documento;
                    const nombreEsp =
                      typeof medico.especialidad === "object" && medico.especialidad !== null
                        ? medico.especialidad.nombre
                        : String(medico.especialidad || "General");

                    return (
                      <tr
                        key={medico.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold">
                              <Stethoscope className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">
                                {medico.nombre}
                              </div>
                              <span className="text-xs text-slate-400">
                                Código: {docId}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-800">
                            <FileText className="h-3.5 w-3.5 text-slate-500" />
                            {docId}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                            <Award className="h-3.5 w-3.5 text-blue-600" />
                            {nombreEsp}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {medico.fechaRegistro
                            ? new Date(medico.fechaRegistro).toLocaleDateString("es-ES")
                            : "N/D"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/disponibilidad?medicoId=${docId}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition"
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                            <span>Ver Horarios</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL PARA REGISTRO DE MÉDICO */}
        <Modal
          isOpen={modalAbierto}
          onClose={() => setModalAbierto(false)}
          title="Registrar Nuevo Médico Especialista"
          subtitle="Ingresa el nombre, documento de identidad (PK) y área de especialidad"
        >
          {mensajeError && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{mensajeError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="clinical-form space-y-4">
            <div>
              <label htmlFor="doctor-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nombre Completo del Médico *
              </label>
              <input
                type="text"
                id="doctor-name"
                name="nombre"
                required
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej. Dra. Mariana Silva Rojas"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
              />
            </div>

            <div>
              <label htmlFor="doctor-document" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Documento de Identidad (Clave Primaria) *
              </label>
              <input
                type="text"
                id="doctor-document"
                name="documento"
                required
                value={formData.documento}
                onChange={handleChange}
                placeholder="Ej. 71829304"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Debe ser único en el sistema hospitalario.
              </span>
            </div>

            <div>
              <label htmlFor="doctor-specialty" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Especialidad Médica *
              </label>
              <select
                name="especialidadId"
                id="doctor-specialty"
                required
                value={formData.especialidadId}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
              >
                <option value="" disabled>
                  Seleccione una especialidad...
                </option>
                {especialidades.map((esp) => (
                  <option key={esp.id} value={esp.id}>
                    {esp.nombre}
                  </option>
                ))}
              </select>
            </div>

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
                disabled={enviando}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {enviando ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Guardar Médico
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

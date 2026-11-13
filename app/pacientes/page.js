"use client";

import { useEffect, useState } from "react";
import LayoutWrapper from "@/components/LayoutWrapper";
import Modal from "@/components/Modal";
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  FileText,
  Plus,
} from "lucide-react";

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);

  // Formulario
  const [formData, setFormData] = useState({
    nombre: "",
    documento: "",
    telefono: "",
    correo: "",
    fechaNacimiento: "",
  });

  const [enviando, setEnviando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeError, setMensajeError] = useState("");

  const cargarPacientes = async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/pacientes");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPacientes(json.data);
      }
    } catch {
      setMensajeError("Error de conexión al cargar pacientes desde la API.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPacientes();
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
      setMensajeError("El nombre completo debe tener al menos 3 caracteres.");
      return;
    }

    if (!formData.documento.trim() || formData.documento.trim().length < 4) {
      setMensajeError("El documento de identidad debe tener al menos 4 caracteres.");
      return;
    }

    if (!formData.telefono.trim() || formData.telefono.trim().length < 6) {
      setMensajeError("El teléfono de contacto debe tener al menos 6 dígitos.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.correo.trim() || !emailRegex.test(formData.correo.trim())) {
      setMensajeError("Ingrese un correo electrónico válido (ejemplo: usuario@correo.com).");
      return;
    }

    if (!formData.fechaNacimiento) {
      setMensajeError("La fecha de nacimiento es obligatoria.");
      return;
    }

    try {
      setEnviando(true);
      const res = await fetch("/api/pacientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudo registrar el paciente.");
      }

      setMensajeExito(json.message || "Paciente registrado exitosamente.");
      setFormData({
        nombre: "",
        documento: "",
        telefono: "",
        correo: "",
        fechaNacimiento: "",
      });
      setModalAbierto(false);
      await cargarPacientes();
    } catch (err) {
      setMensajeError(err.message || "Error al procesar la solicitud.");
    } finally {
      setEnviando(false);
    }
  };

  const pacientesFiltrados = pacientes.filter((p) => {
    const termino = busqueda.toLowerCase().trim();
    if (!termino) return true;
    const doc = p.documento_de_identidad || p.documento || "";
    return (
      (p.nombre || "").toLowerCase().includes(termino) ||
      doc.toLowerCase().includes(termino) ||
      (p.correo || "").toLowerCase().includes(termino)
    );
  });

  return (
    <LayoutWrapper
      title="Directorio de Pacientes"
      subtitle="Gestión de historias clínicas y registro de usuarios del hospital"
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

        {/* Barra de Acciones y Búsqueda */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, documento o correo..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={cargarPacientes}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
              title="Recargar pacientes"
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
              Nuevo Paciente
            </button>
          </div>
        </div>

        {/* TABLA PRINCIPAL DE PACIENTES */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm">
              Lista de Pacientes ({pacientesFiltrados.length})
            </span>
            <span className="text-xs text-slate-400">
              {pacientes.length} registrados en total
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Paciente</th>
                  <th className="px-6 py-3.5">Documento de Identidad</th>
                  <th className="px-6 py-3.5">Contacto</th>
                  <th className="px-6 py-3.5">Fecha de Nacimiento</th>
                  <th className="px-6 py-3.5">Fecha Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cargando ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                      Cargando pacientes desde el repositorio...
                    </td>
                  </tr>
                ) : pacientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
                        <Users className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">
                        {busqueda ? "No se encontraron coincidencias" : "No hay pacientes registrados aún"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {busqueda
                          ? "Prueba buscando con otro documento o nombre."
                          : "Haz clic en 'Nuevo Paciente' para dar de alta al primer usuario."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  pacientesFiltrados.map((paciente) => (
                    <tr
                      key={paciente.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">
                          {paciente.nombre}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {paciente.correo}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-800">
                          <FileText className="h-3.5 w-3.5 text-slate-500" />
                          {paciente.documento_de_identidad || paciente.documento}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {paciente.telefono}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {paciente.fecha_nacimiento || paciente.fechaNacimiento}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {paciente.fechaRegistro
                          ? new Date(paciente.fechaRegistro).toLocaleDateString("es-ES")
                          : "N/D"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL PARA REGISTRO DE PACIENTE */}
        <Modal
          isOpen={modalAbierto}
          onClose={() => setModalAbierto(false)}
          title="Registrar Nuevo Paciente"
          subtitle="Completa el formulario con la información personal y de contacto"
        >
          {mensajeError && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{mensajeError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                name="nombre"
                required
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej. Carlos Eduardo Pérez"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Documento de Identidad *
                </label>
                <input
                  type="text"
                  name="documento"
                  required
                  value={formData.documento}
                  onChange={handleChange}
                  placeholder="Ej. 1020304050"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Teléfono de Contacto *
                </label>
                <input
                  type="tel"
                  name="telefono"
                  required
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="Ej. +57 310 123 4567"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  name="correo"
                  required
                  value={formData.correo}
                  onChange={handleChange}
                  placeholder="Ej. paciente@correo.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Fecha de Nacimiento *
                </label>
                <input
                  type="date"
                  name="fechaNacimiento"
                  required
                  max={new Date().toISOString().split("T")[0]}
                  value={formData.fechaNacimiento}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
                />
              </div>
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
                    Registrando...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Guardar Paciente
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

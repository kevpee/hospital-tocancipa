"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LayoutWrapper from "@/components/LayoutWrapper";
import {
  Users,
  UserCheck,
  CalendarDays,
  Database,
  ArrowRight,
  PlusCircle,
  CalendarCheck,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Stethoscope,
  CheckCircle2,
  XCircle,
  CalendarClock,
  Sparkles,
} from "lucide-react";

export default function InicioPage() {
  const [metrics, setMetrics] = useState({
    totalPacientes: 0,
    totalMedicos: 0,
    totalCitasHoy: 0,
    citasProgramadas: 0,
    citasAtendidas: 0,
    citasCanceladas: 0,
    disponibilidadesLibres: 0,
    disponibilidadesOcupadas: 0,
    dbMode: "firestore",
    dbLabel: "No relacional - Firestore",
    dbEngine: "Google Cloud Firestore (SDK Modular v13)",
    configRequerida: false,
  });

  const [citasHoy, setCitasHoy] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargarDatos = async () => {
    try {
      setCargando(true);

      const [resDash, resCitas] = await Promise.all([
        fetch("/api/dashboard"),
        fetch(`/api/citas?fecha=${new Date().toISOString().split("T")[0]}`),
      ]);

      const [jsonDash, jsonCitas] = await Promise.all([
        resDash.json(),
        resCitas.json(),
      ]);

      if (jsonDash.data) {
        setMetrics(jsonDash.data);
      }

      if (jsonCitas.success && Array.isArray(jsonCitas.data)) {
        setCitasHoy(jsonCitas.data);
      }
    } catch (err) {
      console.error("Error al cargar datos del dashboard:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const totalDisponibilidades =
    (metrics.disponibilidadesLibres || 0) + (metrics.disponibilidadesOcupadas || 0);
  const porcentajeLibre =
    totalDisponibilidades > 0
      ? Math.round(((metrics.disponibilidadesLibres || 0) / totalDisponibilidades) * 100)
      : 0;

  return (
    <LayoutWrapper
      title="Panel de Control Hospitalario"
      subtitle="Supervisión en tiempo real de pacientes, cuerpo médico y agenda de consultas"
    >
      <div className="space-y-8">
        {/* Banner Superior Principal con Estilo Clínico Moderno */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-blue-200" />
              <span>Hospital Tocancipá | Gestión Médica</span>
            </div>
            <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight">
              Gestión Integral de Citas y Disponibilidad
            </h2>
            <p className="mt-2 text-sm sm:text-base text-blue-100 leading-relaxed max-w-2xl">
              Administra pacientes, especialistas, horarios y citas médicas desde un solo lugar, de forma rápida, segura y organizada.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/citas"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-blue-700 shadow-md shadow-blue-900/10 hover:bg-blue-50 transition"
              >
                <PlusCircle className="h-4 w-4" />
                Agendar Nueva Cita
              </Link>
              <Link
                href="/disponibilidad"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-800/70 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md hover:bg-blue-800 transition"
              >
                <CalendarClock className="h-4 w-4" />
                Ver Disponibilidad
              </Link>
              <Link
                href="/pacientes"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md hover:bg-white/20 transition"
              >
                <Users className="h-4 w-4" />
                Registrar Paciente
              </Link>
            </div>
          </div>

          <div className="absolute right-0 top-0 -mt-12 -mr-12 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        </div>

        {/* Alerta de Configuración si faltan variables */}
        {metrics.configRequerida && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-5 text-amber-900 shadow-xs">
            <div className="flex items-start gap-3.5">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-bold text-amber-950">
                  Configuración de Base de Datos Requerida
                </p>
                <p className="text-amber-800 text-xs sm:text-sm mt-0.5">
                  Las credenciales de Firebase Firestore no están definidas en el archivo{" "}
                  <code className="font-mono font-bold bg-amber-100 px-1.5 py-0.5 rounded text-amber-900">
                    .env.local
                  </code>
                  . Completa la configuración siguiendo la plantilla de{" "}
                  <code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded text-amber-900">
                    .env.example
                  </code>
                  .
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TARJETAS KPI (Estadísticas Principales) */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* 1. Total Pacientes */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-blue-200 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pacientes
              </span>
              <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900">
                {cargando ? "..." : metrics.totalPacientes}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Total en directorio</p>
          </div>

          {/* 2. Total Médicos */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-emerald-200 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Médicos
              </span>
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900">
                {cargando ? "..." : metrics.totalMedicos}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Especialistas activos</p>
          </div>

          {/* 3. Citas de Hoy */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-indigo-200 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Citas Hoy
              </span>
              <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                <CalendarCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900">
                {cargando ? "..." : metrics.totalCitasHoy}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">En agenda de hoy</p>
          </div>

          {/* 4. Citas Atendidas */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-teal-200 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Atendidas
              </span>
              <div className="rounded-xl bg-teal-50 p-2 text-teal-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-teal-700">
                {cargando ? "..." : metrics.citasAtendidas}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Consultas completadas</p>
          </div>

          {/* 5. Citas Canceladas */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-rose-200 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Canceladas
              </span>
              <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
                <XCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-rose-700">
                {cargando ? "..." : metrics.citasCanceladas}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Cupos liberados</p>
          </div>

          {/* 6. Espacios Libres */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-cyan-200 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Cupos Libres
              </span>
              <div className="rounded-xl bg-cyan-50 p-2 text-cyan-600">
                <CalendarClock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-cyan-700">
                {cargando ? "..." : metrics.disponibilidadesLibres}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Disponibles para cita</p>
          </div>
        </div>

        {/* SECCIÓN INFERIOR: Próximas Citas y Resumen de Disponibilidad */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Agenda de Citas de Hoy */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Agenda y Próximas Citas de Hoy
                </h3>
                <p className="text-xs text-slate-500">
                  Consultas programadas para la fecha actual
                </p>
              </div>
              <Link
                href="/citas"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                Ver agenda completa <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="mt-4">
              {cargando ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  Cargando citas del día...
                </div>
              ) : citasHoy.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-2">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    No hay citas programadas para hoy
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Puedes agendar una cita seleccionando un espacio de disponibilidad libre.
                  </p>
                  <Link
                    href="/citas"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                  >
                    <PlusCircle className="h-4 w-4" /> Agendar Cita
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {citasHoy.map((cita) => (
                    <div
                      key={cita.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 hover:bg-slate-50/70 rounded-xl px-2 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-blue-50 p-2 text-blue-600 shrink-0 mt-0.5">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">
                              {cita.hora || cita.horario_atencion}
                            </span>
                            <span className="text-xs text-slate-300">•</span>
                            <span className="text-xs font-semibold text-slate-600">
                              Consultorio {cita.consultorioNumero}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 mt-0.5">
                            {cita.pacienteNombre}
                          </p>
                          <p className="text-xs text-slate-500">
                            Dr(a). {cita.medicoNombre} ({cita.especialidad})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            cita.estado === "atendida"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : cita.estado === "cancelada"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {cita.estado.charAt(0).toUpperCase() + cita.estado.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta de Resumen de Disponibilidad y Estado */}
          <div className="space-y-6">
            {/* Disponibilidad */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <CalendarClock className="h-4 w-4 text-blue-600" />
                  <span>Resumen de Cupos</span>
                </div>
                <Link
                  href="/disponibilidad"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Gestionar
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-600">Espacios Libres:</span>
                  <span className="font-bold text-emerald-600">
                    {metrics.disponibilidadesLibres} cupos
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-600">Espacios Ocupados:</span>
                  <span className="font-bold text-slate-800">
                    {metrics.disponibilidadesOcupadas} cupos
                  </span>
                </div>

                {/* Barra de progreso */}
                <div className="mt-2">
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${porcentajeLibre}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 text-right">
                    {porcentajeLibre}% de disponibilidad libre
                  </p>
                </div>
              </div>
            </div>

            {/* Base de Datos Activa */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
                <Database className="h-4 w-4 text-blue-600" />
                <span>Base de Datos Activa</span>
              </div>

              <div className="mt-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {metrics.dbLabel}
                </span>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  {metrics.dbEngine}
                </p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>Modo: <code className="font-mono font-bold text-slate-700">{metrics.dbMode}</code></span>
                  <span className="text-emerald-600 font-semibold">Listo Vercel</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}

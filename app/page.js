"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import LayoutWrapper from "@/components/LayoutWrapper";
import {
  Activity, AlertTriangle, ArrowRight, CalendarClock, CalendarDays,
  Check, Clock3, Database, Plus, RefreshCw, Stethoscope, Users,
} from "lucide-react";

function fechaColombia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

const initialMetrics = {
  totalPacientes: 0, totalMedicos: 0, totalCitasHoy: 0, citasProgramadas: 0,
  citasAtendidas: 0, citasCanceladas: 0, disponibilidadesLibres: 0,
  disponibilidadesOcupadas: 0, dbMode: "", dbLabel: "", dbEngine: "", configRequerida: false,
};

export default function InicioPage() {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [dashboardResponse, appointmentsResponse] = await Promise.all([
        fetch("/api/dashboard", { cache: "no-store" }),
        fetch(`/api/citas?fecha=${fechaColombia()}`, { cache: "no-store" }),
      ]);
      const [dashboard, agenda] = await Promise.all([dashboardResponse.json(), appointmentsResponse.json()]);
      if (dashboard?.data) setMetrics(dashboard.data);
      if (!dashboardResponse.ok || !dashboard?.success || !dashboard?.data) throw new Error(dashboard?.message || "No fue posible consultar el resumen.");
      if (!appointmentsResponse.ok || !agenda?.success) throw new Error(agenda?.message || "No fue posible consultar la agenda.");
      setAppointments(Array.isArray(agenda.data) ? agenda.data : []);
      setError("");
    } catch (cause) {
      setError(cause.message || "No fue posible cargar la información.");
    } finally {
      setLoading(false);
    }
  }, []);

  // El efecto inicia una consulta externa; sus actualizaciones ocurren al resolver el fetch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, [loadData]);

  const totalSlots = (metrics.disponibilidadesLibres || 0) + (metrics.disponibilidadesOcupadas || 0);
  const freePercent = totalSlots ? Math.round((metrics.disponibilidadesLibres / totalSlots) * 100) : 0;
  const kpis = [
    { label: "Pacientes", value: metrics.totalPacientes, note: "En el directorio", icon: Users },
    { label: "Equipo médico", value: metrics.totalMedicos, note: "Profesionales registrados", icon: Stethoscope },
    { label: "Citas de hoy", value: metrics.totalCitasHoy, note: "Agenda del día", icon: CalendarDays },
    { label: "Cupos disponibles", value: metrics.disponibilidadesLibres, note: `${metrics.disponibilidadesOcupadas || 0} ocupados`, icon: CalendarClock },
  ];

  return (
    <LayoutWrapper title="Resumen" subtitle="Vista general de la actividad y la agenda clínica">
      <div className="dashboard-page">
        <section className="dashboard-intro">
          <div>
            <p className="dashboard-kicker"><Activity size={14} /> Hospital Tocancipá</p>
            <h2>Gestión clínica, con claridad.</h2>
            <p>Consulta la actividad del día y accede rápidamente a las tareas principales.</p>
          </div>
          <div className="dashboard-actions">
            <button type="button" className="dashboard-secondary-link" onClick={() => { setLoading(true); setError(""); loadData(); }} disabled={loading}>
              <RefreshCw size={15} className={loading ? "spin" : ""} /> Actualizar
            </button>
            <Link href="/citas" className="dashboard-primary-link"><Plus size={16} /> Agendar cita</Link>
          </div>
        </section>

        {metrics.configRequerida && (
          <div className="dashboard-alert" role="alert">
            <AlertTriangle size={18} />
            <div><strong>Base de datos sin configurar</strong><p>Revisa la configuración de Firestore para consultar y guardar información.</p></div>
          </div>
        )}
        {error && <div className="dashboard-alert" role="alert"><AlertTriangle size={18} /><div><strong>No se pudo actualizar el resumen</strong><p>{error}</p></div><button type="button" onClick={() => { setLoading(true); setError(""); loadData(); }}>Reintentar</button></div>}

        <section className="metric-grid" aria-label="Indicadores principales">
          {kpis.map(({ label, value, note, icon: Icon }) => (
            <article className="metric-card" key={label}>
              <div className="metric-card-head"><span>{label}</span><span className="metric-icon"><Icon size={17} /></span></div>
              <div className="metric-value">{loading ? "—" : (value ?? 0)}</div>
              <p className="metric-foot">{note}</p>
            </article>
          ))}
        </section>

        <div className="dashboard-lower-grid">
          <section className="dashboard-panel dashboard-agenda">
            <div className="panel-heading">
              <div><p className="dashboard-kicker">AGENDA</p><h3>Citas de hoy</h3><p>Seguimiento de las consultas programadas para hoy.</p></div>
              <Link href="/citas" className="text-link">Abrir agenda <ArrowRight size={14} /></Link>
            </div>
            {loading ? <div className="dashboard-state">Cargando agenda…</div> : appointments.length === 0 ? (
              <div className="dashboard-state empty-state"><span className="empty-state-icon"><CalendarDays size={20} /></span><strong>Sin citas para hoy</strong><p>Las nuevas reservas aparecerán aquí.</p><Link href="/citas" className="text-link">Agendar una cita <ArrowRight size={14} /></Link></div>
            ) : (
              <div className="appointment-list">
                {appointments.slice(0, 6).map((appointment) => (
                  <article className="appointment-row" key={appointment.id}>
                    <span className="appointment-time"><Clock3 size={14} />{appointment.hora || appointment.horario_atencion || "Hora pendiente"}</span>
                    <div className="appointment-person"><strong>{appointment.pacienteNombre || "Paciente"}</strong><span>Dr(a). {appointment.medicoNombre || "—"} · {appointment.especialidad || "Consulta"}</span></div>
                    <div className="appointment-meta"><span>{appointment.consultorioNumero ? `Consultorio ${appointment.consultorioNumero}` : "Consultorio —"}</span><span className={`status-pill status-${appointment.estado || "programada"}`}>{appointment.estado || "programada"}</span></div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="dashboard-side-column">
            <section className="dashboard-panel capacity-panel">
              <div className="panel-heading compact"><div><p className="dashboard-kicker">DISPONIBILIDAD</p><h3>Estado de cupos</h3></div><Link href="/disponibilidad" aria-label="Ver horarios y disponibilidades" className="icon-link"><ArrowRight size={16} /></Link></div>
              <div className="capacity-numbers"><div><strong>{loading ? "—" : metrics.disponibilidadesLibres || 0}</strong><span>Libres</span></div><div><strong>{loading ? "—" : metrics.disponibilidadesOcupadas || 0}</strong><span>Ocupados</span></div></div>
              <div className="capacity-track" role="progressbar" aria-label="Porcentaje de cupos libres" aria-valuenow={freePercent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${loading ? 0 : freePercent}%` }} /></div>
              <p className="capacity-caption">{loading ? "Actualizando disponibilidad" : `${freePercent}% de los cupos están libres`}</p>
              <Link href="/disponibilidad" className="panel-footer-link">Administrar agenda <ArrowRight size={14} /></Link>
            </section>
            <section className="dashboard-panel source-panel">
              <p className="dashboard-kicker">PERSISTENCIA</p><h3><Database size={16} /> Fuente de datos</h3>
              <p>{metrics.dbLabel || (loading ? "Consultando conexión…" : "Sin información de conexión")}</p>
              {metrics.dbMode && <span className="source-mode">Modo <strong>{metrics.dbMode}</strong></span>}
            </section>
          </aside>
        </div>
        <section className="dashboard-shortcuts" aria-label="Accesos directos">
          <Link href="/pacientes"><Users size={17} /><span><strong>Pacientes</strong><small>Consultar y registrar</small></span><ArrowRight size={15} /></Link>
          <Link href="/medicos"><Stethoscope size={17} /><span><strong>Equipo médico</strong><small>Directorio profesional</small></span><ArrowRight size={15} /></Link>
          <Link href="/disponibilidad"><Check size={17} /><span><strong>Horarios y cupos</strong><small>Gestionar disponibilidad</small></span><ArrowRight size={15} /></Link>
        </section>
      </div>
    </LayoutWrapper>
  );
}

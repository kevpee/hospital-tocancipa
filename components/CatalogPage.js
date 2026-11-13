"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertCircle, Building2, RefreshCw, Stethoscope } from "lucide-react";
import LayoutWrapper from "@/components/LayoutWrapper";

export default function CatalogPage({ type }) {
  const specialties = type === "specialties";
  const config = specialties
    ? { title: "Especialidades", subtitle: "Catálogo de áreas clínicas", endpoint: "/api/especialidades", icon: Stethoscope, noun: "especialidades" }
    : { title: "Consultorios", subtitle: "Espacios de atención registrados", endpoint: "/api/consultorios", icon: Building2, noun: "consultorios" };
  const Icon = config.icon;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(config.endpoint, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result?.success) throw new Error(result?.message || `No fue posible consultar ${config.noun}.`);
      setItems(Array.isArray(result.data) ? result.data : []);
      setError("");
    } catch (cause) {
      setError(cause.message || `No fue posible consultar ${config.noun}.`);
    } finally {
      setLoading(false);
    }
  }, [config.endpoint, config.noun]);

  // El efecto inicia una consulta externa; sus actualizaciones ocurren al resolver el fetch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  return (
    <LayoutWrapper title={config.title} subtitle={config.subtitle}>
      <div className="catalog-page">
        <section className="catalog-intro">
          <span className="catalog-intro-icon"><Icon size={20} /></span>
          <div><p className="dashboard-kicker">CATÁLOGO CLÍNICO</p><h2>{config.title}</h2><p>{specialties ? "Áreas de atención disponibles para el equipo médico." : "Consultorios y ubicación dentro de la institución."}</p></div>
          <button type="button" className="dashboard-secondary-link" onClick={() => { setLoading(true); setError(""); load(); }} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} /> Actualizar</button>
        </section>
        {error && <div className="dashboard-alert" role="alert"><AlertCircle size={18} /><div><strong>No se pudo cargar el catálogo</strong><p>{error}</p></div><button type="button" onClick={() => { setLoading(true); setError(""); load(); }}>Reintentar</button></div>}
        <section className="catalog-summary"><span>{loading ? "Consultando catálogo…" : `${items.length} ${items.length === 1 ? (specialties ? "especialidad" : "consultorio") : config.noun}`}</span><span>Información sincronizada con el sistema</span></section>
        {loading ? <div className="catalog-grid" aria-label="Cargando catálogo">{[1, 2, 3].map((n) => <div className="catalog-card catalog-skeleton" key={n} />)}</div> : items.length === 0 ? (
          <div className="dashboard-panel empty-state catalog-empty"><span className="empty-state-icon"><Activity size={20} /></span><strong>El catálogo está vacío</strong><p>Cuando haya registros disponibles, aparecerán en esta sección.</p></div>
        ) : (
          <div className="catalog-grid">
            {items.map((item) => (
              <article className="catalog-card" key={item.id}>
                <span className="catalog-card-icon"><Icon size={18} /></span>
                <div className="catalog-card-copy">
                  <p className="catalog-card-eyebrow">{specialties ? "ÁREA MÉDICA" : `CONSULTORIO${item.numero ? ` ${item.numero}` : ""}`}</p>
                  <h3>{specialties ? item.nombre : (item.descripcion || `Consultorio ${item.numero || ""}`)}</h3>
                  {specialties ? <p>{item.descripcion || "Especialidad disponible en el catálogo institucional."}</p> : <p>{item.piso ? `Piso ${item.piso}` : "Ubicación registrada"}</p>}
                </div>
                <span className="catalog-card-id">{specialties ? "Especialidad" : "Consultorio"}</span>
              </article>
            ))}
          </div>
        )}
      </div>
    </LayoutWrapper>
  );
}

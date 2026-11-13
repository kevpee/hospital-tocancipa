"use client";

import { useEffect, useState } from "react";
import { Menu, Database, CalendarDays } from "lucide-react";

function formatColombiaDate() {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Bogota",
  }).format(new Date());
}

export default function Header({ onMenuClick, title, subtitle, actions }) {
  const [connection, setConnection] = useState({ state: "checking", label: "Verificando" });

  useEffect(() => {
    let mounted = true;

    fetch("/api/dashboard")
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (!mounted) return;
        if (response.ok && data.success) {
          setConnection({ state: "connected", label: data.data?.dbLabel || "Base conectada" });
        } else {
          setConnection({ state: "error", label: "Revisar conexión" });
        }
      })
      .catch(() => {
        if (mounted) setConnection({ state: "error", label: "Sin respuesta" });
      });

    return () => { mounted = false; };
  }, []);

  return (
    <header className="workspace-topbar">
      <div className="topbar-heading">
        <button type="button" onClick={onMenuClick} className="topbar-menu-button" aria-label="Abrir navegación">
          <Menu size={19} />
        </button>
        <div className="topbar-title-block">
          <h1>{title || "Hospital Tocancipá"}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      <div className="topbar-tools">
        {actions && <div className="topbar-actions">{actions}</div>}
        <div className={`connection-indicator is-${connection.state}`} title={connection.label}>
          <span className="connection-dot" aria-hidden="true" />
          <Database size={15} aria-hidden="true" />
          <span className="connection-label">{connection.label}</span>
        </div>
        <div className="topbar-date">
          <CalendarDays size={15} aria-hidden="true" />
          <span>{formatColombiaDate()}</span>
        </div>
      </div>
    </header>
  );
}

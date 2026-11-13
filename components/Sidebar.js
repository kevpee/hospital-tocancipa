"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Menu,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import HospitalLogo from "./HospitalLogo";

const navigationGroups = [
  {
    label: "General",
    items: [{ name: "Resumen", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Gestión clínica",
    items: [
      { name: "Pacientes", href: "/pacientes", icon: Users },
      { name: "Equipo médico", href: "/medicos", icon: Stethoscope },
      { name: "Agenda y cupos", href: "/disponibilidad", icon: CalendarClock },
      { name: "Citas médicas", href: "/citas", icon: CalendarDays },
    ],
  },
  {
    label: "Catálogos",
    items: [
      { name: "Especialidades", href: "/especialidades", icon: Activity },
      { name: "Consultorios", href: "/consultorios", icon: Activity },
    ],
  },
];

export default function Sidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) {
  const pathname = usePathname();

  return (
    <>
      {isOpen && (
        <button
          type="button"
          onClick={onClose}
          className="sidebar-overlay"
          aria-label="Cerrar navegación"
        />
      )}

      <aside
        className={`hospital-sidebar ${isOpen ? "is-open" : ""} ${isCollapsed ? "is-collapsed" : ""}`}
        aria-label="Navegación principal"
      >
        <div className="sidebar-brand-row">
          <HospitalLogo collapsed={isCollapsed} className="sidebar-brand" />
          <button type="button" onClick={onClose} className="sidebar-close" aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-navigation">
          {navigationGroups.map((group) => (
            <section className="sidebar-group" key={group.label} aria-label={group.label}>
              {!isCollapsed && <p className="sidebar-group-label">{group.label}</p>}
              <div className="sidebar-links">
                {group.items.map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`sidebar-link ${active ? "is-active" : ""} ${isCollapsed ? "is-icon-only" : ""}`}
                      title={isCollapsed ? item.name : undefined}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon size={18} strokeWidth={active ? 2.1 : 1.8} aria-hidden="true" />
                      {!isCollapsed && <span>{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!isCollapsed && (
            <div className="sidebar-status-card">
              <span className="sidebar-status-icon"><Activity size={16} /></span>
              <span className="sidebar-status-copy">
                <strong>Hospital Tocancipá</strong>
                <small>Gestión de atención</small>
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="sidebar-collapse"
            aria-label={isCollapsed ? "Expandir navegación" : "Contraer navegación"}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            {!isCollapsed && <span>Contraer menú</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

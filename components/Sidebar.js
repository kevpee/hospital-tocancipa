"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarDays,
  CalendarClock,
  Database,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import HospitalLogo from "./HospitalLogo";

const navigationItems = [
  {
    name: "Inicio",
    href: "/",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: "Pacientes",
    href: "/pacientes",
    icon: Users,
    badge: null,
  },
  {
    name: "Médicos",
    href: "/medicos",
    icon: UserCheck,
    badge: null,
  },
  {
    name: "Horarios y Disponibilidad",
    href: "/disponibilidad",
    icon: CalendarClock,
    badge: "Agenda",
  },
  {
    name: "Citas Médicas",
    href: "/citas",
    icon: CalendarDays,
    badge: null,
  },
];

export default function Sidebar({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay para móviles */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Barra lateral */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200/90 transition-all duration-300 ease-in-out lg:static ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "lg:w-20" : "lg:w-72"} w-72`}
      >
        {/* Cabecera del Sidebar con Logo */}
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-5">
          <HospitalLogo collapsed={isCollapsed} />

          {/* Botón cerrar en móvil */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl lg:hidden"
            aria-label="Cerrar navegación"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menú de Navegación Principal */}
        <div className="flex-1 overflow-y-auto px-3.5 py-6">
          {!isCollapsed && (
            <p className="px-3 pb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Módulos Clínicos
            </p>
          )}

          <nav className="space-y-1.5">
            {navigationItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  title={isCollapsed ? item.name : undefined}
                  className={`group relative flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    isActive
                      ? "bg-blue-50/90 text-blue-700 shadow-xs font-semibold ring-1 ring-blue-500/20"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  } ${isCollapsed ? "justify-center px-0" : ""}`}
                >
                  {/* Barra activa indicadora a la izquierda */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-blue-600" />
                  )}

                  <Icon
                    className={`h-5 w-5 shrink-0 transition-colors ${
                      isActive
                        ? "text-blue-600 stroke-[2.2]"
                        : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />

                  {!isCollapsed && (
                    <div className="flex flex-1 items-center justify-between min-w-0">
                      <span className="truncate">{item.name}</span>
                      {item.badge && (
                        <span className="rounded-md bg-blue-100/70 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Botón Plegar / Desplegar en Escritorio */}
        <div className="hidden lg:flex items-center justify-end px-3.5 py-2 border-t border-slate-100">
          <button
            onClick={onToggleCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            title={isCollapsed ? "Expandir menú" : "Plegar menú"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Tarjeta de estado de conexión */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/60">
          {isCollapsed ? (
            <div
              className="flex justify-center p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs"
              title="Base de datos activa: Cloud Firestore"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Database className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="truncate">Cloud Firestore</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  Conexión en línea activa
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

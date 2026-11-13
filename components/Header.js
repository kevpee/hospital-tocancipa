"use client";

import { Menu, Database, ShieldCheck, HeartPulse, PlusCircle, Users } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Header({
  onMenuClick,
  title,
  subtitle,
  actions,
}) {
  const [fechaActual, setFechaActual] = useState("");
  const [dbLabel, setDbLabel] = useState("Cloud Firestore");

  useEffect(() => {
    const fecha = new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    setFechaActual(fecha.charAt(0).toUpperCase() + fecha.slice(1));

    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((res) => {
        if (res.data?.dbLabel) {
          setDbLabel(res.data.dbLabel);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 sm:px-8 backdrop-blur-md">
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onMenuClick}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden shrink-0 transition"
          aria-label="Abrir navegación"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#0F172A] truncate">
            {title || "Hospital Tocancipá"}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Acciones personalizadas opcionales de cabecera */}
        {actions}

        {/* Indicador de Base de Datos Activa */}
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 border border-slate-200/90 text-xs font-semibold text-slate-700 shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-500 font-normal">BD:</span>
          <span>{dbLabel}</span>
        </div>

        {/* Fecha y estado institucional */}
        <div className="hidden md:flex flex-col text-right pl-2 border-l border-slate-200">
          <span className="text-[11px] font-bold text-slate-800 flex items-center justify-end gap-1">
            <HeartPulse className="h-3.5 w-3.5 text-blue-600" />
            Hospital Tocancipá
          </span>
          <span className="text-[10px] text-slate-400 capitalize">
            {fechaActual}
          </span>
        </div>
      </div>
    </header>
  );
}

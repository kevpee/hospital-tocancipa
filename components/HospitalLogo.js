"use client";

import Link from "next/link";

export default function HospitalLogo({ collapsed = false, className = "" }) {
  return (
    <Link
      href="/"
      className={`group flex items-center gap-3 transition-opacity hover:opacity-95 ${className}`}
      title="Hospital Tocancipá - Sistema Integral de Gestión Médica"
    >
      {/* Isotipo Médico Moderno */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#155EEF] to-[#0284C7] text-white shadow-md shadow-blue-500/20 ring-1 ring-white/20 transition-transform group-hover:scale-[1.02]">
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Cruz Médica Estilizada con pulso integrado */}
          <path d="M12 4v16M4 12h16" />
          <circle cx="12" cy="12" r="3" className="fill-white/30 stroke-none" />
        </svg>
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#06B6D4] ring-2 ring-white" />
      </div>

      {!collapsed && (
        <div className="flex flex-col min-w-0 transition-opacity duration-200">
          <span className="truncate text-[15px] font-extrabold tracking-tight text-[#0F172A] leading-tight">
            Hospital Tocancipá
          </span>
          <span className="truncate text-[11px] font-semibold text-blue-600 tracking-tight leading-tight mt-0.5">
            Sistema Integral de Gestión Médica
          </span>
        </div>
      )}
    </Link>
  );
}

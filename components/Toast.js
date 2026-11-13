"use client";

import { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export default function Toast({ message, type = "success", onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const isSuccess = type === "success";
  const isError = type === "error";

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div
        className={`flex items-start gap-3 rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all ${
          isSuccess
            ? "bg-white/95 border-emerald-200 text-slate-800 ring-1 ring-emerald-500/20"
            : isError
            ? "bg-white/95 border-rose-200 text-slate-800 ring-1 ring-rose-500/20"
            : "bg-white/95 border-blue-200 text-slate-800 ring-1 ring-blue-500/20"
        }`}
      >
        <div
          className={`shrink-0 rounded-xl p-1.5 ${
            isSuccess
              ? "bg-emerald-50 text-emerald-600"
              : isError
              ? "bg-rose-50 text-rose-600"
              : "bg-blue-50 text-blue-600"
          }`}
        >
          {isSuccess && <CheckCircle2 className="h-5 w-5" />}
          {isError && <AlertCircle className="h-5 w-5" />}
          {!isSuccess && !isError && <Info className="h-5 w-5" />}
        </div>

        <div className="flex-1 pr-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {isSuccess ? "Operación Exitosa" : isError ? "Aviso del Sistema" : "Información"}
          </p>
          <p className="mt-0.5 text-sm font-medium text-slate-700 leading-snug">
            {message}
          </p>
        </div>

        <button
          onClick={onClose}
          className="shrink-0 p-1 text-slate-400 hover:text-slate-700 rounded-lg transition"
          aria-label="Cerrar notificación"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

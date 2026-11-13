import Link from "next/link";
import { Cross, Activity } from "lucide-react";

export default function HospitalLogo({ collapsed = false, className = "" }) {
  return (
    <Link
      href="/"
      className={`hospital-logo ${collapsed ? "is-collapsed" : ""} ${className}`}
      title="Hospital Tocancipá"
      aria-label="Hospital Tocancipá, ir al resumen"
    >
      <span className="hospital-logo-mark" aria-hidden="true">
        <Cross size={22} strokeWidth={2.2} />
        <Activity className="hospital-logo-pulse" size={13} strokeWidth={2.1} />
      </span>
      {!collapsed && (
        <span className="hospital-logo-copy">
          <strong>Hospital Tocancipá</strong>
          <small>Gestión clínica</small>
        </span>
      )}
    </Link>
  );
}

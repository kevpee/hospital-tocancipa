import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Hospital Tocancipá | Sistema Integral de Gestión Médica",
  description:
    "Plataforma SaaS hospitalaria de gestión de citas médicas, cuerpo médico, pacientes y agenda de disponibilidad - Hospital Tocancipá.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F8FAFC] text-[#0F172A] selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}

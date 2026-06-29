import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navbar from "./Navbar";
import { getSesion } from "@/lib/session";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fiambrería · Cuentas corrientes",
  description: "Carga de viandas, consumos y facturación",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sesion = await getSesion();
  return (
    <html lang="es" className={inter.variable}>
      <body>
        {sesion && <Navbar sesion={sesion} />}
        <main className="container">{children}</main>
      </body>
    </html>
  );
}

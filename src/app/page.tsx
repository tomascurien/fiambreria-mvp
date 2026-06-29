import Link from "next/link";
import { redirect } from "next/navigation";
import { getSesion } from "@/lib/session";
import BrandLogo from "./BrandLogo";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sesion = await getSesion();
  // Si ya está logueado, va directo a su área. Si no, ve la portada.
  if (sesion) redirect(sesion.rol === "dueno" ? "/dueno" : "/empleados");

  return (
    <div className="portada">
      <BrandLogo />
      <h1>La Esquina del Fiambre</h1>
      <p className="tagline">
        Cuentas corrientes del negocio. Cargá los consumos del día y calculá la facturación de cada
        cliente en segundos.
      </p>
      <Link href="/login" className="btn portada-cta">
        Ingresar
      </Link>
    </div>
  );
}

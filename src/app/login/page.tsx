import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSesion } from "@/lib/session";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const sesion = await getSesion();
  if (sesion) redirect(sesion.rol === "dueno" ? "/dueno" : "/empleados");

  // Solo empleados (el dueño no aparece en la lista; entra con usuario + contraseña).
  const empleados = await prisma.empleado.findMany({
    where: { activo: true, rol: "empleado" },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <div className="hero" style={{ padding: "6px 0 18px" }}>
          <h1 style={{ fontSize: 24 }}>La Esquina del Fiambre</h1>
          <p style={{ marginTop: 6 }}>Ingresá para cargar consumos o gestionar el negocio.</p>
        </div>
        <LoginForm empleados={empleados} />
      </div>
    </div>
  );
}

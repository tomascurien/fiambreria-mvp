import { redirect } from "next/navigation";
import { getSesion } from "@/lib/session";

export const dynamic = "force-dynamic";

// La home solo enruta según la sesión.
export default async function Home() {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  redirect(sesion.rol === "dueno" ? "/dueno" : "/empleados");
}

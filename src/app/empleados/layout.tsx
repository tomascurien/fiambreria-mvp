import { requireSesion } from "@/lib/session";

export default async function EmpleadosLayout({ children }: { children: React.ReactNode }) {
  await requireSesion();
  return <>{children}</>;
}

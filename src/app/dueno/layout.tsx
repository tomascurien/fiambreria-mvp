import { requireDueno } from "@/lib/session";

// Protege todo /dueno/* (Dashboard, Clientes, Productos, Facturación, Auditoría).
export default async function DuenoLayout({ children }: { children: React.ReactNode }) {
  await requireDueno();
  return <>{children}</>;
}

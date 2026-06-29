import Link from "next/link";
import { prisma } from "@/lib/db";
import { fechaHora } from "@/lib/format";

export const dynamic = "force-dynamic";

const ENTIDADES = [
  { value: "", label: "Todo" },
  { value: "consumo", label: "Consumos" },
  { value: "producto", label: "Productos" },
  { value: "cliente", label: "Clientes" },
  { value: "factura", label: "Facturas" },
  { value: "sesion", label: "Sesiones" },
];

const BADGE: Record<string, string> = {
  crear: "consumo",
  editar: "cargo",
  facturar: "pend",
  borrar: "del",
  anular: "del",
  login: "consumo",
  logout: "facturado",
  login_fallido: "del",
};

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ entidad?: string }>;
}) {
  const { entidad } = await searchParams;
  const where = entidad ? { entidad } : {};

  const eventos = await prisma.auditoria.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <div className="page-head">
        <h1>Auditoría</h1>
        <p>Quién hizo cada cambio y cuándo. Se muestran los últimos 200 eventos.</p>
      </div>

      <div className="card">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {ENTIDADES.map((e) => {
            const activo = (entidad ?? "") === e.value;
            const href = e.value ? `/dueno/auditoria?entidad=${e.value}` : "/dueno/auditoria";
            return (
              <Link
                key={e.value}
                href={href}
                className={`btn sm ${activo ? "" : "ghost"}`}
              >
                {e.label}
              </Link>
            );
          })}
        </div>

        {eventos.length === 0 ? (
          <div className="empty">No hay eventos registrados.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Empleado</th>
                <th>Acción</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((ev) => (
                <tr key={ev.id}>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>
                    {fechaHora(ev.createdAt)}
                  </td>
                  <td style={{ fontWeight: 600 }}>{ev.empleadoNombre}</td>
                  <td>
                    <span className={`badge ${BADGE[ev.accion] ?? "facturado"}`}>{ev.accion}</span>{" "}
                    <span className="muted">{ev.entidad}</span>
                  </td>
                  <td>{ev.detalle ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

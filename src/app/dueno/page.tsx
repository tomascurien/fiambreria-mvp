import Link from "next/link";
import { prisma } from "@/lib/db";
import { pesos, fecha } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const finHoy = new Date(inicioHoy.getTime() + 86400000);
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const [pendientes, consumosHoy, facturadoMes, ultimos] = await Promise.all([
    prisma.consumo.findMany({
      where: { facturaId: null },
      select: { cantidad: true, precioUnitario: true, clienteId: true },
    }),
    prisma.consumo.count({ where: { fecha: { gte: inicioHoy, lt: finHoy } } }),
    prisma.factura.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: inicioMes } },
    }),
    prisma.consumo.findMany({
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
      take: 8,
      include: { cliente: true, producto: true },
    }),
  ]);

  const totalPendiente = pendientes.reduce((a, c) => a + c.cantidad * c.precioUnitario, 0);
  const clientesPendientes = new Set(pendientes.map((c) => c.clienteId)).size;
  const facturadoEsteMes = facturadoMes._sum.total ?? 0;

  return (
    <div>
      <div className="page-head">
        <h1>Dashboard</h1>
        <p>El estado del negocio de un vistazo.</p>
      </div>

      <div className="dash-grid">
        <div className="stat neto">
          <div className="label">Pendiente de facturar</div>
          <div className="value">{pesos(totalPendiente)}</div>
        </div>
        <div className="stat">
          <div className="label">Clientes pendientes</div>
          <div className="value">{clientesPendientes}</div>
        </div>
        <div className="stat">
          <div className="label">Consumos hoy</div>
          <div className="value">{consumosHoy}</div>
        </div>
        <div className="stat favor">
          <div className="label">Facturado este mes</div>
          <div className="value">{pesos(facturadoEsteMes)}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">Accesos rápidos</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Link href="/dueno/facturacion" className="btn">
            Facturar período →
          </Link>
          <Link href="/dueno/clientes" className="btn ghost">
            Clientes →
          </Link>
          <Link href="/dueno/productos" className="btn ghost">
            Productos →
          </Link>
          <Link href="/dueno/auditoria" className="btn ghost">
            Auditoría →
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="flex-between">
          <div className="card-title" style={{ marginBottom: 0 }}>
            Últimos consumos
          </div>
          <Link href="/dueno/consumos" className="btn ghost sm">
            Ver más →
          </Link>
        </div>
        {ultimos.length === 0 ? (
          <div className="empty">Todavía no hay consumos.</div>
        ) : (
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Producto</th>
                <th className="num">Cant.</th>
                <th className="num">Subtotal</th>
                <th>Cargó</th>
              </tr>
            </thead>
            <tbody>
              {ultimos.map((c) => (
                <tr key={c.id}>
                  <td className="muted">{fecha(c.fecha)}</td>
                  <td>{c.cliente.nombre}</td>
                  <td>{c.producto?.nombre ?? "Consumo"}</td>
                  <td className="num">{c.cantidad}</td>
                  <td className="num">{pesos(c.cantidad * c.precioUnitario)}</td>
                  <td className="muted">{c.creadoPor ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/db";
import { pesos, fecha, aInputDate } from "@/lib/format";
import FacturarPeriodo from "./FacturarPeriodo";

export const dynamic = "force-dynamic";

export default async function FacturacionPage() {
  const [clientes, pendientes, cierres] = await Promise.all([
    prisma.cliente.findMany({
      orderBy: { nombre: "asc" },
      include: { consumos: { where: { facturaId: null } } },
    }),
    prisma.consumo.findMany({
      where: { facturaId: null },
      select: { clienteId: true, fecha: true, cantidad: true, precioUnitario: true },
    }),
    prisma.cierrePeriodo.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const filas = clientes
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      activo: c.activo,
      pendiente: c.consumos.reduce((a, m) => a + m.cantidad * m.precioUnitario, 0),
      cant: c.consumos.length,
    }))
    .filter((f) => f.cant > 0);

  const pendientesLite = pendientes.map((p) => ({
    clienteId: p.clienteId,
    dia: aInputDate(p.fecha),
    monto: p.cantidad * p.precioUnitario,
  }));

  const hoy = new Date();
  const hace20 = new Date(hoy);
  hace20.setDate(hace20.getDate() - 20);

  return (
    <div>
      <div className="page-head">
        <h1>Facturación por período</h1>
        <p>Calculá las facturas de todos los clientes con consumos pendientes, de una sola vez.</p>
      </div>

      <div className="grid-2">
        {/* Cierre de período */}
        <div className="card">
          <div className="card-title">Cerrar período</div>
          <FacturarPeriodo
            pendientes={pendientesLite}
            desdeDefault={aInputDate(hace20)}
            hastaDefault={aInputDate(hoy)}
          />

          {cierres.length > 0 && (
            <>
              <div className="divider" />
              <div className="card-title" style={{ marginBottom: 8 }}>
                Últimos cierres
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Período</th>
                    <th className="num">Facturas</th>
                    <th className="num">Total</th>
                    <th>Por</th>
                  </tr>
                </thead>
                <tbody>
                  {cierres.map((c) => (
                    <tr key={c.id}>
                      <td className="muted">
                        {fecha(c.fechaDesde)} → {fecha(c.fechaHasta)}
                      </td>
                      <td className="num">{c.cantFacturas}</td>
                      <td className="num">{pesos(c.totalFacturado)}</td>
                      <td className="muted">{c.empleadoNombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Saldos pendientes */}
        <div className="card">
          <div className="card-title">Clientes con saldo pendiente ({filas.length})</div>
          {filas.length === 0 ? (
            <div className="empty">No hay consumos pendientes de facturar.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className="num">Consumos</th>
                  <th className="num">Pendiente</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.id}>
                    <td>
                      {f.nombre}{" "}
                      {!f.activo && <span className="badge facturado">inactivo</span>}
                    </td>
                    <td className="num">{f.cant}</td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {pesos(f.pendiente)}
                    </td>
                    <td className="num">
                      <Link className="btn ghost sm" href={`/dueno/clientes/${f.id}`}>
                        Abrir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

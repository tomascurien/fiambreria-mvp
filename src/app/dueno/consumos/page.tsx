import Link from "next/link";
import { prisma } from "@/lib/db";
import { pesos, fecha } from "@/lib/format";

export const dynamic = "force-dynamic";

const PASO = 40;
const MAX = 5000;

export default async function ConsumosPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const { n } = await searchParams;
  const limite = Math.min(Math.max(parseInt(n ?? "", 10) || PASO, PASO), MAX);

  const [consumos, total] = await Promise.all([
    prisma.consumo.findMany({
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
      take: limite + 1,
      include: { cliente: true, producto: true },
    }),
    prisma.consumo.count(),
  ]);
  const hayMas = consumos.length > limite;
  const lista = hayMas ? consumos.slice(0, limite) : consumos;

  return (
    <div>
      <div className="page-head">
        <Link href="/dueno" className="btn-link">
          ← Volver al dashboard
        </Link>
        <h1 style={{ marginTop: 6 }}>Historial de consumos</h1>
        <p>Todos los consumos cargados, del más reciente al más antiguo.</p>
      </div>

      <div className="card">
        {lista.length === 0 ? (
          <div className="empty">Todavía no hay consumos.</div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Producto</th>
                  <th className="num">Cant.</th>
                  <th className="num">Subtotal</th>
                  <th>Cargó</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id}>
                    <td className="muted">{fecha(c.fecha)}</td>
                    <td>{c.cliente.nombre}</td>
                    <td>
                      {c.producto?.nombre ?? "Consumo"}
                      {c.observaciones && <div className="cliente-sub">{c.observaciones}</div>}
                    </td>
                    <td className="num">{c.cantidad}</td>
                    <td className="num">{pesos(c.cantidad * c.precioUnitario)}</td>
                    <td className="muted">{c.creadoPor ?? "—"}</td>
                    <td className="num">
                      {c.facturaId ? (
                        <span className="badge facturado">facturado</span>
                      ) : (
                        <span className="badge pend">pendiente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="vermas">
              <span className="muted">
                Mostrando {lista.length} de {total}
              </span>
              {hayMas && (
                <Link href={`/dueno/consumos?n=${limite + PASO}`} scroll={false} className="btn ghost sm">
                  Ver más
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

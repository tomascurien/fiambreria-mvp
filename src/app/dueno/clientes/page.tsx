import Link from "next/link";
import { prisma } from "@/lib/db";
import { labelDe, FORMAS_PAGO } from "@/lib/constants";
import ClienteForm from "./ClienteForm";

export const dynamic = "force-dynamic";

const PASO = 30;
const MAX = 2000;

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const { n } = await searchParams;
  const limite = Math.min(Math.max(parseInt(n ?? "", 10) || PASO, PASO), MAX);

  const [clientesRaw, total] = await Promise.all([
    prisma.cliente.findMany({ orderBy: { nombre: "asc" }, take: limite + 1 }),
    prisma.cliente.count(),
  ]);
  const hayMas = clientesRaw.length > limite;
  const clientes = hayMas ? clientesRaw.slice(0, limite) : clientesRaw;

  return (
    <div>
      <div className="page-head">
        <h1>Gestión de clientes</h1>
        <p>Alta, datos fiscales y condiciones de facturación de cada cliente.</p>
      </div>

      <div className="grid-2">
        {/* Alta */}
        <div className="card">
          <div className="card-title">Agregar cliente</div>
          <ClienteForm />
        </div>

        {/* Listado */}
        <div className="card">
          <div className="card-title">Clientes ({total})</div>
          {clientes.length === 0 ? (
            <div className="empty">Todavía no hay clientes.</div>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Forma de pago</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr key={c.id} style={c.activo ? undefined : { opacity: 0.55 }}>
                      <td>
                        <div className="cliente-name">
                          {c.nombre}{" "}
                          {!c.activo && <span className="badge facturado">inactivo</span>}
                        </div>
                        <div className="cliente-sub">
                          {c.cuit ? `CUIT ${c.cuit}` : "Sin CUIT"}
                          {c.condicionIva ? ` · ${c.condicionIva}` : ""}
                        </div>
                      </td>
                      <td className="muted">{labelDe(FORMAS_PAGO, c.formaPago)}</td>
                      <td className="num">
                        <Link className="btn ghost sm" href={`/dueno/clientes/${c.id}`}>
                          Abrir →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="vermas">
                <span className="muted">
                  Mostrando {clientes.length} de {total}
                </span>
                {hayMas && (
                  <Link href={`/dueno/clientes?n=${limite + PASO}`} scroll={false} className="btn ghost sm">
                    Ver más
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/db";
import { labelDe, PERIODICIDADES, FORMAS_PAGO } from "@/lib/constants";
import ClienteForm from "./ClienteForm";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({ orderBy: { nombre: "asc" } });

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
          <div className="card-title">Clientes ({clientes.length})</div>
          {clientes.length === 0 ? (
            <div className="empty">Todavía no hay clientes.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Facturación</th>
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
                    <td className="muted">
                      {labelDe(PERIODICIDADES, c.periodicidad)} ·{" "}
                      {labelDe(FORMAS_PAGO, c.formaPago)}
                    </td>
                    <td className="num">
                      <Link className="btn ghost sm" href={`/dueno/clientes/${c.id}`}>
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

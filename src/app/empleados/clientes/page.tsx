import { prisma } from "@/lib/db";
import ClienteForm from "@/app/dueno/clientes/ClienteForm";

export const dynamic = "force-dynamic";

export default async function EmpleadoClientesPage() {
  const clientes = await prisma.cliente.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, cuit: true, telefono: true },
  });

  return (
    <div>
      <div className="page-head">
        <h1>Nuevo cliente</h1>
        <p>Cargá el cliente completo: nombre, contacto y datos fiscales.</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Agregar cliente</div>
          <ClienteForm />
        </div>

        <div className="card">
          <div className="card-title">Clientes ({clientes.length})</div>
          {clientes.length === 0 ? (
            <div className="empty">Todavía no hay clientes.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>CUIT</th>
                  <th>Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nombre}</td>
                    <td className="muted">{c.cuit || "—"}</td>
                    <td className="muted">{c.telefono || "—"}</td>
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

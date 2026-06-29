import { prisma } from "@/lib/db";
import { aInputDate } from "@/lib/format";
import CargaConsumo from "./CargaConsumo";
import ConsumoRow from "./ConsumoRow";

export const dynamic = "force-dynamic";

export default async function EmpleadosPage() {
  const [clientes, productos, consumos] = await Promise.all([
    prisma.cliente.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.producto.findMany({
      where: { activo: true },
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, categoria: true, precio: true },
    }),
    prisma.consumo.findMany({
      // Fecha descendente y, dentro del mismo día, lo último cargado primero (id desc).
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
      take: 30,
      include: { cliente: true, producto: true },
    }),
  ]);

  const hoy = aInputDate(new Date());

  return (
    <div>
      <div className="page-head">
        <h1>Carga de consumos</h1>
        <p>
          Elegí el cliente, el producto y la cantidad. El precio lo pone el sistema según el
          producto, no hace falta tipear montos.
        </p>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-title">Nuevo consumo</div>
        <CargaConsumo clientes={clientes} productos={productos} hoy={hoy} />
      </div>

      {/* ---- Últimos consumos ---- */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">Últimos consumos cargados</div>
        {consumos.length === 0 ? (
          <div className="empty">Todavía no hay consumos.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Producto</th>
                <th className="num">Cant.</th>
                <th className="num">Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {consumos.map((c) => (
                <ConsumoRow
                  key={c.id}
                  c={{
                    id: c.id,
                    fecha: c.fecha.toISOString(),
                    clienteNombre: c.cliente.nombre,
                    productoNombre: c.producto?.nombre ?? "Consumo",
                    cantidad: c.cantidad,
                    precioUnitario: c.precioUnitario,
                    observaciones: c.observaciones,
                    facturaId: c.facturaId,
                  }}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

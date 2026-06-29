import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { crearFactura, anularFactura, toggleClienteActivo } from "@/lib/actions";
import { pesos, fecha, aInputDate } from "@/lib/format";
import { labelDe, FORMAS_PAGO } from "@/lib/constants";
import ClienteForm from "../ClienteForm";

export const dynamic = "force-dynamic";

export default async function ClienteDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clienteId = Number(id);

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: {
      consumos: {
        where: { facturaId: null },
        orderBy: { fecha: "asc" },
        include: { producto: true },
      },
      facturas: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!cliente) notFound();

  const pend = cliente.consumos;
  const sub = (c: { cantidad: number; precioUnitario: number }) => c.cantidad * c.precioUnitario;
  const totalPend = pend.reduce((a, c) => a + sub(c), 0);

  // Preset "últimos 20 días"
  const hoy = new Date();
  const hace20 = new Date(hoy);
  hace20.setDate(hace20.getDate() - 20);
  const pend20 = pend.filter((c) => new Date(c.fecha) >= hace20);
  const total20 = pend20.reduce((a, c) => a + sub(c), 0);

  return (
    <div>
      <div className="page-head">
        <Link href="/dueno/clientes" className="btn-link">
          ← Volver a clientes
        </Link>
        <div className="flex-between" style={{ marginTop: 6 }}>
          <h1>{cliente.nombre}</h1>
          <form action={toggleClienteActivo}>
            <input type="hidden" name="id" value={cliente.id} />
            <button className="btn ghost sm" type="submit">
              {cliente.activo ? "Marcar inactivo" : "Reactivar"}
            </button>
          </form>
        </div>
        <p>
          {cliente.razonSocial || "Sin razón social"} ·{" "}
          {cliente.cuit ? `CUIT ${cliente.cuit}` : "Sin CUIT"} ·{" "}
          {cliente.condicionIva || "IVA sin especificar"}
        </p>
        <p className="muted" style={{ marginTop: 2 }}>
          {labelDe(FORMAS_PAGO, cliente.formaPago)} · {cliente.email || "sin email"} ·{" "}
          {cliente.telefono || "sin teléfono"}
        </p>

        <details className="inline-edit">
          <summary>Editar datos del cliente</summary>
          <div style={{ marginTop: 10 }}>
            <ClienteForm
              cliente={{
                id: cliente.id,
                nombre: cliente.nombre,
                razonSocial: cliente.razonSocial,
                cuit: cliente.cuit,
                condicionIva: cliente.condicionIva,
                email: cliente.email,
                telefono: cliente.telefono,
                formaPago: cliente.formaPago,
              }}
            />
          </div>
        </details>
      </div>

      {/* ---- Saldo pendiente ---- */}
      <div className="card">
        <div className="card-title">Saldo pendiente de facturar</div>
        <div className="stats">
          <div className="stat neto">
            <div className="label">Total pendiente</div>
            <div className="value">{pesos(totalPend)}</div>
          </div>
          <div className="stat">
            <div className="label">Consumos pendientes</div>
            <div className="value">{pend.length}</div>
          </div>
          <div className="stat">
            <div className="label">Últimos 20 días</div>
            <div className="value">{pesos(total20)}</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* ---- Generar factura ---- */}
        <div className="card">
          <div className="card-title">Generar factura</div>
          {pend.length === 0 ? (
            <p className="muted">No hay consumos pendientes para facturar.</p>
          ) : (
            <>
              <p className="muted" style={{ marginTop: 0 }}>
                Últimos 20 días: <strong>{pesos(total20)}</strong> ({pend20.length} consumos). Todo
                lo pendiente: <strong>{pesos(totalPend)}</strong> ({pend.length} consumos).
              </p>
              <form action={crearFactura}>
                <input type="hidden" name="clienteId" value={cliente.id} />
                <div className="row">
                  <div className="field">
                    <label>Desde</label>
                    <input name="fechaDesde" type="date" defaultValue={aInputDate(hace20)} />
                  </div>
                  <div className="field">
                    <label>Hasta</label>
                    <input name="fechaHasta" type="date" defaultValue={aInputDate(hoy)} />
                  </div>
                </div>
                <p className="muted" style={{ fontSize: 13 }}>
                  Dejá las dos fechas vacías para facturar <strong>todo lo pendiente</strong>, sin
                  importar la antigüedad.
                </p>
                <button className="btn full" type="submit">
                  Generar factura
                </button>
              </form>
            </>
          )}
        </div>

        {/* ---- Consumos pendientes ---- */}
        <div className="card">
          <div className="card-title">Consumos pendientes ({pend.length})</div>
          {pend.length === 0 ? (
            <div className="empty">Todo facturado.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th className="num">Cant.</th>
                  <th className="num">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {pend.map((c) => (
                  <tr key={c.id}>
                    <td className="muted">{fecha(c.fecha)}</td>
                    <td>
                      {c.producto?.nombre ?? "Consumo"}
                      {c.observaciones && <div className="cliente-sub">{c.observaciones}</div>}
                    </td>
                    <td className="num">{c.cantidad}</td>
                    <td className="num">{pesos(sub(c))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ---- Historial de facturas ---- */}
      <div className="card">
        <div className="card-title">Historial de facturas</div>
        {cliente.facturas.length === 0 ? (
          <div className="empty">Todavía no se generó ninguna factura.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Factura</th>
                <th>Período</th>
                <th className="num">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cliente.facturas.map((f) => (
                <tr key={f.id}>
                  <td>
                    <strong>#{String(f.id).padStart(4, "0")}</strong>
                    <div className="cliente-sub">emitida {fecha(f.createdAt)}</div>
                  </td>
                  <td className="muted">
                    {fecha(f.fechaDesde)} → {fecha(f.fechaHasta)}
                  </td>
                  <td className="num" style={{ fontWeight: 700 }}>
                    {pesos(f.total)}
                  </td>
                  <td className="num">
                    <form action={anularFactura}>
                      <input type="hidden" name="id" value={f.id} />
                      <button className="btn danger sm" type="submit">
                        Anular
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

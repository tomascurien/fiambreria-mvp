"use client";

import { useActionState, useMemo, useState } from "react";
import { facturarPeriodo, type ResultadoPeriodo } from "@/lib/actions";
import { pesos } from "@/lib/format";

const initial: ResultadoPeriodo = { resultados: [], cantOk: 0, totalFacturado: 0 };

type PendienteLite = { clienteId: number; dia: string; monto: number };

export default function FacturarPeriodo({
  pendientes,
  desdeDefault,
  hastaDefault,
}: {
  pendientes: PendienteLite[];
  desdeDefault: string;
  hastaDefault: string;
}) {
  const [state, action, pending] = useActionState(facturarPeriodo, initial);
  const [desde, setDesde] = useState(desdeDefault);
  const [hasta, setHasta] = useState(hastaDefault);

  // Preview en vivo: clientes con pendientes y monto dentro del rango.
  const preview = useMemo(() => {
    const enRango = pendientes.filter(
      (p) => (!desde || p.dia >= desde) && (!hasta || p.dia <= hasta),
    );
    const clientes = new Set(enRango.map((p) => p.clienteId)).size;
    const total = enRango.reduce((a, p) => a + p.monto, 0);
    return { clientes, total };
  }, [pendientes, desde, hasta]);

  return (
    <div>
      <form
        action={action}
        onSubmit={(e) => {
          if (
            !confirm(
              `Vas a calcular ${preview.clientes} factura(s) por ${pesos(
                preview.total,
              )}. ¿Confirmás el cierre del período?`,
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <div className="row">
          <div className="field">
            <label>Desde</label>
            <input
              name="fechaDesde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Hasta</label>
            <input
              name="fechaHasta"
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
        </div>

        <div className="subtotal-box">
          <span>
            {preview.clientes} cliente{preview.clientes === 1 ? "" : "s"} con pendientes en el período
          </span>
          <strong>{pesos(preview.total)}</strong>
        </div>

        <button className="btn full" type="submit" disabled={pending || preview.clientes === 0}>
          {pending ? "Calculando…" : `Calcular todas (${preview.clientes})`}
        </button>
      </form>

      {/* Resultados de la última corrida */}
      {state.resultados.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="alert ok">
            {state.cantOk} factura(s) calculada(s) · {pesos(state.totalFacturado)}
          </div>
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th className="num">Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {state.resultados.map((r, i) => (
                <tr key={i}>
                  <td>{r.clienteNombre}</td>
                  <td className="num">{r.ok ? pesos(r.total) : "—"}</td>
                  <td>
                    {r.ok ? (
                      <span className="badge consumo">Factura OK</span>
                    ) : (
                      <span className="badge cargo">{r.error ?? "Error"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { editarConsumo, borrarConsumo } from "@/lib/actions";
import { pesos, fecha } from "@/lib/format";

type Consumo = {
  id: number;
  fecha: string;
  clienteNombre: string;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  observaciones: string | null;
  facturaId: number | null;
};

export default function ConsumoRow({ c }: { c: Consumo }) {
  const [editing, setEditing] = useState(false);
  const [cantidad, setCantidad] = useState(String(c.cantidad));
  const [observaciones, setObservaciones] = useState(c.observaciones ?? "");
  const [pending, start] = useTransition();

  const subtotal = c.cantidad * c.precioUnitario;

  function guardar() {
    const fd = new FormData();
    fd.set("id", String(c.id));
    fd.set("cantidad", cantidad);
    fd.set("observaciones", observaciones);
    start(async () => {
      await editarConsumo(fd);
      setEditing(false);
    });
  }

  function borrar() {
    if (!confirm("¿Borrar este consumo? No se puede deshacer.")) return;
    const fd = new FormData();
    fd.set("id", String(c.id));
    start(async () => {
      await borrarConsumo(fd);
    });
  }

  // Consumo ya facturado: solo lectura.
  if (c.facturaId) {
    return (
      <tr>
        <td className="muted">{fecha(c.fecha)}</td>
        <td>{c.clienteNombre}</td>
        <td>
          {c.productoNombre}
          {c.observaciones && <div className="cliente-sub">{c.observaciones}</div>}
        </td>
        <td className="num">{c.cantidad}</td>
        <td className="num">{pesos(subtotal)}</td>
        <td className="num">
          <span className="badge facturado">facturado</span>
        </td>
      </tr>
    );
  }

  if (editing) {
    const subtotalEdit = (parseInt(cantidad, 10) || 0) * c.precioUnitario;
    return (
      <tr>
        <td className="muted">{fecha(c.fecha)}</td>
        <td>{c.clienteNombre}</td>
        <td>
          <div>{c.productoNombre}</div>
          <input
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Observaciones"
            style={{ padding: "6px 8px", marginTop: 4 }}
          />
        </td>
        <td className="num">
          <input
            type="number"
            min="1"
            step="1"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            style={{ padding: "6px 8px", maxWidth: 70, textAlign: "right" }}
          />
        </td>
        <td className="num">{pesos(subtotalEdit)}</td>
        <td className="num">
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button className="btn sm" onClick={guardar} disabled={pending}>
              Guardar
            </button>
            <button className="btn danger sm" onClick={borrar} disabled={pending}>
              Borrar
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="muted">{fecha(c.fecha)}</td>
      <td>{c.clienteNombre}</td>
      <td>
        {c.productoNombre}
        {c.observaciones && <div className="cliente-sub">{c.observaciones}</div>}
      </td>
      <td className="num">{c.cantidad}</td>
      <td className="num">{pesos(subtotal)}</td>
      <td className="num">
        <button className="btn ghost sm" onClick={() => setEditing(true)}>
          Editar
        </button>
      </td>
    </tr>
  );
}

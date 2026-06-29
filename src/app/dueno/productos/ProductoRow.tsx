"use client";

import { useState, useTransition } from "react";
import { editarProducto, toggleProductoActivo } from "@/lib/actions";
import { pesos } from "@/lib/format";

type Producto = {
  id: number;
  nombre: string;
  precio: number;
  activo: boolean;
};

export default function ProductoRow({ p }: { p: Producto }) {
  const [editing, setEditing] = useState(false);
  const [precio, setPrecio] = useState(String(p.precio));
  const [pending, start] = useTransition();

  function guardar() {
    const fd = new FormData();
    fd.set("id", String(p.id));
    fd.set("precio", precio);
    start(async () => {
      await editarProducto(fd);
      setEditing(false);
    });
  }

  function toggle() {
    const fd = new FormData();
    fd.set("id", String(p.id));
    start(async () => {
      await toggleProductoActivo(fd);
    });
  }

  return (
    <tr style={p.activo ? undefined : { opacity: 0.55 }}>
      <td>
        {p.nombre}{" "}
        {!p.activo && <span className="badge facturado">inactivo</span>}
      </td>
      <td className="num">
        {editing ? (
          <input
            type="number"
            step="0.01"
            min="0"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            style={{ padding: "6px 8px", maxWidth: 120, textAlign: "right" }}
          />
        ) : (
          pesos(p.precio)
        )}
      </td>
      <td className="num">
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          {editing ? (
            <>
              <button className="btn sm" onClick={guardar} disabled={pending}>
                Guardar
              </button>
              <button
                className="btn ghost sm"
                onClick={() => {
                  setPrecio(String(p.precio));
                  setEditing(false);
                }}
                disabled={pending}
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button className="btn ghost sm" onClick={() => setEditing(true)}>
                Cambiar precio
              </button>
              <button className="btn ghost sm" onClick={toggle} disabled={pending}>
                {p.activo ? "Desactivar" : "Reactivar"}
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

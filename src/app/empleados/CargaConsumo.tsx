"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { crearConsumo, type FormState } from "@/lib/actions";
import { CATEGORIAS, normalizar } from "@/lib/constants";
import { pesos } from "@/lib/format";

const initial: FormState = { ok: false, message: "" };

type ClienteLite = { id: number; nombre: string };
type ProductoLite = { id: number; nombre: string; categoria: string; precio: number };

export default function CargaConsumo({
  clientes,
  productos,
  hoy,
}: {
  clientes: ClienteLite[];
  productos: ProductoLite[];
  hoy: string;
}) {
  const [state, action, pending] = useActionState(crearConsumo, initial);
  const formRef = useRef<HTMLFormElement>(null);

  // --- Buscador de cliente (solo elige existentes; el alta va por "Nuevo cliente") ---
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const norm = normalizar(query);
  const matches = useMemo(() => {
    if (!norm) return [];
    return clientes.filter((c) => normalizar(c.nombre).includes(norm)).slice(0, 8);
  }, [norm, clientes]);
  const exacto = useMemo(
    () => clientes.some((c) => normalizar(c.nombre) === norm),
    [norm, clientes],
  );
  const seleccionado = selectedId != null;
  const clienteOk = seleccionado || exacto;

  // --- Modo: producto del catálogo o consumo genérico con monto ---
  const [modo, setModo] = useState<"producto" | "consumo">(
    productos.length > 0 ? "producto" : "consumo",
  );

  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [monto, setMonto] = useState("");

  const producto = productos.find((p) => String(p.id) === productoId) ?? null;
  const cant = parseInt(cantidad, 10);
  const subtotal =
    modo === "consumo"
      ? parseFloat(monto.replace(",", ".")) || 0
      : producto && cant > 0
        ? producto.precio * cant
        : 0;

  function elegir(c: ClienteLite) {
    setSelectedId(c.id);
    setQuery(c.nombre);
    setOpen(false);
  }
  function cambiarQuery(v: string) {
    setQuery(v);
    setSelectedId(null);
    setOpen(true);
  }

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setQuery("");
      setSelectedId(null);
      setOpen(false);
      setProductoId("");
      setCantidad("1");
      setMonto("");
    }
  }, [state]);

  return (
    <form action={action} ref={formRef}>
      <input type="hidden" name="modo" value={modo} />

      {/* Cliente */}
      <div className="field" style={{ position: "relative" }}>
        <label>Cliente</label>
        <input
          name="clienteNombre"
          value={query}
          onChange={(e) => cambiarQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Buscá el cliente…"
          autoComplete="off"
          required
        />
        <input type="hidden" name="clienteId" value={selectedId ?? ""} />

        {open && !seleccionado && matches.length > 0 && (
          <ul className="search-results">
            {matches.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => elegir(c)}>
                  {c.nombre}
                </button>
              </li>
            ))}
          </ul>
        )}

        {query.trim() !== "" &&
          (clienteOk ? (
            <p className="search-hint ok">
              {seleccionado ? "Cliente seleccionado." : "Coincide con un cliente existente."}
            </p>
          ) : (
            <p className="search-hint new">
              Cliente nuevo: se creará «{query.trim()}» al guardar.
            </p>
          ))}
      </div>

      {/* Selector de modo */}
      <div className="field">
        <label>Tipo de carga</label>
        <div className="login-tabs" style={{ marginBottom: 0 }}>
          <button
            type="button"
            className={modo === "producto" ? "active" : ""}
            onClick={() => setModo("producto")}
            disabled={productos.length === 0}
          >
            Producto del catálogo
          </button>
          <button
            type="button"
            className={modo === "consumo" ? "active" : ""}
            onClick={() => setModo("consumo")}
          >
            Consumo (monto libre)
          </button>
        </div>
      </div>

      {modo === "producto" ? (
        <>
          <div className="field">
            <label>Producto</label>
            <select
              name="productoId"
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              required={modo === "producto"}
            >
              <option value="" disabled>
                Elegí un producto…
              </option>
              {CATEGORIAS.map((catg) => {
                const items = productos.filter((p) => p.categoria === catg.value);
                if (items.length === 0) return null;
                return (
                  <optgroup key={catg.value} label={catg.label}>
                    {items.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — {pesos(p.precio)}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          <div className="row">
            <div className="field">
              <label>Cantidad</label>
              <input
                name="cantidad"
                type="number"
                min="1"
                step="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Fecha</label>
              <input name="fecha" type="date" defaultValue={hoy} />
            </div>
          </div>
        </>
      ) : (
        <div className="row">
          <div className="field">
            <label>Monto del consumo</label>
            <input
              name="monto"
              type="number"
              step="0.01"
              min="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0,00"
              required={modo === "consumo"}
            />
          </div>
          <div className="field">
            <label>Fecha</label>
            <input name="fecha" type="date" defaultValue={hoy} />
          </div>
        </div>
      )}

      {/* Subtotal en vivo */}
      <div className="subtotal-box">
        <span>{modo === "consumo" ? "Total" : "Subtotal"}</span>
        <strong>{pesos(subtotal)}</strong>
      </div>

      <div className="field">
        <label>Observaciones (opcional)</label>
        <textarea
          name="observaciones"
          rows={2}
          placeholder="Ej: sin sal, retira 13hs…"
          autoComplete="off"
        />
      </div>

      {state.message && (
        <div className={`alert ${state.ok ? "ok" : "err"}`}>{state.message}</div>
      )}

      <button className="btn full" type="submit" disabled={pending || query.trim() === ""}>
        {pending ? "Guardando…" : "Guardar consumo"}
      </button>
    </form>
  );
}

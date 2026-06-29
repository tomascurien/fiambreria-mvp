"use client";

import { useActionState, useEffect, useRef } from "react";
import { crearProducto, type FormState } from "@/lib/actions";
import { CATEGORIAS } from "@/lib/constants";

const initial: FormState = { ok: false, message: "" };

export default function ProductoForm() {
  const [state, action, pending] = useActionState(crearProducto, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form action={action} ref={formRef}>
      <div className="field">
        <label>Nombre *</label>
        <input name="nombre" required placeholder="Ej: Vianda completa" autoComplete="off" />
      </div>
      <div className="row">
        <div className="field">
          <label>Categoría *</label>
          <select name="categoria" required defaultValue="">
            <option value="" disabled>
              Elegí…
            </option>
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Precio *</label>
          <input name="precio" type="number" step="0.01" min="0" placeholder="0,00" required />
        </div>
      </div>

      {state.message && (
        <div className={`alert ${state.ok ? "ok" : "err"}`}>{state.message}</div>
      )}

      <button className="btn full" type="submit" disabled={pending}>
        {pending ? "Agregando…" : "Agregar producto"}
      </button>
    </form>
  );
}

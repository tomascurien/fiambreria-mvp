"use client";

import { useActionState, useEffect, useRef } from "react";
import { crearClienteBasico, type FormState } from "@/lib/actions";

const initial: FormState = { ok: false, message: "" };

export default function ClienteBasicoForm() {
  const [state, action, pending] = useActionState(crearClienteBasico, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form action={action} ref={formRef}>
      <div className="field">
        <label>Nombre *</label>
        <input name="nombre" required placeholder="Nombre o empresa" autoComplete="off" />
      </div>
      <div className="field">
        <label>Teléfono</label>
        <input name="telefono" placeholder="opcional" autoComplete="off" />
      </div>

      {state.message && (
        <div className={`alert ${state.ok ? "ok" : "err"}`}>{state.message}</div>
      )}

      <button className="btn full" type="submit" disabled={pending}>
        {pending ? "Agregando…" : "Agregar cliente"}
      </button>
    </form>
  );
}

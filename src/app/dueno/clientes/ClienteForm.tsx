"use client";

import { useActionState, useEffect, useRef } from "react";
import { crearCliente, editarCliente, type FormState } from "@/lib/actions";
import { CONDICIONES_IVA, PERIODICIDADES, FORMAS_PAGO } from "@/lib/constants";

const initial: FormState = { ok: false, message: "" };

export type ClienteData = {
  id: number;
  nombre: string;
  razonSocial: string | null;
  cuit: string | null;
  condicionIva: string | null;
  email: string | null;
  telefono: string | null;
  periodicidad: string;
  formaPago: string;
};

export default function ClienteForm({ cliente }: { cliente?: ClienteData }) {
  const editar = !!cliente;
  const [state, action, pending] = useActionState(
    editar ? editarCliente : crearCliente,
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // En alta limpiamos al guardar; en edición dejamos los datos.
  useEffect(() => {
    if (state.ok && !editar) formRef.current?.reset();
  }, [state, editar]);

  return (
    <form action={action} ref={formRef}>
      {editar && <input type="hidden" name="id" value={cliente!.id} />}

      <div className="field">
        <label>Nombre / referencia *</label>
        <input
          name="nombre"
          required
          defaultValue={cliente?.nombre ?? ""}
          autoComplete="off"
        />
      </div>

      <div className="row">
        <div className="field">
          <label>Razón social</label>
          <input name="razonSocial" defaultValue={cliente?.razonSocial ?? ""} placeholder="opcional" />
        </div>
        <div className="field">
          <label>CUIT</label>
          <input name="cuit" defaultValue={cliente?.cuit ?? ""} placeholder="opcional" />
        </div>
      </div>

      <div className="field">
        <label>Condición IVA</label>
        <select name="condicionIva" defaultValue={cliente?.condicionIva ?? ""}>
          <option value="">Sin especificar</option>
          {CONDICIONES_IVA.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="row">
        <div className="field">
          <label>Email</label>
          <input name="email" type="email" defaultValue={cliente?.email ?? ""} placeholder="opcional" />
        </div>
        <div className="field">
          <label>Teléfono</label>
          <input name="telefono" defaultValue={cliente?.telefono ?? ""} placeholder="opcional" />
        </div>
      </div>

      <div className="row">
        <div className="field">
          <label>Periodicidad de facturación</label>
          <select name="periodicidad" defaultValue={cliente?.periodicidad ?? "mensual"}>
            {PERIODICIDADES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Forma de pago</label>
          <select name="formaPago" defaultValue={cliente?.formaPago ?? "cuenta_corriente"}>
            {FORMAS_PAGO.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.message && (
        <div className={`alert ${state.ok ? "ok" : "err"}`}>{state.message}</div>
      )}

      <button className="btn full" type="submit" disabled={pending}>
        {pending ? "Guardando…" : editar ? "Guardar cambios" : "Agregar cliente"}
      </button>
    </form>
  );
}

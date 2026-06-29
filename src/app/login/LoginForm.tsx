"use client";

import { useActionState, useState } from "react";
import { iniciarSesion, type FormState } from "@/lib/actions";

const initial: FormState = { ok: false, message: "" };

type EmpleadoLite = { id: number; nombre: string };

export default function LoginForm({ empleados }: { empleados: EmpleadoLite[] }) {
  const [state, action, pending] = useActionState(iniciarSesion, initial);
  const [modo, setModo] = useState<"empleado" | "dueno">("empleado");

  return (
    <div>
      <div className="login-tabs">
        <button
          type="button"
          className={modo === "empleado" ? "active" : ""}
          onClick={() => setModo("empleado")}
        >
          Empleado
        </button>
        <button
          type="button"
          className={modo === "dueno" ? "active" : ""}
          onClick={() => setModo("dueno")}
        >
          Dueño
        </button>
      </div>

      <form action={action}>
        <input type="hidden" name="modo" value={modo} />

        {modo === "empleado" ? (
          <>
            <div className="field">
              <label>¿Quién sos?</label>
              <select name="empleadoId" required defaultValue="">
                <option value="" disabled>
                  Elegí tu nombre…
                </option>
                {empleados.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>PIN (4 a 6 dígitos)</label>
              <input
                name="pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                placeholder="••••"
                required
              />
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label>Usuario</label>
              <input name="usuario" autoComplete="username" placeholder="admin" required />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </div>
          </>
        )}

        {state.message && <div className="alert err">{state.message}</div>}

        <button className="btn full" type="submit" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

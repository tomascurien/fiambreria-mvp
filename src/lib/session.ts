import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "crypto";
import { prisma } from "./db";

const SECRET = process.env.AUTH_SECRET || "dev-secret-cambiar-en-produccion";
const COOKIE = "sesion";
export const SESION_MAXAGE = 30 * 60; // 30 min de inactividad (sliding via middleware)

/* ---------- Secretos: PIN y contraseñas (scrypt, salt embebido "salt:hash") ---------- */

export function hashSecret(secret: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(secret, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifySecret(secret: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(secret, salt, 32);
  const orig = Buffer.from(hash, "hex");
  return orig.length === test.length && timingSafeEqual(orig, test);
}

/* ---------- Validadores ---------- */

// PIN de empleado: 4 a 6 dígitos.
export function pinValido(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

// Contraseña fuerte del dueño: ≥8, con mayúscula, minúscula, número y símbolo.
export function passwordFuerte(pw: string): boolean {
  return (
    pw.length >= 8 &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /\d/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

/* ---------- Cookie firmada ("id.firma") ---------- */

function firmar(id: number): string {
  const sig = createHmac("sha256", SECRET).update(String(id)).digest("hex");
  return `${id}.${sig}`;
}

function verificar(value: string): number | null {
  const [idStr, sig] = value.split(".");
  if (!idStr || !sig) return null;
  const esperado = createHmac("sha256", SECRET).update(idStr).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const id = Number(idStr);
  return Number.isInteger(id) ? id : null;
}

/* ---------- Sesión ---------- */

export type Sesion = { empleadoId: number; nombre: string; rol: string };

// Solo desde Server Actions (no durante el render).
export async function setSesionCookie(id: number) {
  const c = await cookies();
  c.set(COOKIE, firmar(id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESION_MAXAGE,
  });
}

export async function clearSesionCookie() {
  const c = await cookies();
  c.delete(COOKIE);
}

export async function getSesion(): Promise<Sesion | null> {
  const c = await cookies();
  const raw = c.get(COOKIE)?.value;
  if (!raw) return null;
  const id = verificar(raw);
  if (!id) return null;
  const emp = await prisma.empleado.findUnique({ where: { id } });
  if (!emp || !emp.activo) return null;
  return { empleadoId: emp.id, nombre: emp.nombre, rol: emp.rol };
}

export async function requireSesion(): Promise<Sesion> {
  const s = await getSesion();
  if (!s) redirect("/login");
  return s;
}

export async function requireDueno(): Promise<Sesion> {
  const s = await requireSesion();
  if (s.rol !== "dueno") redirect("/empleados");
  return s;
}

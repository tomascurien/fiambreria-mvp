"use server";

import { prisma } from "./db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizar } from "./constants";
import { pesos } from "./format";
import { registrarAuditoria } from "./audit";
import {
  getSesion,
  requireSesion,
  requireDueno,
  setSesionCookie,
  clearSesionCookie,
  verifySecret,
  pinValido,
} from "./session";
import type { Empleado } from "@prisma/client";

function num(v: FormDataEntryValue | null): number {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}
function int(v: FormDataEntryValue | null): number {
  const n = parseInt(String(v ?? ""), 10);
  return isNaN(n) ? 0 : n;
}
function str(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

export type FormState = { ok: boolean; message: string };

/* ---------- Auth ---------- */

async function auditarSesion(
  empleadoId: number | null,
  nombre: string,
  accion: string,
  detalle: string,
) {
  await prisma.auditoria.create({
    data: {
      empleadoId,
      empleadoNombre: nombre,
      entidad: "sesion",
      entidadId: empleadoId ?? 0,
      accion,
      detalle,
    },
  });
}

// Minutos restantes de bloqueo, o 0 si no está bloqueado.
function bloqueoRestante(emp: Empleado): number {
  if (emp.bloqueadoHasta && emp.bloqueadoHasta.getTime() > Date.now()) {
    return Math.ceil((emp.bloqueadoHasta.getTime() - Date.now()) / 60000);
  }
  return 0;
}

const MAX_INTENTOS = 5;
const BLOQUEO_MIN = 15;

async function registrarFallo(emp: Empleado): Promise<FormState> {
  const intentos = emp.intentosFallidos + 1;
  const data: any = { intentosFallidos: intentos };
  let message = "Usuario o contraseña/PIN incorrectos.";
  if (intentos >= MAX_INTENTOS) {
    data.bloqueadoHasta = new Date(Date.now() + BLOQUEO_MIN * 60000);
    data.intentosFallidos = 0;
    message = `Demasiados intentos. Cuenta bloqueada ${BLOQUEO_MIN} minutos.`;
  }
  await prisma.empleado.update({ where: { id: emp.id }, data });
  await auditarSesion(emp.id, emp.nombre, "login_fallido", `Intento ${intentos} fallido`);
  return { ok: false, message };
}

async function loginOk(emp: Empleado): Promise<never> {
  await prisma.empleado.update({
    where: { id: emp.id },
    data: { intentosFallidos: 0, bloqueadoHasta: null },
  });
  await setSesionCookie(emp.id);
  await auditarSesion(emp.id, emp.nombre, "login", `Inicio de sesión (${emp.rol})`);
  redirect(emp.rol === "dueno" ? "/dueno" : "/empleados");
}

export async function iniciarSesion(_prev: FormState, formData: FormData): Promise<FormState> {
  const modo = str(formData.get("modo")); // "empleado" | "dueno"

  if (modo === "dueno") {
    const usuario = str(formData.get("usuario"));
    const password = str(formData.get("password"));
    if (!usuario || !password) return { ok: false, message: "Completá usuario y contraseña." };

    const emp = await prisma.empleado.findUnique({ where: { usuario } });
    if (!emp || emp.rol !== "dueno" || !emp.activo) {
      await auditarSesion(null, usuario, "login_fallido", "Usuario inexistente");
      return { ok: false, message: "Usuario o contraseña incorrectos." };
    }
    const bloq = bloqueoRestante(emp);
    if (bloq) return { ok: false, message: `Cuenta bloqueada. Probá en ${bloq} min.` };
    if (!verifySecret(password, emp.passwordHash)) return registrarFallo(emp);
    return loginOk(emp);
  }

  // Empleado: nombre (id) + PIN
  const empleadoId = Number(formData.get("empleadoId")) || 0;
  const pin = str(formData.get("pin"));
  if (!empleadoId) return { ok: false, message: "Elegí tu nombre." };
  if (!pinValido(pin)) return { ok: false, message: "El PIN debe tener 4 a 6 dígitos." };

  const emp = await prisma.empleado.findUnique({ where: { id: empleadoId } });
  if (!emp || emp.rol !== "empleado" || !emp.activo) {
    return { ok: false, message: "Empleado inválido." };
  }
  const bloq = bloqueoRestante(emp);
  if (bloq) return { ok: false, message: `Cuenta bloqueada. Probá en ${bloq} min.` };
  if (!verifySecret(pin, emp.pinHash)) return registrarFallo(emp);
  return loginOk(emp);
}

export async function cerrarSesion() {
  const s = await getSesion();
  if (s) await auditarSesion(s.empleadoId, s.nombre, "logout", "Cierre de sesión");
  await clearSesionCookie();
  redirect("/login");
}

/* ---------- Clientes ---------- */

function datosCliente(formData: FormData) {
  return {
    nombre: str(formData.get("nombre")),
    razonSocial: str(formData.get("razonSocial")) || null,
    cuit: str(formData.get("cuit")) || null,
    condicionIva: str(formData.get("condicionIva")) || null,
    email: str(formData.get("email")) || null,
    telefono: str(formData.get("telefono")) || null,
    periodicidad: str(formData.get("periodicidad")) || "mensual",
    formaPago: str(formData.get("formaPago")) || "cuenta_corriente",
  };
}

export async function crearCliente(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireDueno();
  const data = datosCliente(formData);
  if (!data.nombre) return { ok: false, message: "Escribí un nombre." };

  const norm = normalizar(data.nombre);
  const existentes = await prisma.cliente.findMany({ select: { nombre: true } });
  const dup = existentes.find((c) => normalizar(c.nombre) === norm);
  if (dup) return { ok: false, message: `Ya existe el cliente "${dup.nombre}".` };

  const cliente = await prisma.cliente.create({ data });
  await registrarAuditoria({
    entidad: "cliente",
    entidadId: cliente.id,
    accion: "crear",
    detalle: `Alta de cliente "${cliente.nombre}"`,
  });
  revalidatePath("/dueno");
  revalidatePath("/dueno/clientes");
  revalidatePath("/empleados");
  return { ok: true, message: `Cliente "${data.nombre}" agregado correctamente.` };
}

export async function editarCliente(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireDueno();
  const id = Number(formData.get("id"));
  if (!id) return { ok: false, message: "Cliente inválido." };
  const data = datosCliente(formData);
  if (!data.nombre) return { ok: false, message: "Escribí un nombre." };

  const norm = normalizar(data.nombre);
  const existentes = await prisma.cliente.findMany({ select: { id: true, nombre: true } });
  const dup = existentes.find((c) => c.id !== id && normalizar(c.nombre) === norm);
  if (dup) return { ok: false, message: `Ya existe otro cliente "${dup.nombre}".` };

  await prisma.cliente.update({ where: { id }, data });
  await registrarAuditoria({
    entidad: "cliente",
    entidadId: id,
    accion: "editar",
    detalle: `Datos actualizados de "${data.nombre}"`,
  });
  revalidatePath("/dueno");
  revalidatePath("/dueno/clientes");
  revalidatePath(`/dueno/clientes/${id}`);
  return { ok: true, message: "Cambios guardados." };
}

export async function toggleClienteActivo(formData: FormData) {
  await requireDueno();
  const id = Number(formData.get("id"));
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) return;
  await prisma.cliente.update({ where: { id }, data: { activo: !cliente.activo } });
  await registrarAuditoria({
    entidad: "cliente",
    entidadId: id,
    accion: "editar",
    detalle: `${cliente.activo ? "Desactivó" : "Reactivó"} cliente "${cliente.nombre}"`,
  });
  revalidatePath("/dueno");
  revalidatePath("/dueno/clientes");
  revalidatePath(`/dueno/clientes/${id}`);
}

// Alta simple para empleados: solo nombre y teléfono, sin datos fiscales.
export async function crearClienteBasico(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSesion();
  const nombre = str(formData.get("nombre"));
  const telefono = str(formData.get("telefono")) || null;
  if (!nombre) return { ok: false, message: "Escribí un nombre." };

  const norm = normalizar(nombre);
  const existentes = await prisma.cliente.findMany({ select: { nombre: true } });
  if (existentes.some((c) => normalizar(c.nombre) === norm))
    return { ok: false, message: `Ya existe el cliente "${nombre}".` };

  const cliente = await prisma.cliente.create({ data: { nombre, telefono } });
  await registrarAuditoria({
    entidad: "cliente",
    entidadId: cliente.id,
    accion: "crear",
    detalle: `Alta de cliente "${nombre}" (empleado)`,
  });
  revalidatePath("/empleados");
  revalidatePath("/empleados/clientes");
  revalidatePath("/dueno/clientes");
  return { ok: true, message: `Cliente "${nombre}" agregado.` };
}

/* ---------- Productos ---------- */

export async function crearProducto(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireDueno();
  const nombre = str(formData.get("nombre"));
  const categoria = str(formData.get("categoria"));
  const precio = num(formData.get("precio"));
  if (!nombre) return { ok: false, message: "Escribí el nombre del producto." };
  if (!["vianda", "desayuno", "consumo_local"].includes(categoria))
    return { ok: false, message: "Elegí una categoría." };
  if (precio <= 0) return { ok: false, message: "Ingresá un precio mayor a 0." };

  const norm = normalizar(nombre);
  const existentes = await prisma.producto.findMany({
    where: { categoria },
    select: { nombre: true },
  });
  if (existentes.some((p) => normalizar(p.nombre) === norm))
    return { ok: false, message: `Ya existe "${nombre}" en esa categoría.` };

  const producto = await prisma.producto.create({ data: { nombre, categoria, precio } });
  await registrarAuditoria({
    entidad: "producto",
    entidadId: producto.id,
    accion: "crear",
    detalle: `Alta de producto "${nombre}" (${pesos(precio)})`,
  });
  revalidatePath("/dueno/productos");
  revalidatePath("/empleados");
  return { ok: true, message: `Producto "${nombre}" agregado.` };
}

// Cambia nombre/categoría/precio. NO toca los consumos ya cargados.
export async function editarProducto(formData: FormData) {
  await requireDueno();
  const id = Number(formData.get("id"));
  if (!id) return;
  const prev = await prisma.producto.findUnique({ where: { id } });
  if (!prev) return;

  const precio = num(formData.get("precio"));
  const nombre = str(formData.get("nombre"));
  const categoria = str(formData.get("categoria"));
  const data: any = {};
  const cambios: string[] = [];
  if (nombre && nombre !== prev.nombre) {
    data.nombre = nombre;
    cambios.push(`Nombre "${prev.nombre}" → "${nombre}"`);
  }
  if (["vianda", "desayuno", "consumo_local"].includes(categoria) && categoria !== prev.categoria) {
    data.categoria = categoria;
    cambios.push(`Categoría ${prev.categoria} → ${categoria}`);
  }
  if (precio > 0 && precio !== prev.precio) {
    data.precio = precio;
    cambios.push(`Precio ${pesos(prev.precio)} → ${pesos(precio)}`);
  }
  if (cambios.length === 0) return;

  await prisma.producto.update({ where: { id }, data });
  await registrarAuditoria({
    entidad: "producto",
    entidadId: id,
    accion: "editar",
    detalle: cambios.join("; "),
  });
  revalidatePath("/dueno/productos");
  revalidatePath("/empleados");
}

export async function toggleProductoActivo(formData: FormData) {
  await requireDueno();
  const id = Number(formData.get("id"));
  const producto = await prisma.producto.findUnique({ where: { id } });
  if (!producto) return;
  await prisma.producto.update({ where: { id }, data: { activo: !producto.activo } });
  await registrarAuditoria({
    entidad: "producto",
    entidadId: id,
    accion: "editar",
    detalle: `${producto.activo ? "Desactivó" : "Reactivó"} producto "${producto.nombre}"`,
  });
  revalidatePath("/dueno/productos");
  revalidatePath("/empleados");
}

/* ---------- Consumos (carga diaria) ---------- */

export async function crearConsumo(_prev: FormState, formData: FormData): Promise<FormState> {
  const sesion = await requireSesion();

  // Resolver el cliente: por id (de la búsqueda) o match exacto por nombre.
  // No se crea al vuelo: el alta va por la pantalla "Nuevo cliente".
  let clienteId = Number(formData.get("clienteId")) || 0;
  if (!clienteId) {
    const nombre = str(formData.get("clienteNombre"));
    if (!nombre) return { ok: false, message: "Elegí el cliente." };
    const norm = normalizar(nombre);
    const existentes = await prisma.cliente.findMany({ select: { id: true, nombre: true } });
    const match = existentes.find((c) => normalizar(c.nombre) === norm);
    if (!match)
      return {
        ok: false,
        message: `El cliente "${nombre}" no existe. Cargalo en "Nuevo cliente".`,
      };
    clienteId = match.id;
  }

  const fechaStr = str(formData.get("fecha"));
  const data: any = {
    clienteId,
    observaciones: str(formData.get("observaciones")) || null,
    creadoPor: sesion.nombre,
  };
  if (fechaStr) data.fecha = new Date(fechaStr + "T12:00:00");

  let detalle = "";
  const modo = str(formData.get("modo")) || "producto";
  if (modo === "consumo") {
    // Consumo genérico de mostrador: sin producto, monto a mano.
    const monto = num(formData.get("monto"));
    if (monto <= 0) return { ok: false, message: "Ingresá un monto mayor a 0." };
    data.productoId = null;
    data.cantidad = 1;
    data.precioUnitario = monto;
    detalle = `Cargó Consumo (${pesos(monto)})`;
  } else {
    const productoId = Number(formData.get("productoId")) || 0;
    const cantidad = int(formData.get("cantidad"));
    if (!productoId) return { ok: false, message: "Elegí un producto." };
    if (cantidad <= 0) return { ok: false, message: "La cantidad debe ser mayor a 0." };
    const producto = await prisma.producto.findUnique({ where: { id: productoId } });
    if (!producto) return { ok: false, message: "El producto no existe." };
    data.productoId = productoId;
    data.cantidad = cantidad;
    data.precioUnitario = producto.precio;
    detalle = `Cargó ${cantidad} × ${producto.nombre} (${pesos(producto.precio * cantidad)})`;
  }

  const consumo = await prisma.consumo.create({ data });
  await registrarAuditoria({
    entidad: "consumo",
    entidadId: consumo.id,
    accion: "crear",
    detalle,
  });
  revalidatePath("/empleados");
  revalidatePath("/dueno");
  revalidatePath(`/dueno/clientes/${clienteId}`);

  return { ok: true, message: "Consumo guardado." };
}

// Solo se editan cantidad y observaciones. Producto y precio quedan congelados.
export async function editarConsumo(formData: FormData) {
  await requireSesion();
  const id = Number(formData.get("id"));
  const consumo = await prisma.consumo.findUnique({ where: { id }, include: { producto: true } });
  if (!consumo || consumo.facturaId) return; // no editar facturados

  const cantidad = int(formData.get("cantidad"));
  const cantNueva = cantidad > 0 ? cantidad : consumo.cantidad;
  const obsNueva = str(formData.get("observaciones")) || null;

  const cambios: string[] = [];
  if (cantNueva !== consumo.cantidad) cambios.push(`Cantidad ${consumo.cantidad} → ${cantNueva}`);
  if (obsNueva !== consumo.observaciones) cambios.push("Observaciones modificadas");
  if (cambios.length === 0) return;

  await prisma.consumo.update({
    where: { id },
    data: { cantidad: cantNueva, observaciones: obsNueva },
  });
  await registrarAuditoria({
    entidad: "consumo",
    entidadId: id,
    accion: "editar",
    detalle: `${consumo.producto?.nombre ?? "Consumo"}: ${cambios.join("; ")}`,
  });
  revalidatePath("/empleados");
  revalidatePath("/dueno");
  revalidatePath(`/dueno/clientes/${consumo.clienteId}`);
}

export async function borrarConsumo(formData: FormData) {
  await requireSesion();
  const id = Number(formData.get("id"));
  const consumo = await prisma.consumo.findUnique({ where: { id }, include: { producto: true } });
  if (!consumo || consumo.facturaId) return; // no borrar facturados
  await prisma.consumo.delete({ where: { id } });
  await registrarAuditoria({
    entidad: "consumo",
    entidadId: id,
    accion: "borrar",
    detalle: `Borró ${consumo.cantidad} × ${consumo.producto?.nombre ?? "Consumo"}`,
  });
  revalidatePath("/empleados");
  revalidatePath("/dueno");
  revalidatePath(`/dueno/clientes/${consumo.clienteId}`);
}

/* ---------- Facturación ---------- */

// Congela los consumos pendientes de un cliente en el rango dado. Devuelve la
// info de la factura creada, o null si no había pendientes. Corre dentro de un tx.
async function facturarClienteTx(
  tx: any,
  clienteId: number,
  desdeStr: string,
  hastaStr: string,
): Promise<{ facturaId: number; total: number; cant: number } | null> {
  const where: any = { clienteId, facturaId: null };
  if (desdeStr || hastaStr) {
    where.fecha = {};
    if (desdeStr) where.fecha.gte = new Date(desdeStr + "T00:00:00");
    if (hastaStr) where.fecha.lte = new Date(hastaStr + "T23:59:59");
  }
  const pendientes = await tx.consumo.findMany({ where, orderBy: { fecha: "asc" } });
  if (pendientes.length === 0) return null;

  const total = pendientes.reduce((a: number, c: any) => a + c.cantidad * c.precioUnitario, 0);
  const factura = await tx.factura.create({
    data: {
      clienteId,
      fechaDesde: pendientes[0].fecha,
      fechaHasta: pendientes[pendientes.length - 1].fecha,
      total,
    },
  });
  await tx.consumo.updateMany({
    where: { id: { in: pendientes.map((c: any) => c.id) } },
    data: { facturaId: factura.id },
  });
  return { facturaId: factura.id, total, cant: pendientes.length };
}

export async function crearFactura(formData: FormData) {
  await requireDueno();
  const clienteId = Number(formData.get("clienteId"));
  if (!clienteId) return;
  const desdeStr = str(formData.get("fechaDesde"));
  const hastaStr = str(formData.get("fechaHasta"));

  const r = await prisma.$transaction((tx) => facturarClienteTx(tx, clienteId, desdeStr, hastaStr));
  if (!r) return;

  await registrarAuditoria({
    entidad: "factura",
    entidadId: r.facturaId,
    accion: "facturar",
    detalle: `Facturó ${pesos(r.total)} (${r.cant} consumos)`,
  });
  revalidatePath("/dueno");
  revalidatePath("/dueno/facturacion");
  revalidatePath(`/dueno/clientes/${clienteId}`);
}

export type ResultadoPeriodo = {
  resultados: { clienteNombre: string; ok: boolean; total: number; error?: string }[];
  cantOk: number;
  totalFacturado: number;
};

// Factura por lote: genera una factura por cada cliente con pendientes en el rango.
// Cada cliente se procesa por separado: si uno falla, el resto igual se factura.
export async function facturarPeriodo(
  _prev: ResultadoPeriodo,
  formData: FormData,
): Promise<ResultadoPeriodo> {
  await requireDueno();
  const desdeStr = str(formData.get("fechaDesde"));
  const hastaStr = str(formData.get("fechaHasta"));
  const sesion = await getSesion();

  // Clientes con consumos pendientes en el rango.
  const where: any = { facturaId: null };
  if (desdeStr || hastaStr) {
    where.fecha = {};
    if (desdeStr) where.fecha.gte = new Date(desdeStr + "T00:00:00");
    if (hastaStr) where.fecha.lte = new Date(hastaStr + "T23:59:59");
  }
  const pend = await prisma.consumo.findMany({ where, select: { clienteId: true } });
  const ids = [...new Set(pend.map((p) => p.clienteId))];
  const clientes = await prisma.cliente.findMany({ where: { id: { in: ids } }, orderBy: { nombre: "asc" } });

  const resultados: ResultadoPeriodo["resultados"] = [];
  let cantOk = 0;
  let totalFacturado = 0;

  for (const cliente of clientes) {
    try {
      const r = await prisma.$transaction((tx) =>
        facturarClienteTx(tx, cliente.id, desdeStr, hastaStr),
      );
      if (r) {
        await registrarAuditoria({
          entidad: "factura",
          entidadId: r.facturaId,
          accion: "facturar",
          detalle: `Facturó ${pesos(r.total)} (${r.cant} consumos) — cierre de período`,
        });
        resultados.push({ clienteNombre: cliente.nombre, ok: true, total: r.total });
        cantOk++;
        totalFacturado += r.total;
      } else {
        resultados.push({
          clienteNombre: cliente.nombre,
          ok: false,
          total: 0,
          error: "Sin consumos pendientes",
        });
      }
    } catch {
      resultados.push({ clienteNombre: cliente.nombre, ok: false, total: 0, error: "Error al facturar" });
    }
  }

  if (cantOk > 0) {
    await prisma.cierrePeriodo.create({
      data: {
        fechaDesde: desdeStr ? new Date(desdeStr + "T00:00:00") : new Date(Date.now() - 30 * 86400000),
        fechaHasta: hastaStr ? new Date(hastaStr + "T23:59:59") : new Date(),
        cantFacturas: cantOk,
        totalFacturado,
        empleadoNombre: sesion?.nombre ?? "Desconocido",
      },
    });
  }

  revalidatePath("/dueno");
  revalidatePath("/dueno/facturacion");
  return { resultados, cantOk, totalFacturado };
}

// Anula una factura: libera los consumos para que vuelvan a estar pendientes.
export async function anularFactura(formData: FormData) {
  await requireDueno();
  const id = Number(formData.get("id"));
  const factura = await prisma.factura.findUnique({ where: { id } });
  if (!factura) return;
  await prisma.$transaction(async (tx) => {
    await tx.consumo.updateMany({ where: { facturaId: id }, data: { facturaId: null } });
    await tx.factura.delete({ where: { id } });
  });
  await registrarAuditoria({
    entidad: "factura",
    entidadId: id,
    accion: "anular",
    detalle: `Anuló factura #${String(id).padStart(4, "0")} (${pesos(factura.total)})`,
  });
  revalidatePath("/dueno");
  revalidatePath("/dueno/facturacion");
  revalidatePath(`/dueno/clientes/${factura.clienteId}`);
}

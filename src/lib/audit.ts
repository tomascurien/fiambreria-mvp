import { prisma } from "./db";
import { getSesion } from "./session";

type Evento = {
  entidad: "consumo" | "producto" | "cliente" | "factura";
  entidadId: number;
  accion: "crear" | "editar" | "borrar" | "facturar" | "anular";
  detalle?: string;
};

// Registra un evento de auditoría atribuido al empleado de la sesión actual.
// Pensado para llamarse dentro de las server actions que mutan datos.
export async function registrarAuditoria(e: Evento) {
  const sesion = await getSesion();
  await prisma.auditoria.create({
    data: {
      empleadoId: sesion?.empleadoId ?? null,
      empleadoNombre: sesion?.nombre ?? "Desconocido",
      entidad: e.entidad,
      entidadId: e.entidadId,
      accion: e.accion,
      detalle: e.detalle ?? null,
    },
  });
}

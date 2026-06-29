// Listas y helpers compartidos entre formularios (cliente) y server actions (servidor).

export const CONDICIONES_IVA = [
  "Responsable Inscripto",
  "Monotributo",
  "Exento",
  "Consumidor Final",
  "No Responsable",
] as const;

export const PERIODICIDADES = [
  { value: "semanal", label: "Semanal" },
  { value: "quincenal", label: "Quincenal" },
  { value: "mensual", label: "Mensual" },
] as const;

export const FORMAS_PAGO = [
  { value: "cuenta_corriente", label: "Cuenta corriente" },
  { value: "transferencia", label: "Transferencia" },
  { value: "efectivo", label: "Efectivo" },
] as const;

export const CATEGORIAS = [
  { value: "vianda", label: "Viandas" },
  { value: "desayuno", label: "Desayunos" },
  { value: "consumo_local", label: "Consumo en local" },
] as const;

export type Categoria = (typeof CATEGORIAS)[number]["value"];

// Label legible a partir del value guardado en la base.
export function labelDe(
  lista: readonly { value: string; label: string }[],
  value: string | null | undefined,
): string {
  return lista.find((x) => x.value === value)?.label ?? (value || "—");
}

// Normaliza para comparar: sin acentos, minúsculas, espacios colapsados.
// "Juan  Gómez" y "juan gomez" se consideran lo mismo.
export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

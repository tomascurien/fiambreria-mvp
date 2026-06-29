import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const prisma = new PrismaClient();

// Mismo algoritmo que src/lib/session.ts (scrypt con salt embebido "salt:hash").
function hashSecret(secret) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(secret, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

const hoy = new Date();
function diasAtras(n) {
  const d = new Date(hoy);
  d.setDate(d.getDate() - n);
  d.setHours(10 + (n % 8), 30, 0, 0);
  return d;
}
function pick(arr, i) {
  return arr[i % arr.length];
}

async function main() {
  // Limpiar (respetando relaciones)
  await prisma.auditoria.deleteMany();
  await prisma.cierrePeriodo.deleteMany();
  await prisma.consumo.deleteMany();
  await prisma.factura.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.empleado.deleteMany();

  // --- Empleados ---
  // Dueño: usuario + contraseña fuerte. Empleados: PIN de 4 dígitos.
  await prisma.empleado.createMany({
    data: [
      {
        nombre: "Dueño",
        rol: "dueno",
        usuario: "admin",
        passwordHash: hashSecret("Fiambre.2026!"),
      },
      { nombre: "Pedro", pinHash: hashSecret("1234"), rol: "empleado" },
      { nombre: "María", pinHash: hashSecret("1234"), rol: "empleado" },
      { nombre: "Carlos", pinHash: hashSecret("1234"), rol: "empleado" },
    ],
  });

  // --- Productos ---
  const productos = await Promise.all(
    [
      { nombre: "Vianda clásica", categoria: "vianda", precio: 4200 },
      { nombre: "Vianda ejecutiva", categoria: "vianda", precio: 5200 },
      { nombre: "Desayuno simple", categoria: "desayuno", precio: 2300 },
      { nombre: "Desayuno completo", categoria: "desayuno", precio: 3400 },
      { nombre: "Picada individual", categoria: "consumo_local", precio: 3800 },
      { nombre: "Café y medialunas", categoria: "consumo_local", precio: 1900 },
      { nombre: "Bebida", categoria: "consumo_local", precio: 1500 },
    ].map((p) => prisma.producto.create({ data: p })),
  );

  // --- Clientes (con datos fiscales y condiciones) ---
  const clientes = await Promise.all(
    [
      {
        nombre: "Estudio Contable Pérez",
        razonSocial: "Pérez y Asociados S.R.L.",
        cuit: "30-71234567-8",
        condicionIva: "Responsable Inscripto",
        email: "admin@estudioperez.com",
        telefono: "299-4567890",
        periodicidad: "mensual",
        formaPago: "transferencia",
      },
      {
        nombre: "Inmobiliaria Del Valle",
        razonSocial: "Del Valle Propiedades S.A.",
        cuit: "30-70998877-2",
        condicionIva: "Responsable Inscripto",
        email: "contacto@delvalle.com",
        telefono: "299-4112233",
        periodicidad: "quincenal",
        formaPago: "cuenta_corriente",
      },
      {
        nombre: "Juan Gómez",
        condicionIva: "Monotributo",
        telefono: "299-5556677",
        periodicidad: "mensual",
        formaPago: "efectivo",
      },
      {
        nombre: "Clínica San Martín",
        razonSocial: "Centro Médico San Martín S.A.",
        cuit: "30-65443322-1",
        condicionIva: "Responsable Inscripto",
        email: "compras@clinicasm.com",
        telefono: "299-4778899",
        periodicidad: "mensual",
        formaPago: "cuenta_corriente",
      },
    ].map((c) => prisma.cliente.create({ data: c })),
  );

  const empleados = ["Pedro", "María", "Carlos"];

  // --- Consumos de los últimos ~35 días ---
  let idx = 0;
  for (const cliente of clientes) {
    for (let dia = 35; dia >= 0; dia--) {
      if (dia % 2 === 0 && (cliente.id + dia) % 3 !== 0) continue;

      const producto = pick(productos, idx);
      const cantidad = 1 + (idx % 4); // 1..4
      await prisma.consumo.create({
        data: {
          clienteId: cliente.id,
          productoId: producto.id,
          cantidad,
          precioUnitario: producto.precio, // snapshot del precio vigente
          observaciones: idx % 7 === 0 ? "Retira 13hs" : null,
          fecha: diasAtras(dia),
          creadoPor: pick(empleados, idx),
        },
      });
      idx++;
    }
  }

  const totalConsumos = await prisma.consumo.count();
  console.log(
    `✓ 4 empleados, ${productos.length} productos, ${clientes.length} clientes y ${totalConsumos} consumos creados.`,
  );
  console.log("  Dueño → usuario: admin · contraseña: Fiambre.2026!");
  console.log("  Empleados (Pedro/María/Carlos) → PIN: 1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

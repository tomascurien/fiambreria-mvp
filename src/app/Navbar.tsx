"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cerrarSesion } from "@/lib/actions";

type Sesion = { nombre: string; rol: string };

const LINKS_DUENO = [
  { href: "/dueno", label: "Dashboard" },
  { href: "/empleados", label: "Carga" },
  { href: "/dueno/clientes", label: "Clientes" },
  { href: "/dueno/productos", label: "Productos" },
  { href: "/dueno/facturacion", label: "Facturación" },
  { href: "/dueno/auditoria", label: "Auditoría" },
];

const LINKS_EMPLEADO = [
  { href: "/empleados", label: "Carga" },
  { href: "/empleados/clientes", label: "Nuevo cliente" },
];

export default function Navbar({ sesion }: { sesion: Sesion }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setIsOpen(false);

  const links = sesion.rol === "dueno" ? LINKS_DUENO : LINKS_EMPLEADO;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Izquierda (solo móvil): menú hamburguesa */}
        <div className="menu-icon" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? "✖" : "☰"}
        </div>

        {/* Centro (móvil) / izquierda (PC): marca */}
        <div className="navbar-logo">
          <span className="navbar-brand">La Esquina del Fiambre</span>
        </div>

        {/* Links desplegables */}
        <ul className={isOpen ? "navbar-links active" : "navbar-links"}>
          {links.map((l) => {
            // "/dueno" y "/empleados" son exactos (son prefijo de otras rutas);
            // el resto activa también sus subrutas (ej: /dueno/clientes/5).
            const active =
              l.href === "/dueno" || l.href === "/empleados"
                ? pathname === l.href
                : pathname.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link href={l.href} onClick={close} className={active ? "active" : ""}>
                  {l.label}
                </Link>
              </li>
            );
          })}
          <li className="navbar-user">
            <span className="navbar-whoami">
              {sesion.nombre}
              {sesion.rol === "dueno" ? " · Dueño" : ""}
            </span>
            <form action={cerrarSesion}>
              <button type="submit" className="navbar-logout">
                Salir
              </button>
            </form>
          </li>
        </ul>
      </div>
    </nav>
  );
}

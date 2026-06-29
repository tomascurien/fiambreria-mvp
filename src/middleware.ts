import { NextResponse, type NextRequest } from "next/server";

// Ventana de inactividad: si no hay requests por 30 min, la cookie expira y
// el usuario queda deslogueado. Acá la "deslizamos": cada request renueva el maxAge.
const SESION_MAXAGE = 30 * 60;

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const sesion = req.cookies.get("sesion");
  // Solo deslizamos en navegaciones GET. Los server actions son POST (incluido el
  // logout, que borra la cookie): no los tocamos para no competir con ese borrado.
  if (sesion && req.method === "GET") {
    res.cookies.set("sesion", sesion.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESION_MAXAGE,
    });
  }
  return res;
}

export const config = {
  // Todas las rutas salvo estáticos.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

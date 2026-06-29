# Deploy de la demo — Vercel + Neon (Postgres)

App Next.js + Prisma. La base es **Postgres en Neon** (gratis) y el hosting es **Vercel** (gratis).
SQLite no sirve en Vercel (filesystem efímero), por eso usamos Neon.

## 1. Crear la base en Neon

1. Entrá a https://neon.tech y creá un proyecto (region: la más cercana, ej. AWS São Paulo).
2. En **Connection Details** vas a ver dos formas de la URL. Necesitás las dos:
   - **Pooled** (el host tiene `-pooler`) → va en `DATABASE_URL`.
   - **Direct** (sin `-pooler`) → va en `DIRECT_URL`.
   Ambas deben terminar en `?sslmode=require`.

## 2. Crear las tablas y datos de ejemplo

Desde tu máquina, con esas URLs en `.env` (ya está el template):

```bash
npm install
npx prisma db push     # crea las tablas en Neon
npm run db:seed        # carga empleados, productos, clientes y consumos de ejemplo
```

> Esto lo podés correr apuntando a la **misma** base que va a usar la demo, así queda sembrada.

## 3. Subir a Vercel

1. Entrá a https://vercel.com, **Add New → Project**, importá el repo `tomascurien/fiambreria-mvp`.
2. Framework: **Next.js** (se detecta solo). No cambies el build command.
3. En **Environment Variables** (marcá Production y Preview) cargá:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | la URL **pooled** de Neon |
   | `DIRECT_URL` | la URL **direct** de Neon |
   | `AUTH_SECRET` | un secreto nuevo y fuerte (ver abajo) |

4. **Deploy**.

Generá un `AUTH_SECRET` propio para producción (no uses el de desarrollo):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Acceso a la demo

- **Dueño** → usuario `admin` · contraseña `Fiambre.2026!`
- **Empleados** → Pedro / María / Carlos · PIN `1234`

> Antes de mostrársela al cliente conviene cambiar la contraseña del dueño (entrá como dueño y, si
> no hay UI de cambio aún, actualizala en el seed o por Prisma Studio).

## Notas

- **HTTPS**: Vercel ya sirve HTTPS, así que la cookie de sesión `Secure` funciona sin tocar nada.
- **Neon free** suspende la base por inactividad y la reactiva sola en el primer request: la primera
  carga tras un rato puede tardar ~1 segundo. Normal en el plan gratuito.
- El build corre `prisma generate` automáticamente (configurado en `package.json`).
- `.env` no se sube al repo (está en `.gitignore`); las credenciales viven en Vercel.

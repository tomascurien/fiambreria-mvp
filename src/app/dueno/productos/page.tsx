import { prisma } from "@/lib/db";
import { CATEGORIAS } from "@/lib/constants";
import ProductoForm from "./ProductoForm";
import ProductoRow from "./ProductoRow";

export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  const productos = await prisma.producto.findMany({
    orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
  });

  return (
    <div>
      <div className="page-head">
        <h1>Productos</h1>
        <p>Viandas, desayunos y consumos en local con su precio.</p>
      </div>

      <div className="grid-2">
        {/* Alta */}
        <div className="card">
          <div className="card-title">Agregar producto</div>
          <ProductoForm />
        </div>

        {/* Listado por categoría */}
        <div className="card">
          <div className="card-title">Catálogo ({productos.length})</div>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            Cambiar el precio acá <strong>no afecta los consumos ya cargados</strong>: cada
            consumo guarda el precio que tenía al momento de registrarse.
          </p>

          {productos.length === 0 ? (
            <div className="empty">Todavía no hay productos.</div>
          ) : (
            CATEGORIAS.map((cat) => {
              const items = productos.filter((p) => p.categoria === cat.value);
              if (items.length === 0) return null;
              return (
                <div key={cat.value} style={{ marginTop: 14 }}>
                  <div className="card-title" style={{ marginBottom: 8 }}>
                    {cat.label}
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th className="num">Precio</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((p) => (
                        <ProductoRow
                          key={p.id}
                          p={{ id: p.id, nombre: p.nombre, precio: p.precio, activo: p.activo }}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

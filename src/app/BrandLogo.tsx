"use client";

import { useState } from "react";

// Muestra /logo.png si existe; si no (o falla la carga), un monograma de respaldo.
// Para usar tu logo: guardalo como public/logo.png en la raíz del proyecto.
export default function BrandLogo() {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="portada-mono" aria-label="La Esquina del Fiambre">
        EF
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src="/logo.jpg"
      alt="La Esquina del Fiambre"
      className="portada-logo"
      onError={() => setError(true)}
    />
  );
}

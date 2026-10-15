import { Cabecera } from "@/components/Cabecera";
import { FormularioRecuperar } from "./FormularioRecuperar";

// P-04 Recuperar contraseña, pasos 1 y 2: se pide el email y se envía el enlace.
export default function Recuperar() {
  return (
    <main className="pantalla-acceso">
      <Cabecera />
      <FormularioRecuperar />
    </main>
  );
}

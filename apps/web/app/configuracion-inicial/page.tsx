import { redirect } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { consultarConfiguracion } from "@/lib/configuracion";
import { AsistenteConfiguracion } from "./AsistenteConfiguracion";

// P-06 Configuración inicial: solo aparece mientras no haya una administración creada.
export default async function ConfiguracionInicial() {
  if ((await consultarConfiguracion()) === true) redirect("/ingreso");

  return (
    <main className="pantalla-acceso">
      <Cabecera />
      <AsistenteConfiguracion />
    </main>
  );
}

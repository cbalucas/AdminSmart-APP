import { redirect } from "next/navigation";
import { consultarConfiguracion } from "@/lib/configuracion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

// P-01 Inicio: no muestra nada; pasa sola a Configuración inicial, Ingreso o Inicio.
export default async function Raiz() {
  if ((await consultarConfiguracion()) === false) redirect("/configuracion-inicial");

  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  redirect(data?.claims ? "/inicio" : "/ingreso");
}

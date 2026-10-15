import { redirect } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { consultarConfiguracion } from "@/lib/configuracion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { FormularioIngreso } from "./FormularioIngreso";

// P-02 Ingreso
export default async function Ingreso({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if ((await consultarConfiguracion()) === false) redirect("/configuracion-inicial");

  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/inicio");

  const { error } = await searchParams;
  return (
    <main className="pantalla-acceso">
      <Cabecera />
      <FormularioIngreso errorInicial={error === "enlace" ? "ingreso.error_enlace" : undefined} />
    </main>
  );
}

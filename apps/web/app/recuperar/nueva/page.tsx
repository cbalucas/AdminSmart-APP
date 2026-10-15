import { redirect } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { FormularioNuevaContrasena } from "@/components/FormularioNuevaContrasena";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { t } from "@ai/i18n";

// P-04 paso 3: se llega desde el enlace del email, que ya dejó la sesión abierta.
export default async function NuevaContrasena() {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/ingreso?error=enlace");

  return (
    <main className="pantalla-acceso">
      <Cabecera />
      <section className="formulario">
        <h2>{t("nueva_contrasena.titulo")}</h2>
        <FormularioNuevaContrasena />
      </section>
    </main>
  );
}

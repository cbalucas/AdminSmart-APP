import Link from "next/link";
import { redirect } from "next/navigation";
import { t } from "@ai/i18n";
import { FormularioNuevaContrasena } from "@/components/FormularioNuevaContrasena";
import { crearClienteServidor } from "@/lib/supabase/servidor";

// P-46 Mi cuenta (por ahora: datos de la cuenta y cambio de contraseña).
export default async function MiCuenta() {
  const supabase = await crearClienteServidor();
  const { data: sesion } = await supabase.auth.getUser();
  if (!sesion.user) redirect("/ingreso");

  const { data: usuario } = await supabase
    .from("usuario")
    .select("nombre")
    .eq("id", sesion.user.id)
    .maybeSingle();

  // Quien ingresó solo con Google no tiene contraseña propia que cambiar.
  const proveedores = (sesion.user.app_metadata?.providers as string[] | undefined) ?? [];
  const tieneContrasena = proveedores.includes("email");

  return (
    <main className="pantalla-acceso">
      <section className="formulario">
        <h2>{t("cuenta.titulo")}</h2>
        <dl className="datos">
          <dt>{t("cuenta.nombre")}</dt>
          <dd>{usuario?.nombre ?? "—"}</dd>
          <dt>{t("cuenta.email")}</dt>
          <dd>{sesion.user.email}</dd>
        </dl>

        <h3>{t("cuenta.cambiar_contrasena")}</h3>
        {tieneContrasena ? (
          <FormularioNuevaContrasena />
        ) : (
          <p className="muted">{t("cuenta.cuenta_google")}</p>
        )}

        <p className="enlaces">
          <Link href="/inicio">{t("cuenta.volver")}</Link>
        </p>
      </section>
    </main>
  );
}

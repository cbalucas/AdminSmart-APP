import Link from "next/link";
import { t } from "@ai/i18n";
import { TituloConIcono } from "@/components/ElementosFormulario";
import { FormularioNuevaContrasena } from "@/components/FormularioNuevaContrasena";
import { usuarioActual } from "@/lib/usuario-actual";

// P-46 Mi cuenta (por ahora: datos de la cuenta y cambio de contraseña).
export default async function MiCuenta() {
  const { email, proveedores, usuario } = await usuarioActual();

  // Quien ingresó solo con Google no tiene contraseña propia que cambiar.
  const tieneContrasena = proveedores.includes("email");

  return (
    <>
      <TituloConIcono icono="persona">{t("cuenta.titulo")}</TituloConIcono>
      <section className="panel panel-angosto">
        <dl className="datos">
          <dt>{t("cuenta.nombre")}</dt>
          <dd>{usuario?.nombre ?? "—"}</dd>
          <dt>{t("cuenta.email")}</dt>
          <dd>{email}</dd>
        </dl>

        <h3>{t("cuenta.cambiar_contrasena")}</h3>
        {tieneContrasena ? <FormularioNuevaContrasena /> : <p className="muted">{t("cuenta.cuenta_google")}</p>}

        <p className="enlaces">
          <Link href="/inicio">{t("cuenta.volver")}</Link>
        </p>
      </section>
    </>
  );
}

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { t } from "@ai/i18n";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { cerrarSesion } from "./acciones";

// Inicio provisorio: confirma quién ingresó y con qué roles. Los tableros llegan en otras tareas.
export default async function Inicio() {
  const supabase = await crearClienteServidor();
  const { data: sesion } = await supabase.auth.getUser();
  if (!sesion.user) redirect("/ingreso");

  // La base solo devuelve la fila propia (RLS); si no hay fila, la cuenta no tiene acceso.
  const { data: usuario } = await supabase
    .from("usuario")
    .select("nombre, roles, estado")
    .eq("id", sesion.user.id)
    .maybeSingle();

  const salir = (
    <form action={cerrarSesion}>
      <button type="submit" className="boton boton-secundario">
        {t("ingreso.cerrar_sesion")}
      </button>
    </form>
  );

  if (!usuario || usuario.estado !== "activo") {
    return (
      <main className="pantalla-acceso">
        <section className="formulario">
          <Image src="/logo.svg" alt="" width={56} height={56} />
          <h2>{t("ingreso.sin_acceso_titulo")}</h2>
          <p className="muted">{t("ingreso.sin_acceso_texto")}</p>
          <p className="muted">{sesion.user.email}</p>
          {salir}
        </section>
      </main>
    );
  }

  const roles = (usuario.roles as string[]).map((rol) => t(`rol.${rol}`)).join(", ");
  return (
    <main className="pantalla-acceso">
      <section className="formulario">
        <Image src="/logo.svg" alt="" width={56} height={56} />
        <h2>{t("inicio.saludo", { nombre: usuario.nombre })}</h2>
        <p className="muted">{t("inicio.roles", { roles })}</p>
        <span className="etiqueta">{t("inicio.estado")}</span>
        <Link className="boton boton-secundario" href="/mi-cuenta">
          {t("cuenta.titulo")}
        </Link>
        {salir}
      </section>
    </main>
  );
}

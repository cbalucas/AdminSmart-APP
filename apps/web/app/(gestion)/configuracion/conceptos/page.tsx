import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { GestionConceptos } from "@/components/GestionConceptos";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

// P-42 Catálogo de conceptos (solo administrador).
export default async function Conceptos() {
  const { usuario } = await usuarioActual();
  if (!usuario?.roles.includes("administrador")) notFound();

  const supabase = await crearClienteServidor();
  const [{ data: conceptos }, { data: servicios }] = await Promise.all([
    supabase.from("concepto").select("id, nombre, categoria, estado").is("deleted_at", null).order("nombre"),
    supabase.from("bien_servicio").select("concepto_id").is("deleted_at", null),
  ]);
  const usos = new Map<string, number>();
  for (const s of servicios ?? []) usos.set(s.concepto_id as string, (usos.get(s.concepto_id as string) ?? 0) + 1);

  return (
    <>
      <p className="migas">
        <Link href="/configuracion">{t("configuracion.titulo")}</Link> / {t("conceptos.titulo")}
      </p>
      <div className="encabezado">
        <h1>{t("conceptos.titulo")}</h1>
      </div>
      <GestionConceptos
        conceptos={(conceptos ?? []).map((c) => ({
          id: c.id as string,
          nombre: c.nombre as string,
          categoria: c.categoria as string,
          estado: c.estado as string,
          usos: usos.get(c.id as string) ?? 0,
        }))}
      />
    </>
  );
}

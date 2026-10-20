import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { formatearImporte, normalizarNombre, type Moneda } from "@ai/domain";
import { Avatar } from "@/components/Avatar";
import { enlacesDeAvatares } from "@/lib/avatares";
import { esGestion } from "@/lib/menu";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

// P-11 Listado de propietarios.
export default async function Propietarios({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; inactivos?: string }>;
}) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const { q = "", inactivos } = await searchParams;
  const verInactivos = inactivos === "1";

  const supabase = await crearClienteServidor();
  const [{ data: propietarios }, { data: vinculos }, { data: bienes }, { data: saldos }, { data: usuarios }] =
    await Promise.all([
      supabase.from("propietario").select("id, nombre_razon_social, estado, avatar_path").is("deleted_at", null).order("nombre_razon_social"),
      supabase.from("bien_propietario").select("propietario_id, bien_id").is("deleted_at", null),
      supabase.from("bien").select("id, es_gastos_varios, estado").is("deleted_at", null),
      supabase.from("saldo_propietario").select("propietario_id, moneda, saldo"),
      supabase.from("usuario").select("propietario_id").not("propietario_id", "is", null),
    ]);

  // Bienes propios de cada propietario, sin contar su Gastos varios ni los vendidos o dados de baja.
  const bienesPorId = new Map((bienes ?? []).map((b) => [b.id as string, b]));
  const cantidadBienes = new Map<string, number>();
  for (const v of vinculos ?? []) {
    const bien = bienesPorId.get(v.bien_id as string);
    if (!bien || bien.es_gastos_varios || ["vendido", "de_baja"].includes(bien.estado as string)) continue;
    cantidadBienes.set(v.propietario_id as string, (cantidadBienes.get(v.propietario_id as string) ?? 0) + 1);
  }
  const saldoDe = (id: string, moneda: Moneda) =>
    Number((saldos ?? []).find((s) => s.propietario_id === id && s.moneda === moneda)?.saldo ?? 0);
  const conAcceso = new Set((usuarios ?? []).map((u) => u.propietario_id as string));

  const buscado = normalizarNombre(q);
  const lista = (propietarios ?? [])
    .filter((p) => verInactivos || p.estado === "activo")
    .filter((p) => !buscado || normalizarNombre(p.nombre_razon_social as string).includes(buscado));

  const enlaces = await enlacesDeAvatares(lista.map((p) => p.avatar_path as string | null));

  const hayDatos = (propietarios ?? []).length > 0;
  const enlaceInactivos = `/propietarios?${new URLSearchParams({ ...(q ? { q } : {}), ...(verInactivos ? {} : { inactivos: "1" }) })}`;

  return (
    <>
      <div className="encabezado">
        <h1>{t("propietarios.titulo")}</h1>
        <Link href="/propietarios/nuevo" className="boton">{t("propietarios.nuevo")}</Link>
      </div>

      <section className="panel">
        <form className="barra-filtros" role="search">
          {verInactivos && <input type="hidden" name="inactivos" value="1" />}
          <input type="search" name="q" defaultValue={q} placeholder={t("propietarios.buscar")} aria-label={t("propietarios.buscar")} />
          <button type="submit" className="boton boton-secundario">{t("app.buscar")}</button>
          <Link href={enlaceInactivos} className="enlace-filtro">
            {verInactivos ? t("propietarios.ocultar_inactivos") : t("propietarios.ver_inactivos")}
          </Link>
        </form>

        {lista.length === 0 ? (
          <p className="muted">{hayDatos ? t("propietarios.sin_resultados") : t("propietarios.vacio")}</p>
        ) : (
          <div className="tabla-envoltorio">
            <table className="tabla tabla-responsive">
              <thead>
                <tr>
                  <th>{t("propietarios.col_nombre")}</th>
                  <th className="num">{t("propietarios.col_bienes")}</th>
                  <th className="num">{t("propietarios.col_saldo_ars")}</th>
                  <th className="num">{t("propietarios.col_saldo_usd")}</th>
                  <th className="num">{t("propietarios.col_a_depositar")}</th>
                  <th>{t("propietarios.col_estado")}</th>
                  <th>{t("propietarios.col_acceso")}</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id as string}>
                    <td data-label={t("propietarios.col_nombre")}>
                      <Link href={`/propietarios/${p.id}`} className="celda-persona">
                        <Avatar nombre={p.nombre_razon_social as string} url={enlaces.get(p.avatar_path as string)} />
                        <strong>{p.nombre_razon_social as string}</strong>
                      </Link>
                    </td>
                    <td className="num" data-label={t("propietarios.col_bienes")}>{cantidadBienes.get(p.id as string) ?? 0}</td>
                    <td className="num" data-label={t("propietarios.col_saldo_ars")}>{formatearImporte(saldoDe(p.id as string, "ARS"), "ARS")}</td>
                    <td className="num" data-label={t("propietarios.col_saldo_usd")}>{formatearImporte(saldoDe(p.id as string, "USD"), "USD")}</td>
                    <td className="num muted" data-label={t("propietarios.col_a_depositar")}>—</td>
                    <td data-label={t("propietarios.col_estado")}>
                      <span className={p.estado === "activo" ? "estado estado-ok" : "estado estado-neutro"}>
                        {t(`propietarios.estado_${p.estado}`)}
                      </span>
                    </td>
                    <td data-label={t("propietarios.col_acceso")}>{conAcceso.has(p.id as string) ? t("propietarios.con_acceso") : t("propietarios.sin_acceso")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

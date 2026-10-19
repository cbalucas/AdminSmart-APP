import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { calcularPagoPromedio, formatearImporte, type Moneda } from "@ai/domain";
import { Avatar } from "@/components/Avatar";
import { BotonEstadoPropietario } from "@/components/BotonEstadoPropietario";
import { esGestion } from "@/lib/menu";
import { obtenerPropietario } from "@/lib/propietarios";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

const PESTANAS = ["datos", "bienes", "cuenta", "liquidaciones", "usuario", "documentos"] as const;
const HABILITADAS = ["datos", "bienes"];

const fechaHoy = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Cordoba" }).format(new Date());

// P-12 Ficha del propietario.
export default async function FichaPropietario({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const { id } = await params;
  const p = await obtenerPropietario(id);
  if (!p) notFound();
  const { tab = "datos" } = await searchParams;
  const pestana = HABILITADAS.includes(tab) ? tab : "datos";

  const supabase = await crearClienteServidor();
  const hoy = fechaHoy();
  const [{ data: saldos }, { data: depositos }, { data: vinculos }, { data: usuarioVinculado }] = await Promise.all([
    supabase.from("saldo_propietario").select("moneda, saldo").eq("propietario_id", id),
    supabase
      .from("movimiento")
      .select("fecha, haber, moneda")
      .eq("propietario_id", id)
      .eq("tipo", "deposito_propietario")
      .is("deleted_at", null),
    supabase.from("bien_propietario").select("bien_id, porcentaje").eq("propietario_id", id).is("deleted_at", null),
    supabase.from("usuario").select("id").eq("propietario_id", id).maybeSingle(),
  ]);

  const saldoDe = (moneda: Moneda) => Number(saldos?.find((s) => s.moneda === moneda)?.saldo ?? 0);
  const hayMovimientos = (moneda: Moneda) => Boolean(saldos?.some((s) => s.moneda === moneda));
  const promedio = (moneda: Moneda) =>
    calcularPagoPromedio(
      (depositos ?? []).map((d) => ({
        fecha: d.fecha as string,
        centavos: Number(d.haber),
        moneda: d.moneda as Moneda,
        esAjuste: false,
      })),
      moneda,
      hoy,
    );

  const bienIds = (vinculos ?? []).map((v) => v.bien_id as string);
  const { data: bienes } = bienIds.length
    ? await supabase.from("bien").select("id, alias, tipo_bien, estado, es_gastos_varios").in("id", bienIds).is("deleted_at", null)
    : { data: [] };

  const principal = p.emails.find((e) => e.principal) ?? p.emails[0];
  const telefono = p.telefonos[0];
  const activo = p.estado === "activo";
  const tarjeta = (titulo: string, valor: string, nota: string) => (
    <article className="indicador">
      <p className="muted">{titulo}</p>
      <strong className="cifra">{valor}</strong>
      <p className="muted">{nota}</p>
    </article>
  );
  const vacio = t("propietarios.dato_vacio");

  return (
    <>
      <p className="migas">
        <Link href="/propietarios">{t("propietarios.migas")}</Link> / {p.nombre}
      </p>

      <div className="ficha-cabecera">
        <Avatar nombre={p.nombre} tamano={72} />
        <div className="ficha-datos">
          <h1>{p.nombre}</h1>
          <p className="muted">
            {t(`propietarios.tipo_${p.tipoPersona}`)}
            {principal && ` · ${principal.email}`}
            {telefono && ` · ${telefono.numero}`}
          </p>
          <p className="insignias">
            <span className="estado estado-neutro">{t("propietarios.informes_es")}</span>
            <span className={activo ? "estado estado-ok" : "estado estado-neutro"}>{t(`propietarios.estado_${p.estado}`)}</span>
            {usuarioVinculado && <span className="estado estado-ok">{t("propietarios.con_acceso")}</span>}
          </p>
        </div>
        <div className="acciones-rapidas">
          <Link href={`/propietarios/${p.id}/editar`} className="boton boton-secundario">{t("app.editar")}</Link>
          <BotonEstadoPropietario id={p.id} activo={activo} />
        </div>
      </div>

      <section className="indicadores">
        {tarjeta(
          t("propietarios.saldo_ars"),
          formatearImporte(saldoDe("ARS"), "ARS"),
          !hayMovimientos("ARS") ? t("propietarios.saldo_sin_movimientos") : saldoDe("ARS") < 0 ? t("propietarios.saldo_deudor") : t("propietarios.saldo_a_favor"),
        )}
        {tarjeta(
          t("propietarios.saldo_usd"),
          formatearImporte(saldoDe("USD"), "USD"),
          !hayMovimientos("USD") ? t("propietarios.saldo_sin_movimientos") : saldoDe("USD") < 0 ? t("propietarios.saldo_deudor") : t("propietarios.saldo_a_favor"),
        )}
        {tarjeta(t("propietarios.a_depositar"), "—", t("propietarios.a_depositar_nota"))}
        {tarjeta(t("propietarios.pago_promedio"), formatearImporte(promedio("ARS"), "ARS"), t("propietarios.pago_promedio_nota"))}
      </section>

      <nav className="pestanas" aria-label={t("propietarios.titulo")}>
        {PESTANAS.map((clave) =>
          HABILITADAS.includes(clave) ? (
            <Link
              key={clave}
              href={`/propietarios/${p.id}?tab=${clave}`}
              className={pestana === clave ? "pestana activa" : "pestana"}
              aria-current={pestana === clave ? "page" : undefined}
            >
              {t(`propietarios.tab_${clave}`)}
            </Link>
          ) : (
            <span key={clave} className="pestana deshabilitada" title={t("propietarios.tab_proximamente")}>
              {t(`propietarios.tab_${clave}`)}
            </span>
          ),
        )}
      </nav>

      {pestana === "datos" && (
        <section className="panel">
          <dl className="datos datos-ancho">
            <dt>{t("propietarios.campo_telefonos")}</dt>
            <dd>
              {p.telefonos.map((tel) => (
                <span key={tel.numero} className="linea">{t(`propietarios.tel_${tel.tipo}`)}: {tel.numero}</span>
              ))}
            </dd>
            <dt>{t("propietarios.campo_emails")}</dt>
            <dd>
              {p.emails.map((e) => (
                <span key={e.email} className="linea">{e.email}{e.principal && ` (${t("propietarios.principal")})`}</span>
              ))}
            </dd>
            <dt>{t("propietarios.dato_apoderado")}</dt>
            <dd>{p.apoderadoNombre ? `${p.apoderadoNombre}${p.apoderadoContacto ? ` · ${p.apoderadoContacto}` : ""}` : vacio}</dd>
            <dt>{t("propietarios.dato_periodicidad")}</dt>
            <dd>
              {t(`propietarios.per_${p.periodicidadLiquidacion}`)}
              {p.diaLiquidacion !== null && ` · día ${p.diaLiquidacion}`}
            </dd>
            <dt>{t("propietarios.dato_horizonte")}</dt>
            <dd>{t("propietarios.dato_dias", { dias: p.horizonteResumenDias })}</dd>
            <dt>{t("propietarios.dato_fondo")}</dt>
            <dd>
              {p.fondoReservaArs === null && p.fondoReservaUsd === null
                ? vacio
                : [
                    p.fondoReservaArs !== null && formatearImporte(p.fondoReservaArs, "ARS"),
                    p.fondoReservaUsd !== null && formatearImporte(p.fondoReservaUsd, "USD"),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </dd>
            <dt>{t("propietarios.dato_observaciones")}</dt>
            <dd>{p.observaciones ?? vacio}</dd>
          </dl>
        </section>
      )}

      {pestana === "bienes" && (
        <section className="panel">
          {(bienes ?? []).filter((b) => !b.es_gastos_varios).length === 0 && (
            <p className="muted">{t("propietarios.bienes_vacio")}</p>
          )}
          <div className="tabla-envoltorio">
            <table className="tabla">
              <thead>
                <tr>
                  <th>{t("propietarios.col_bien")}</th>
                  <th>{t("propietarios.col_tipo")}</th>
                  <th className="num">{t("propietarios.col_porcentaje")}</th>
                </tr>
              </thead>
              <tbody>
                {(bienes ?? [])
                  .sort((a, b) => Number(a.es_gastos_varios) - Number(b.es_gastos_varios) || String(a.alias).localeCompare(String(b.alias)))
                  .map((b) => {
                    const porcentaje = Number((vinculos ?? []).find((v) => v.bien_id === b.id)?.porcentaje ?? 0);
                    return (
                      <tr key={b.id as string}>
                        <td>
                          <strong>{b.es_gastos_varios ? t("propietarios.bien_gastos_varios") : (b.alias as string)}</strong>
                        </td>
                        <td>{t(`tipo_bien.${b.tipo_bien}`)}</td>
                        <td className="num">{t("propietarios.bien_porcentaje", { porcentaje: String(porcentaje).replace(".", ",") })}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

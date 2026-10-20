import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { AccionIcono } from "@/components/AccionIcono";
import { calcularPagoPromedio, formatearImporte, type Moneda } from "@ai/domain";
import { CambiarFoto } from "@/components/CambiarFoto";
import { BotonEstadoPropietario } from "@/components/BotonEstadoPropietario";
import { SeccionCuentas } from "@/components/SeccionCuentas";
import { TarjetaBien, type FilaDetalle } from "@/components/TarjetaBien";
import { TarjetaIndicador } from "@/components/TarjetaIndicador";
import { enlacesDeAvatares } from "@/lib/avatares";
import { resumenDeBienes, type ItemDetalle } from "@/lib/estado-bienes";
import { esGestion } from "@/lib/menu";
import { conVolver } from "@/lib/volver";
import { obtenerPropietario } from "@/lib/propietarios";
import { calcularResumenDelPropietario } from "@/lib/resumen-deposito";
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
  // El cálculo de "A depositar" arranca ya y corre mientras se leen el resto de los datos.
  const resumenPromesa = calcularResumenDelPropietario(id);
  const [{ data: saldos }, { data: depositos }, { data: anulaciones }, { data: vinculos }, { data: usuarioVinculado }] = await Promise.all([
    supabase.from("saldo_propietario").select("moneda, saldo").eq("propietario_id", id),
    supabase
      .from("movimiento")
      .select("id, fecha, haber, moneda")
      .eq("propietario_id", id)
      .eq("tipo", "deposito_propietario")
      .is("deleted_at", null),
    supabase.from("movimiento").select("contramovimiento_de_id").eq("propietario_id", id).not("contramovimiento_de_id", "is", null),
    supabase.from("bien_propietario").select("bien_id, porcentaje").eq("propietario_id", id).is("deleted_at", null),
    supabase.from("usuario").select("id").eq("propietario_id", id).maybeSingle(),
  ]);

  const anulados = new Set((anulaciones ?? []).map((a) => a.contramovimiento_de_id as string));
  const saldoDe = (moneda: Moneda) => Number(saldos?.find((s) => s.moneda === moneda)?.saldo ?? 0);
  const hayMovimientos = (moneda: Moneda) => Boolean(saldos?.some((s) => s.moneda === moneda));
  const promedio = (moneda: Moneda) =>
    calcularPagoPromedio(
      (depositos ?? [])
        .filter((d) => !anulados.has(d.id as string))
        .map((d) => ({
        fecha: d.fecha as string,
        centavos: Number(d.haber),
        moneda: d.moneda as Moneda,
        esAjuste: false,
      })),
      moneda,
      hoy,
    );

  // "A depositar" con el horizonte del propietario (30 días por defecto).
  const resumenInicial = await resumenPromesa;
  const aDepositar = resumenInicial?.resumenes.filter((x) => x.aDepositar > 0).map((x) => formatearImporte(x.aDepositar, x.moneda)).join(" y ");

  const bienIds = (vinculos ?? []).map((v) => v.bien_id as string);
  const { data: bienes } = bienIds.length
    ? await supabase.from("bien").select("id, alias, tipo_bien, estado, es_gastos_varios").in("id", bienIds).is("deleted_at", null)
    : { data: [] };

  const activo = p.estado === "activo";
  const situaciones = pestana === "bienes" ? await resumenDeBienes(bienIds) : new Map();
  const fechaCorta = (f: string | null) => (f ? f.split("-").reverse().join("/") : "");
  const filas = (items: ItemDetalle[]): FilaDetalle[] =>
    items.map((i) => ({ concepto: i.concepto, fecha: fechaCorta(i.vencimiento), monto: i.monto === null ? t("bien_card.falta_monto") : formatearImporte(i.monto, i.moneda) }));
  const total = (items: ItemDetalle[]) =>
    (["ARS", "USD"] as const)
      .map((m) => ({ m, suma: items.filter((i) => i.moneda === m && i.monto !== null).reduce((x, i) => x + (i.monto as number), 0) }))
      .filter((x) => x.suma > 0)
      .map((x) => formatearImporte(x.suma, x.m))
      .join(" · ");
  const vacio = t("propietarios.dato_vacio");

  return (
    <>
      <p className="migas">
        <Link href="/propietarios">{t("propietarios.migas")}</Link> / {p.nombre}
      </p>

      <div className="ficha-cabecera">
        <CambiarFoto
          propietarioId={p.id}
          organizacionId={usuario.organizacionId}
          nombre={p.nombre}
          url={p.avatarPath ? (await enlacesDeAvatares([p.avatarPath])).get(p.avatarPath) ?? null : null}
          tieneFoto={Boolean(p.avatarPath)}
        />
        <div className="ficha-datos">
          <h1>{p.nombre}</h1>
          <p className="insignias">
            <span className="estado estado-neutro">{t("propietarios.informes_es")}</span>
            <span className={activo ? "estado estado-ok" : "estado estado-neutro"}>{t(`propietarios.estado_${p.estado}`)}</span>
            {usuarioVinculado && <span className="estado estado-ok">{t("propietarios.con_acceso")}</span>}
          </p>
        </div>
        <div className="acciones-rapidas acciones-ficha">
          <AccionIcono href={`/propietarios/${p.id}/editar`} icono="editar" titulo={t("app.editar")} />
          <AccionIcono href={`/propietarios/${p.id}/resumen-deposito`} icono="liquidaciones" titulo={t("propietarios.ver_resumen")} />
          <BotonEstadoPropietario id={p.id} activo={activo} />
        </div>
      </div>

      <section className="indicadores">
        <TarjetaIndicador
          id="saldo-ars"
          icono="cuentas"
          tono="ok"
          titulo={t("propietarios.saldo_ars")}
          valor={formatearImporte(saldoDe("ARS"), "ARS")}
          nota={!hayMovimientos("ARS") ? t("propietarios.saldo_sin_movimientos") : saldoDe("ARS") < 0 ? t("propietarios.saldo_deudor") : t("propietarios.saldo_a_favor")}
        />
        <TarjetaIndicador
          id="saldo-usd"
          icono="cuentas"
          tono="acento"
          titulo={t("propietarios.saldo_usd")}
          valor={formatearImporte(saldoDe("USD"), "USD")}
          nota={!hayMovimientos("USD") ? t("propietarios.saldo_sin_movimientos") : saldoDe("USD") < 0 ? t("propietarios.saldo_deudor") : t("propietarios.saldo_a_favor")}
        />
        <TarjetaIndicador
          id="a-depositar"
          icono="dinero"
          tono="aviso"
          titulo={t("propietarios.a_depositar")}
          valor={aDepositar ?? formatearImporte(0, "ARS")}
          nota={resumenInicial ? t("propietarios.a_depositar_hasta", { fecha: resumenInicial.fechaLimite.split("-").reverse().join("/") }) : t("propietarios.a_depositar_nota")}
        />
        <TarjetaIndicador
          id="pago-promedio"
          icono="reportes"
          titulo={t("propietarios.pago_promedio")}
          valor={formatearImporte(promedio("ARS"), "ARS")}
          observacion={t("propietarios.pago_promedio_nota")}
        />
      </section>

      <nav className="pestanas" aria-label={t("propietarios.titulo")}>
        {PESTANAS.map((clave) =>
          clave === "cuenta" ? (
          <Link key={clave} href={`/cuentas-corrientes?propietario=${p.id}&${conVolver(`/propietarios/${p.id}`)}`} className="pestana">
            {t(`propietarios.tab_${clave}`)}
          </Link>
        ) : HABILITADAS.includes(clave) ? (
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
        <>
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
        {usuario.roles.includes("administrador") && <SeccionCuentas propietarioId={p.id} />}
        </>
      )}

      {pestana === "bienes" && (
        <section className="panel">
          {(bienes ?? []).filter((b) => !b.es_gastos_varios).length === 0 && (
            <p className="muted">{t("propietarios.bienes_vacio")}</p>
          )}
          <ul className="tarjetas-bienes">
            {(bienes ?? [])
              .sort((a, b) => Number(a.es_gastos_varios) - Number(b.es_gastos_varios) || String(a.alias).localeCompare(String(b.alias)))
              .map((b) => {
                const porcentaje = Number((vinculos ?? []).find((v) => v.bien_id === b.id)?.porcentaje ?? 0);
                const r = situaciones.get(b.id as string);
                const primera = r?.proximas[0];
                const linea = !r
                  ? ""
                  : r.vencidas.length > 0
                    ? t("bien_card.vencido", { monto: total(r.vencidas) || `${r.vencidas.length}` })
                    : r.aCompletar.length > 0
                      ? t("bien_card.faltan_montos", { cantidad: String(r.aCompletar.length) })
                      : primera
                        ? t("bien_card.proximo", { fecha: fechaCorta(primera.vencimiento), monto: primera.monto === null ? t("bien_card.falta_monto") : formatearImporte(primera.monto, primera.moneda) })
                        : r.pagadas > 0
                          ? t("bien_card.todo_pagado")
                          : "";
                return (
                  <TarjetaBien
                    key={b.id as string}
                    d={{
                      id: b.id as string,
                      href: `/bienes/${b.id}?${conVolver(`/propietarios/${p.id}?tab=bienes`)}`,
                      nombre: b.es_gastos_varios ? t("propietarios.bien_gastos_varios") : (b.alias as string),
                      tipoBien: b.tipo_bien as string,
                      tipoTexto: t(`tipo_bien.${b.tipo_bien}`),
                      estadoTexto: t(`estado_bien.${b.estado}`),
                      porcentajeTexto: t("propietarios.bien_porcentaje", { porcentaje: String(porcentaje).replace(".", ",") }),
                      situacion: r?.situacion ?? "sin_obligaciones",
                      linea,
                      vencidas: filas(r?.vencidas ?? []),
                      proximas: filas(r?.proximas ?? []),
                      aCompletar: filas(r?.aCompletar ?? []),
                      pagadas: r?.pagadas ?? 0,
                    }}
                  />
                );
              })}
          </ul>
        </section>
      )}
    </>
  );
}

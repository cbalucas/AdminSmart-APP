import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { AccionIcono } from "@/components/AccionIcono";
import { formatearImporte, formatearPeriodo, puedeModificarObligacion, TIPOS_BIEN, type EstadoObligacion } from "@ai/domain";
import { listarBienes, titularesDe } from "@/lib/bienes";
import { generarOcurrenciasSiHaceFalta, listarObligaciones, type FilaObligacion } from "@/lib/obligaciones";
import { VentanaFinDeMes } from "@/components/VentanaFinDeMes";
import { filtrarObligaciones } from "@/lib/filtrar-obligaciones";
import { Icono } from "@/components/Iconos";
import { IconoBien } from "@/components/IconoBien";
import { documentosDe, type DocumentoFila } from "@/lib/documentos";
import { pagosVigentesDe } from "@/lib/pagos";
import { esGestion } from "@/lib/menu";
import { usuarioActual } from "@/lib/usuario-actual";
import { configVentana, itemsDeVentana } from "@/lib/ventana";

interface Filtros {
  aviso?: string;
  completar?: string;
  estado?: string;
  propietario?: string;
  tipo?: string;
  responsable?: string;
  periodo?: string;
}

const ESTADOS: EstadoObligacion[] = ["vencida", "pendiente", "a_completar", "pagada"];
const CLASE_ESTADO: Record<EstadoObligacion, string> = {
  pagada: "estado estado-ok",
  pendiente: "estado estado-neutro",
  vencida: "estado estado-vencida",
  a_completar: "estado estado-ambar",
  anulada: "estado estado-neutro",
};

// Primer titular y cuántos más hay: "Carlos José Paez Allende +2".
const nombresCortos = (nombres: string[]) => (nombres.length <= 1 ? (nombres[0] ?? "") : `${nombres[0]} +${nombres.length - 1}`);

const fechaCorta = (f: string) => f.split("-").reverse().join("/");

// P-26 Obligaciones.
export default async function Obligaciones({ searchParams }: { searchParams: Promise<Filtros> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const f = await searchParams;

  // OBL-05, OBL-09: al abrir la pantalla se crean las ocurrencias siguientes que falten.
  await generarOcurrenciasSiHaceFalta(usuario.organizacionId);
  const [todas, bienes] = await Promise.all([listarObligaciones(), listarBienes()]);
  const [titulares, boletas, pagos] = await Promise.all([
    titularesDe(bienes.map((b) => b.id)),
    documentosDe("obligacion", todas.map((o) => o.id), "boleta"),
    pagosVigentesDe(todas.filter((o) => o.estado === "pagada").map((o) => o.id)),
  ]);
  const esAdmin = usuario.roles.includes("administrador");
  const bienDe = new Map(bienes.map((b) => [b.id, b]));

  const propietarios = new Map<string, string>();
  for (const lista of titulares.values()) for (const x of lista) propietarios.set(x.propietarioId, x.nombre);
  const periodos = [...new Set(todas.map((o) => o.periodo))].sort().reverse();

  // Todos los filtros menos el estado: sobre ese resultado se cuentan las pestañas.
  const { sinEstado, lista } = filtrarObligaciones(todas, f, titulares, bienDe);
  const cuenta = (e: EstadoObligacion) => sinEstado.filter((o) => o.estado === e).length;

  // "Completar ahora": si hoy no es época de la ventana, se abre a pedido. En época, ya la muestra el marco.
  const abrirVentana = f.completar === "1" && !(await configVentana()).enVentana ? await itemsDeVentana() : null;

  const paramsExport = new URLSearchParams();
  for (const k of ["estado", "propietario", "tipo", "responsable", "periodo"] as const) if (f[k]) paramsExport.set(k, f[k] as string);
  const hayFiltros = Boolean(f.propietario || f.tipo || f.responsable || f.periodo);
  const porCompletar = todas.filter((o) => o.estado === "a_completar").length;
  const conMonto = lista.filter((o) => o.monto !== null && o.moneda === "ARS").reduce((s, o) => s + (o.monto as number), 0);

  const enlace = (estado: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, estado })) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `/obligaciones?${s}` : "/obligaciones";
  };

  const fila = (o: FilaObligacion) => {
    const bien = bienDe.get(o.bienId);
    const ts = titulares.get(o.bienId) ?? [];
    return (
      <tr key={o.id}>
        <td data-label={t("obligaciones.col_bien")}>
          <div className="celda-bien-icono">
            {bien && <IconoBien tipo={bien.tipoBien} />}
            <div>
              <strong>{bien ? (bien.esGastosVarios ? `${t("bienes.gastos_varios")} · ${ts[0]?.nombre ?? ""}` : bien.alias) : "—"}</strong>
              {bien && (
                <span className="linea muted">
                  {t(`tipo_bien.${bien.tipoBien}`)}
                  {ts.length > 0 && ` · ${nombresCortos(ts.map((x) => x.nombre))}`}
                </span>
              )}
            </div>
          </div>
        </td>
        <td data-label={t("obligaciones.col_concepto")}>
          {o.concepto}
          <span className="linea muted">
            {o.empresa ?? o.descripcion ?? t("obligaciones.gasto_suelto")}
            {o.esRecurrente && o.frecuencia && ` · ${t("obligaciones.recurrente")} ${t(`obligaciones.frec_${o.frecuencia}`).toLowerCase()}`}
          </span>
        </td>
        <td className="nowrap" data-label={t("obligaciones.col_periodo")}>{formatearPeriodo(o.periodo)}</td>
        <td className="nowrap" data-label={t("obligaciones.col_vencimiento")}>{o.vencimiento ? fechaCorta(o.vencimiento) : <span className="muted">—</span>}</td>
        <td className="num" data-label={t("obligaciones.col_monto")}>
          {o.monto === null ? <span className="falta-monto">{t("obligaciones.falta_monto")}</span> : formatearImporte(o.monto, o.moneda)}
        </td>
        <td data-label={t("obligaciones.col_responsable")}>{t(`obligaciones.responsable_${o.responsable}`)}</td>
        <td className="nowrap" data-label={t("obligaciones.col_estado")}>
          <span className={CLASE_ESTADO[o.estado]}>{t(`obligaciones.estado_${o.estado}`)}</span>
          {pagos.get(o.id) && (
            <span className="linea muted">
              {fechaCorta((pagos.get(o.id) as { fecha: string }).fecha)} · {t(`pagos.quien_${(pagos.get(o.id) as { pagadoPor: string }).pagadoPor}`)}
            </span>
          )}
        </td>
        <td>
          {(boletas.get(o.id) ?? []).length > 0 && (
            <div className="acciones-fila">
              {(boletas.get(o.id) as DocumentoFila[]).map((b, i) =>
                b.url ? (
                  <AccionIcono key={b.id} href={b.url} externo icono="documento" titulo={i === 0 ? t("obligaciones.ver_boleta") : t("obligaciones.ver_boleta_n", { n: i + 1 })} />
                ) : null,
              )}
            </div>
          )}
          {o.estado !== "pagada" && o.estado !== "anulada" && (
            <div className="acciones-fila">
              <AccionIcono href={`/obligaciones/${o.id}/pagar`} icono="dinero" titulo={t("pagos.registrar")} />
            </div>
          )}
          {o.estado === "pagada" && esAdmin && (
            <div className="acciones-fila">
              <AccionIcono href={`/obligaciones/${o.id}/anular-pago`} icono="anular" titulo={t("pagos.anular_pago")} tono="peligro" />
            </div>
          )}
          {puedeModificarObligacion({ pagada: o.estado === "pagada", anulada: o.estado === "anulada" }) && (
            <div className="acciones-fila">
              <AccionIcono href={`/obligaciones/${o.id}/editar`} icono="editar" titulo={t("app.editar")} />
            </div>
          )}
        </td>
      </tr>
    );
  };

  return (
    <>
      <div className="encabezado">
        <div>
          <p className="muted">{t("obligaciones.subtitulo")}</p>
          <h1>{t("obligaciones.titulo")}</h1>
        </div>
        <div className="acciones">
          <AccionIcono href={`/obligaciones/exportar?${paramsExport.toString()}`} icono="descargar" titulo={t("obligaciones.exportar")} />
          <AccionIcono href="/obligaciones/pago-directo" icono="dinero" titulo={t("pagos.registrar_directo")} />
          <AccionIcono href="/obligaciones/nueva" icono="mas" titulo={t("obligaciones.nueva")} tono="primario" />
        </div>
      </div>

      {f.aviso === "comprobante" && <p className="aviso-advertencia" role="status">{t("adjuntos.error_registrar_pago")}</p>}
      {porCompletar > 0 && (
        <div className="aviso-advertencia aviso-con-icono" role="status">
          <Icono nombre="recurrente" tamano={20} />
          <span>{porCompletar === 1 ? t("obligaciones.aviso_a_completar_uno") : t("obligaciones.aviso_a_completar", { cantidad: String(porCompletar) })}</span>
          <Link href="/obligaciones?completar=1" className="aviso-enlace">{t("obligaciones.completar_ahora")}</Link>
        </div>
      )}

      <section className="panel">
        <div className="fila-pildoras">
        <nav className="pildoras" aria-label={t("obligaciones.col_estado")}>
          <Link href={enlace("")} className={!f.estado ? "pildora activa" : "pildora"}>
            {t("obligaciones.estado_todas")} <span className="contador">{sinEstado.length}</span>
          </Link>
          {ESTADOS.map((e) => (
            <Link key={e} href={enlace(e)} className={f.estado === e ? "pildora activa" : "pildora"}>
              {t(`obligaciones.estado_${e}`)} <span className="contador">{cuenta(e)}</span>
            </Link>
          ))}
        </nav>
        <p className="resumen-lista-pie">
          {lista.length === 1
            ? t("obligaciones.resumen_uno", { total: formatearImporte(conMonto, "ARS") })
            : t("obligaciones.resumen", { cantidad: String(lista.length), total: formatearImporte(conMonto, "ARS") })}
        </p>
        </div>

        <form className="filtros filtros-separados filtros-en-fila" role="search">
          {f.estado && <input type="hidden" name="estado" value={f.estado} />}
          <div className="campo">
            <label htmlFor="f-prop">{t("obligaciones.filtro_propietario")}</label>
            <select id="f-prop" name="propietario" defaultValue={f.propietario ?? ""}>
              <option value="">{t("obligaciones.filtro_todos")}</option>
              {[...propietarios].sort((a, b) => a[1].localeCompare(b[1])).map(([id, nombre]) => (
                <option key={id} value={id}>{nombre}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-tipo">{t("obligaciones.filtro_tipo")}</label>
            <select id="f-tipo" name="tipo" defaultValue={f.tipo ?? ""}>
              <option value="">{t("obligaciones.filtro_todos")}</option>
              {TIPOS_BIEN.map((x) => (
                <option key={x} value={x}>{t(`tipo_bien.${x}`)}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-resp">{t("obligaciones.filtro_responsable")}</label>
            <select id="f-resp" name="responsable" defaultValue={f.responsable ?? ""}>
              <option value="">{t("obligaciones.filtro_todos")}</option>
              <option value="propietario">{t("obligaciones.responsable_propietario")}</option>
              <option value="inquilino">{t("obligaciones.responsable_inquilino")}</option>
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-per">{t("obligaciones.filtro_periodo")}</label>
            <select id="f-per" name="periodo" defaultValue={f.periodo ?? ""}>
              <option value="">{t("obligaciones.filtro_todas")}</option>
              {periodos.map((p) => (
                <option key={p} value={p}>{formatearPeriodo(p)}</option>
              ))}
            </select>
          </div>
          <div className="filtros-boton">
            <button type="submit" className="boton boton-secundario">{t("obligaciones.filtrar")}</button>
            {(hayFiltros || f.estado) && <Link href="/obligaciones" className="boton-texto">{t("obligaciones.limpiar")}</Link>}
          </div>
        </form>

        {lista.length === 0 ? (
          <p className="muted">{todas.length === 0 ? t("obligaciones.vacio") : t("obligaciones.sin_resultados")}</p>
        ) : (
          <div className="tabla-envoltorio">
            <table className="tabla tabla-responsive">
              <thead>
                <tr>
                  <th>{t("obligaciones.col_bien")}</th>
                  <th>{t("obligaciones.col_concepto")}</th>
                  <th>{t("obligaciones.col_periodo")}</th>
                  <th>{t("obligaciones.col_vencimiento")}</th>
                  <th className="num">{t("obligaciones.col_monto")}</th>
                  <th>{t("obligaciones.col_responsable")}</th>
                  <th>{t("obligaciones.col_estado")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>{lista.map(fila)}</tbody>
            </table>
          </div>
        )}
      </section>
    {abrirVentana && abrirVentana.items.length > 0 && (
        <Suspense>
          <VentanaFinDeMes items={abrirVentana.items} mes={abrirVentana.mes} />
        </Suspense>
      )}
    </>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { DetalleObligacion } from "@/components/DetalleObligacion";
import { FormularioEnVivo } from "@/components/FormularioEnVivo";
import { TarjetaIndicador } from "@/components/TarjetaIndicador";
import { AccionIcono } from "@/components/AccionIcono";
import { formatearImporte, formatearPeriodo, puedeModificarObligacion, TIPOS_BIEN, type EstadoObligacion } from "@ai/domain";
import { listarBienes, titularesDe } from "@/lib/bienes";
import { generarOcurrenciasSiHaceFalta, listarObligaciones, type FilaObligacion } from "@/lib/obligaciones";
import { VentanaFinDeMes } from "@/components/VentanaFinDeMes";
import { filtrarObligaciones } from "@/lib/filtrar-obligaciones";
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
  q?: string;
}

const ESTADOS: EstadoObligacion[] = ["vencida", "pendiente", "a_completar", "pagada"];
const CLASE_ESTADO: Record<EstadoObligacion, string> = {
  pagada: "estado estado-ok",
  pendiente: "estado estado-neutro",
  vencida: "estado estado-vencida",
  a_completar: "estado estado-ambar",
  anulada: "estado estado-neutro",
};

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


  // Todos los filtros menos el estado: sobre ese resultado se cuentan las pestañas.
  const { sinEstado, lista } = filtrarObligaciones(todas, f, titulares, bienDe);
  const cuenta = (e: EstadoObligacion) => sinEstado.filter((o) => o.estado === e).length;

  // "Completar ahora": si hoy no es época de la ventana, se abre a pedido. En época, ya la muestra el marco.
  const abrirVentana = f.completar === "1" && !(await configVentana()).enVentana ? await itemsDeVentana() : null;

  const paramsExport = new URLSearchParams();
  for (const k of ["estado", "propietario", "tipo", "responsable", "periodo", "q"] as const) if (f[k]) paramsExport.set(k, f[k] as string);
  const hayFiltros = Boolean(f.q || f.tipo);
  const montosDe = (estado: string) => {
    const filas = todas.filter((o) => o.estado === estado);
    const total = (["ARS", "USD"] as const)
      .map((m) => ({ m, suma: filas.filter((o) => o.moneda === m && o.monto !== null).reduce((x, o) => x + (o.monto as number), 0) }))
      .filter((x) => x.suma > 0)
      .map((x) => formatearImporte(x.suma, x.m))
      .join(" · ");
    return { cantidad: filas.length, total };
  };
  const vencidasTot = montosDe("vencida");
  const pendientesTot = montosDe("pendiente");
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
    const nombreBien = bien ? (bien.esGastosVarios ? `${t("bienes.gastos_varios")} · ${ts[0]?.nombre ?? ""}` : bien.alias) : "—";
    const pago = pagos.get(o.id) as { fecha: string; pagadoPor: string } | undefined;
    const boletasDe = ((boletas.get(o.id) ?? []) as DocumentoFila[]).filter((b) => b.url);
    const puedePagar = o.estado !== "pagada" && o.estado !== "anulada";
    const puedeAnularPago = o.estado === "pagada" && esAdmin;
    const puedeEditar = puedeModificarObligacion({ pagada: o.estado === "pagada", anulada: o.estado === "anulada" });
    const monto = o.monto === null ? null : formatearImporte(o.monto, o.moneda);
    const acciones = [
      ...(puedePagar ? [{ href: `/obligaciones/${o.id}/pagar`, icono: "dinero", texto: t("pagos.registrar") }] : []),
      ...(puedeEditar ? [{ href: `/obligaciones/${o.id}/editar`, icono: "editar", texto: t("app.editar") }] : []),
      ...(puedeAnularPago ? [{ href: `/obligaciones/${o.id}/anular-pago`, icono: "anular", texto: t("pagos.anular_pago"), peligro: true }] : []),
    ];
    return (
      <tr key={o.id}>
        <td data-label={t("obligaciones.col_que")}>
          <div className="celda-bien-icono">
            {bien && <IconoBien tipo={bien.tipoBien} />}
            <div>
              <strong>{o.concepto}</strong>
              <span className="linea muted">{nombreBien}</span>
            </div>
          </div>
        </td>
        <td className="nowrap" data-label={t("obligaciones.col_vence")}>
          {o.vencimiento ? fechaCorta(o.vencimiento) : <span className="muted">—</span>}
          <span className="linea muted">{formatearPeriodo(o.periodo)}</span>
        </td>
        <td className="num" data-label={t("obligaciones.col_monto")}>
          {monto ?? <span className="falta-monto">{t("obligaciones.falta_monto")}</span>}
        </td>
        <td className="nowrap" data-label={t("obligaciones.col_estado")}>
          <span className={CLASE_ESTADO[o.estado]}>{t(`obligaciones.estado_${o.estado}`)}</span>
        </td>
        <td>
          <div className="acciones-fila">
            <DetalleObligacion
              d={{
                id: o.id,
                concepto: o.concepto,
                bien: nombreBien,
                tipoBien: bien?.tipoBien ?? "otros",
                tipoBienTexto: bien ? t(`tipo_bien.${bien.tipoBien}`) : "",
                propietarios: ts.map((x) => x.nombre).join(", "),
                quien: o.empresa ?? o.descripcion ?? t("obligaciones.gasto_suelto"),
                recurrencia: o.esRecurrente && o.frecuencia ? t(`obligaciones.frec_${o.frecuencia}`) : "",
                periodo: formatearPeriodo(o.periodo),
                vencimiento: o.vencimiento ? fechaCorta(o.vencimiento) : "",
                monto,
                responsable: t(`obligaciones.responsable_${o.responsable}`),
                estadoTexto: t(`obligaciones.estado_${o.estado}`),
                estadoClase: CLASE_ESTADO[o.estado],
                pago: pago ? `${fechaCorta(pago.fecha)} · ${t(`pagos.quien_${pago.pagadoPor}`)}` : "",
                boletas: boletasDe.map((b, k) => ({ titulo: k === 0 ? t("obligaciones.ver_boleta") : t("obligaciones.ver_boleta_n", { n: k + 1 }), url: b.url as string })),
                acciones,
              }}
            />
            {puedePagar && <AccionIcono href={`/obligaciones/${o.id}/pagar`} icono="dinero" titulo={t("pagos.registrar")} />}
            {puedeAnularPago && <AccionIcono href={`/obligaciones/${o.id}/anular-pago`} icono="anular" titulo={t("pagos.anular_pago")} tono="peligro" />}
            {puedeEditar && <AccionIcono href={`/obligaciones/${o.id}/editar`} icono="editar" titulo={t("app.editar")} />}
          </div>
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

      <section className="indicadores indicadores-compactos">
        <TarjetaIndicador id="vencidas" icono="obligaciones" tono={vencidasTot.cantidad > 0 ? "peligro" : "ok"} titulo={t("indicadores.vencidas")} valor={String(vencidasTot.cantidad)} nota={vencidasTot.total || t("indicadores.nada")} />
        <TarjetaIndicador id="pendientes" icono="calendario" tono="acento" titulo={t("indicadores.proximas")} valor={String(pendientesTot.cantidad)} nota={pendientesTot.total || t("indicadores.nada")} />
        <TarjetaIndicador id="a-completar" icono="recurrente" tono="aviso" titulo={t("indicadores.a_completar")} valor={String(porCompletar)} nota={porCompletar > 0 ? t("indicadores.sin_monto") : t("indicadores.nada")} />
        {porCompletar > 0 && (
          <TarjetaIndicador
            id="aviso-a-completar"
            icono="recurrente"
            tono="aviso"
            destacada
            titulo={porCompletar === 1 ? t("obligaciones.aviso_tarjeta_uno") : t("obligaciones.aviso_tarjeta")}
            valor={String(porCompletar)}
            accion={{ href: "/obligaciones?completar=1", texto: t("obligaciones.completar_ahora") }}
          />
        )}
      </section>

      {f.aviso === "comprobante" && <p className="aviso-advertencia" role="status">{t("adjuntos.error_registrar_pago")}</p>}
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

        <FormularioEnVivo className="filtros filtros-separados filtros-compactos">
          <div className="campo filtro-buscar">
            <input type="search" name="q" defaultValue={f.q ?? ""} placeholder={t("obligaciones.buscar")} aria-label={t("obligaciones.buscar")} autoComplete="off" />
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
          {(hayFiltros || f.estado) && <Link href="/obligaciones" className="boton-texto">{t("obligaciones.limpiar")}</Link>}
        </FormularioEnVivo>

        {lista.length === 0 ? (
          <p className="muted">{todas.length === 0 ? t("obligaciones.vacio") : t("obligaciones.sin_resultados")}</p>
        ) : (
          <div className="tabla-envoltorio">
            <table className="tabla tabla-responsive">
              <thead>
                <tr>
                  <th>{t("obligaciones.col_que")}</th>
                  <th>{t("obligaciones.col_vence")}</th>
                  <th className="num">{t("obligaciones.col_monto")}</th>
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

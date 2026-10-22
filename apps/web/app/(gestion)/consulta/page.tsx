import Link from "next/link";
import { notFound } from "next/navigation";
import { formatearImporte, type Moneda } from "@ai/domain";
import { t } from "@ai/i18n";
import { FormularioEnVivo } from "@/components/FormularioEnVivo";
import { TituloConIcono } from "@/components/ElementosFormulario";
import { TarjetaIndicador } from "@/components/TarjetaIndicador";
import { listarBienes, titularesDe } from "@/lib/bienes";
import { esGestion } from "@/lib/menu";
import { fechaHoy, listarObligaciones, type FilaObligacion } from "@/lib/obligaciones";
import { pagosVigentesDe } from "@/lib/pagos";
import { usuarioActual } from "@/lib/usuario-actual";
import type { EstadoObligacion } from "@ai/domain";

interface Filtros {
  vista?: string;
  propietario?: string;
  bien?: string;
  anio?: string;
  concepto?: string;
}

const CLASE_ESTADO: Record<EstadoObligacion, string> = {
  pagada: "estado estado-ok",
  pendiente: "estado estado-neutro",
  vencida: "estado estado-vencida",
  a_completar: "estado estado-ambar",
  anulada: "estado estado-neutro",
};

const fechaCorta = (f: string) => f.split("-").reverse().join("/");
// Año del gasto: el del período al que corresponde.
const anioDe = (o: FilaObligacion) => o.periodo.slice(0, 4);

/** "$ 1.000 · US$ 50"; "—" si no hay nada. */
function totalTexto(montos: Record<Moneda, number>): string {
  const partes = (["ARS", "USD"] as const).filter((m) => montos[m] !== 0).map((m) => formatearImporte(montos[m], m));
  return partes.length > 0 ? partes.join(" · ") : "—";
}

// Consulta rápida (como la hoja "Consulta" del Excel): se elige bien, año y concepto y se ven todos sus pagos, con totales.
export default async function Consulta({ searchParams }: { searchParams: Promise<Filtros> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const f = await searchParams;
  const anioActual = fechaHoy().slice(0, 4);
  // Sin elegir nada se ve el año en curso, igual que la planilla; "todos" lo muestra completo.
  const anio = f.anio === undefined ? anioActual : f.anio === "todos" ? "" : f.anio;

  const [todas, bienes] = await Promise.all([listarObligaciones(), listarBienes()]);
  const titulares = await titularesDe(bienes.map((b) => b.id));
  const bienDe = new Map(bienes.map((b) => [b.id, b]));
  const nombreBien = (id: string) => {
    const b = bienDe.get(id);
    if (!b) return "—";
    return b.esGastosVarios ? `${t("bienes.gastos_varios")} · ${titulares.get(id)?.[0]?.nombre ?? ""}` : b.alias;
  };

  // Opciones de las listas: lo que existe en los datos que el usuario puede ver.
  const aniosDisponibles = [...new Set([anioActual, ...todas.map(anioDe)])].sort().reverse();
  const conceptos = [...new Set(todas.map((o) => o.concepto))].sort((a, b) => a.localeCompare(b));
  const propietarios = new Map<string, string>();
  for (const lista of titulares.values()) for (const x of lista) propietarios.set(x.propietarioId, x.nombre);
  const esDelPropietario = (bienId: string) => !f.propietario || (titulares.get(bienId) ?? []).some((x) => x.propietarioId === f.propietario);
  const bienesConDatos = bienes.filter((b) => todas.some((o) => o.bienId === b.id) && esDelPropietario(b.id)).sort((a, b) => nombreBien(a.id).localeCompare(nombreBien(b.id)));

  const filtradas = todas
    .filter((o) => o.estado !== "anulada")
    .filter((o) => esDelPropietario(o.bienId))
    .filter((o) => !f.bien || o.bienId === f.bien)
    .filter((o) => !anio || anioDe(o) === anio)
    .filter((o) => !f.concepto || o.concepto === f.concepto);
  const pagos = await pagosVigentesDe(filtradas.filter((o) => o.estado === "pagada").map((o) => o.id));

  // Primero lo que falta pagar (por vencimiento) y después lo pagado (lo más reciente arriba).
  const sinPagar = filtradas.filter((o) => o.estado !== "pagada").sort((a, b) => (a.vencimiento ?? "9999").localeCompare(b.vencimiento ?? "9999"));
  const pagadas = filtradas.filter((o) => o.estado === "pagada").sort((a, b) => (pagos.get(b.id)?.fecha ?? "").localeCompare(pagos.get(a.id)?.fecha ?? ""));
  const lista = [...sinPagar, ...pagadas];

  const pagado: Record<Moneda, number> = { ARS: 0, USD: 0 };
  const pendiente: Record<Moneda, number> = { ARS: 0, USD: 0 };
  for (const o of pagadas) pagado[o.moneda] += pagos.get(o.id)?.importe ?? o.monto ?? 0;
  for (const o of sinPagar) pendiente[o.moneda] += o.monto ?? 0;
  // Control de recurrentes: un renglón por bien + concepto + año (gastos recurrentes o de servicios).
  const hoy = fechaHoy();
  interface Control {
    clave: string;
    bienId: string;
    concepto: string;
    anio: string;
    cargadas: number;
    pagadas: number;
    vencidas: number;
    porVencer: number;
    aCompletar: number;
    falta: Record<Moneda, number>;
  }
  const controles = new Map<string, Control>();
  for (const o of filtradas.filter((x) => x.esRecurrente || x.bienServicioId)) {
    const clave = `${o.bienId}|${o.concepto}|${anioDe(o)}`;
    const c = controles.get(clave) ?? { clave, bienId: o.bienId, concepto: o.concepto, anio: anioDe(o), cargadas: 0, pagadas: 0, vencidas: 0, porVencer: 0, aCompletar: 0, falta: { ARS: 0, USD: 0 } };
    c.cargadas++;
    if (o.estado === "pagada") c.pagadas++;
    else if (o.estado === "vencida" || (o.estado === "pendiente" && o.vencimiento !== null && o.vencimiento < hoy)) {
      c.vencidas++;
      c.falta[o.moneda] += o.monto ?? 0;
    } else if (o.estado === "a_completar") c.aCompletar++;
    else c.porVencer++;
    controles.set(clave, c);
  }
  const filasControl = [...controles.values()].sort(
    (a, b) => Number(b.vencidas > 0) - Number(a.vencidas > 0) || nombreBien(a.bienId).localeCompare(nombreBien(b.bienId)) || a.concepto.localeCompare(b.concepto) || b.anio.localeCompare(a.anio),
  );
  const conFalta = filasControl.filter((c) => c.vencidas > 0);
  const faltaTotal: Record<Moneda, number> = { ARS: 0, USD: 0 };
  for (const c of conFalta) for (const m of ["ARS", "USD"] as const) faltaTotal[m] += c.falta[m];
  const verControl = f.vista === "control";
  const enlaceVista = (vista: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v && k !== "vista") q.set(k, v);
    if (vista !== "pagos") q.set("vista", vista);
    const texto = q.toString();
    return texto ? `/consulta?${texto}` : "/consulta";
  };
  const hayFiltros = Boolean(f.propietario || f.bien || f.concepto || (f.anio !== undefined && f.anio !== anioActual));

  return (
    <>
      <div className="encabezado">
        <div>
          <p className="muted">{t("consulta.subtitulo")}</p>
          <TituloConIcono icono="consulta">{t("consulta.titulo")}</TituloConIcono>
        </div>
      </div>

      <section className="panel">
        <FormularioEnVivo className="filtros filtros-consulta">
          <div className="campo">
            <label htmlFor="q-prop">{t("consulta.propietario")}</label>
            <select id="q-prop" name="propietario" defaultValue={f.propietario ?? ""}>
              <option value="">{t("consulta.todos")}</option>
              {[...propietarios].sort((a, b) => a[1].localeCompare(b[1])).map(([id, nombre]) => (
                <option key={id} value={id}>{nombre}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="q-bien">{t("consulta.bien")}</label>
            <select id="q-bien" name="bien" defaultValue={f.bien ?? ""}>
              <option value="">{t("consulta.todos")}</option>
              {bienesConDatos.map((b) => (
                <option key={b.id} value={b.id}>{nombreBien(b.id)}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="q-anio">{t("consulta.anio")}</label>
            <select id="q-anio" name="anio" defaultValue={f.anio === undefined ? anioActual : f.anio}>
              <option value="todos">{t("consulta.todos")}</option>
              {aniosDisponibles.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="q-concepto">{t("consulta.concepto")}</label>
            <select id="q-concepto" name="concepto" defaultValue={f.concepto ?? ""}>
              <option value="">{t("consulta.todos")}</option>
              {conceptos.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {hayFiltros && <Link href="/consulta" className="boton-texto">{t("consulta.limpiar")}</Link>}
        </FormularioEnVivo>
        <nav className="pildoras" aria-label={t("consulta.titulo")}>
          <Link href={enlaceVista("pagos")} className={!verControl ? "pildora activa" : "pildora"}>{t("consulta.vista_pagos")}</Link>
          <Link href={enlaceVista("control")} className={verControl ? "pildora activa" : "pildora"}>{t("consulta.vista_control")}</Link>
        </nav>
      </section>

      {verControl ? (
        <>
          <section className="indicadores">
            <TarjetaIndicador id="controlados" icono="consulta" tono="acento" titulo={t("consulta.control_controlados")} valor={String(filasControl.length)} />
            <TarjetaIndicador id="al-dia" icono="obligaciones" tono="ok" titulo={t("consulta.control_al_dia")} valor={String(filasControl.length - conFalta.length)} />
            <TarjetaIndicador id="falta" icono="cuentas" tono={conFalta.length > 0 ? "peligro" : "ok"} titulo={t("consulta.control_total_falta")} valor={totalTexto(faltaTotal)} nota={`${conFalta.length} · ${t("consulta.control_falta")}`} />
          </section>
          <section className="panel">
            <p className="muted">{t("consulta.control_ayuda")}</p>
            {filasControl.length === 0 ? (
              <p className="muted">{t("consulta.control_vacio")}</p>
            ) : (
              <div className="tabla-envoltorio">
                <table className="tabla tabla-compacta tabla-responsive">
                  <thead>
                    <tr>
                      <th>{t("consulta.col_bien")}</th>
                      <th>{t("consulta.col_concepto")}</th>
                      <th>{t("consulta.col_anio")}</th>
                      <th className="num">{t("consulta.col_cargadas")}</th>
                      <th className="num">{t("consulta.col_pagadas")}</th>
                      <th className="num">{t("consulta.col_vencidas")}</th>
                      <th className="num">{t("consulta.col_por_vencer")}</th>
                      <th className="num">{t("consulta.col_a_completar")}</th>
                      <th className="num">{t("consulta.col_falta_monto")}</th>
                      <th>{t("consulta.col_estado")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasControl.map((c) => (
                      <tr key={c.clave}>
                        <td data-label={t("consulta.col_bien")}><strong>{nombreBien(c.bienId)}</strong></td>
                        <td data-label={t("consulta.col_concepto")}>{c.concepto}</td>
                        <td data-label={t("consulta.col_anio")}>{c.anio}</td>
                        <td className="num" data-label={t("consulta.col_cargadas")}>{c.cargadas}</td>
                        <td className="num" data-label={t("consulta.col_pagadas")}>{c.pagadas}</td>
                        <td className="num" data-label={t("consulta.col_vencidas")}>{c.vencidas}</td>
                        <td className="num" data-label={t("consulta.col_por_vencer")}>{c.porVencer}</td>
                        <td className="num" data-label={t("consulta.col_a_completar")}>{c.aCompletar}</td>
                        <td className="num" data-label={t("consulta.col_falta_monto")}>{c.vencidas > 0 ? totalTexto(c.falta) : <span className="muted">—</span>}</td>
                        <td className="nowrap" data-label={t("consulta.col_estado")}>
                          <span className={c.vencidas > 0 ? "estado estado-vencida" : "estado estado-ok"}>{c.vencidas > 0 ? t("consulta.control_falta") : t("consulta.control_al_dia")}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        <>
      <section className="indicadores">
        <TarjetaIndicador id="encontrados" icono="consulta" tono="acento" titulo={t("consulta.encontrados")} valor={String(lista.length)} />
        <TarjetaIndicador id="pagado" icono="cuentas" tono="ok" titulo={t("consulta.total_pagado")} valor={totalTexto(pagado)} nota={`${pagadas.length} · ${t("obligaciones.estado_pagada")}`} />
        <TarjetaIndicador
          id="sin-pagar"
          icono="obligaciones"
          tono={sinPagar.length > 0 ? "aviso" : "ok"}
          titulo={t("consulta.total_sin_pagar")}
          valor={totalTexto(pendiente)}
          nota={`${sinPagar.length} · ${t("consulta.sin_pagar")}`}
        />
      </section>

      <section className="panel">
        {lista.length === 0 ? (
          <p className="muted">{t("consulta.vacio")}</p>
        ) : (
          <div className="tabla-envoltorio">
            <table className="tabla tabla-compacta tabla-responsive">
              <thead>
                <tr>
                  <th>{t("consulta.col_fecha_pago")}</th>
                  <th>{t("consulta.col_bien")}</th>
                  <th>{t("consulta.col_concepto")}</th>
                  <th>{t("consulta.col_anio")}</th>
                  <th>{t("consulta.col_detalle")}</th>
                  <th className="num">{t("consulta.col_monto")}</th>
                  <th>{t("consulta.col_vencimiento")}</th>
                  <th>{t("consulta.col_estado")}</th>
                  <th>{t("consulta.col_observaciones")}</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((o) => {
                  const pago = pagos.get(o.id);
                  const detalle = o.descripcion ?? (o.empresa ?? "");
                  const observaciones = [o.observaciones, pago?.observaciones].filter(Boolean).join(" · ");
                  return (
                    <tr key={o.id}>
                      <td className="nowrap" data-label={t("consulta.col_fecha_pago")}>{pago ? fechaCorta(pago.fecha) : <span className="muted">—</span>}</td>
                      <td data-label={t("consulta.col_bien")}>
                        <strong>{nombreBien(o.bienId)}</strong>
                      </td>
                      <td data-label={t("consulta.col_concepto")}>{o.concepto}</td>
                      <td data-label={t("consulta.col_anio")}>{anioDe(o)}</td>
                      <td data-label={t("consulta.col_detalle")}>{detalle || <span className="muted">—</span>}</td>
                      <td className="num" data-label={t("consulta.col_monto")}>
                        {pago ? formatearImporte(pago.importe, o.moneda) : o.monto === null ? <span className="falta-monto">{t("obligaciones.falta_monto")}</span> : formatearImporte(o.monto, o.moneda)}
                      </td>
                      <td className="nowrap" data-label={t("consulta.col_vencimiento")}>{o.vencimiento ? fechaCorta(o.vencimiento) : <span className="muted">—</span>}</td>
                      <td className="nowrap" data-label={t("consulta.col_estado")}>
                        <span className={CLASE_ESTADO[o.estado]}>{o.estado === "pagada" ? t("obligaciones.estado_pagada") : t(`obligaciones.estado_${o.estado}`)}</span>
                      </td>
                      <td data-label={t("consulta.col_observaciones")}>{observaciones || <span className="muted">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
        </>
      )}
    </>
  );
}

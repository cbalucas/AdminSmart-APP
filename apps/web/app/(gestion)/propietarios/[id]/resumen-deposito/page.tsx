import Link from "next/link";
import { notFound } from "next/navigation";
import { elegirTelefonoWhatsApp, formatearImporte, numeroParaWhatsApp, type Moneda } from "@ai/domain";
import { t } from "@ai/i18n";
import { Avatar } from "@/components/Avatar";
import { EnviarWhatsApp } from "@/components/EnviarWhatsApp";
import { esGestion } from "@/lib/menu";
import { obtenerPropietario } from "@/lib/propietarios";
import { calcularResumenDelPropietario, historialDeResumenes, leerHorizonte, mensajeWhatsApp, ultimoEnvioDeResumen } from "@/lib/resumen-deposito";
import { usuarioActual } from "@/lib/usuario-actual";
import { generarResumenOficial } from "./acciones";

interface Filtros {
  h?: string;
  fecha?: string;
  moneda?: string;
  generado?: string;
}

const fechaCorta = (f: string) => f.split("-").reverse().join("/");
const periodoCorto = (p: string) => `${p.slice(5, 7)}/${p.slice(0, 4)}`;

// P-34 Resumen de depósito: cuánto debe depositar el propietario para cubrir sus obligaciones hasta la fecha límite.
export default async function ResumenDeposito({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Filtros> }) {
  const { usuario } = await usuarioActual();
  if (!usuario) notFound();
  const { id } = await params;
  // La gestión ve a cualquier propietario; un propietario solo mira el suyo, sin generar ni enviar.
  const soloLectura = !esGestion(usuario.roles);
  if (soloLectura && usuario.propietarioId !== id) notFound();
  const f = await searchParams;
  const p = await obtenerPropietario(id);
  if (!p) notFound();

  const horizonte = leerHorizonte(f.h, f.fecha, p.horizonteResumenDias);
  const [r, historial] = await Promise.all([calcularResumenDelPropietario(id, horizonte), historialDeResumenes(id)]);
  if (!r) notFound();
  const ultimoEnvio = soloLectura ? null : await ultimoEnvioDeResumen(historial);

  const hayUsd = r.resumenes.some((x) => x.moneda === "USD");
  const moneda: Moneda = f.moneda === "USD" && hayUsd ? "USD" : "ARS";
  const resumen = r.resumenes.find((x) => x.moneda === moneda);
  if (!resumen) notFound();

  const enlace = (cambios: Partial<Filtros>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ h: f.h, fecha: f.fecha, moneda, ...cambios })) if (v) q.set(k, v);
    return `/propietarios/${id}/resumen-deposito?${q.toString()}`;
  };
  const tipo = horizonte.tipo;
  const etiquetaHorizonte =
    tipo === "dias" ? t("resumen.horizonte_dias", { dias: horizonte.dias, fecha: fechaCorta(r.fechaLimite) }) : tipo === "fin_de_mes" ? t("resumen.horizonte_fin_mes", { fecha: fechaCorta(r.fechaLimite) }) : t("resumen.horizonte_fecha", { fecha: fechaCorta(r.fechaLimite) });
  const d = r.deposito;
  const parametrosPdf = new URLSearchParams();
  if (f.h) parametrosPdf.set("h", f.h);
  if (f.fecha) parametrosPdf.set("fecha", f.fecha);
  const telefonoWa = elegirTelefonoWhatsApp(r.telefonos);
  const motivoWa = !telefonoWa ? t("resumen.sin_telefono") : !numeroParaWhatsApp(telefonoWa.numero) ? t("resumen.telefono_invalido") : null;
  const generado = f.generado ? historial.find((x) => x.id === f.generado) : undefined;
  const vacio = t("resumen.sin_dato");
  const total = (n: number) => formatearImporte(n, moneda);

  return (
    <>
      <p className="migas">
        {soloLectura ? (
          <Link href="/inicio">{t("resumen.migas_inicio")}</Link>
        ) : (
          <>
            <Link href="/propietarios">{t("propietarios.migas")}</Link> / <Link href={`/propietarios/${id}`}>{p.nombre}</Link>
          </>
        )}
      </p>

      <div className="resumen-cabecera">
        <div className="resumen-titulo">
          <Avatar nombre={p.nombre} tamano={56} url={null} />
          <div>
            <h1>{t("resumen.titulo")}</h1>
            <p className="muted">{t("resumen.subtitulo", { nombre: p.nombre })}</p>
          </div>
        </div>
        <div className="resumen-controles">
          <nav className="segmentado" aria-label={t("resumen.horizonte")}>
            <Link href={enlace({ h: "", fecha: "" })} className={tipo === "dias" ? "segmento activo" : "segmento"}>
              {t("resumen.opcion_dias", { dias: p.horizonteResumenDias })}
            </Link>
            <Link href={enlace({ h: "fin_de_mes", fecha: "" })} className={tipo === "fin_de_mes" ? "segmento activo" : "segmento"}>
              {t("resumen.opcion_fin_mes")}
            </Link>
          </nav>
          <form className="resumen-fecha" role="search">
            <input type="hidden" name="h" value="fecha" />
            <input type="hidden" name="moneda" value={moneda} />
            <label htmlFor="r-fecha" className={tipo === "fecha" ? "etiqueta-activa" : undefined}>{t("resumen.opcion_fecha")}</label>
            <input id="r-fecha" name="fecha" type="date" defaultValue={tipo === "fecha" ? horizonte.fecha : ""} />
            <button type="submit" className="boton boton-secundario">{t("resumen.calcular")}</button>
          </form>
          {hayUsd && (
            <nav className="segmentado" aria-label={t("cuentas.moneda")}>
              <Link href={enlace({ moneda: "ARS" })} className={moneda === "ARS" ? "segmento activo" : "segmento"}>ARS · $</Link>
              <Link href={enlace({ moneda: "USD" })} className={moneda === "USD" ? "segmento activo" : "segmento"}>USD · US$</Link>
            </nav>
          )}
        </div>
      </div>

      {generado && (
        <p className="aviso-ok" role="status">
          {t("resumen.generado", { numero: generado.numero })}{" "}
          <a href={`/propietarios/${id}/resumen-deposito/pdf/${generado.id}`}>{t("resumen.descargar")}</a>
        </p>
      )}
      {f.generado === "error" && <p className="aviso-error" role="alert">{t("resumen.error_generar")}</p>}
      {f.generado === "sin_pdf" && <p className="aviso-error" role="alert">{t("resumen.sin_pdf", { numero: historial.find((x) => !x.tienePdf)?.numero ?? "" })}</p>}

      <div className="resumen-columnas">
        <div className="resumen-principal">
          <section className="resumen-importe">
            <p>{t("resumen.a_depositar")}</p>
            <strong className="cifra">{total(resumen.aDepositar)}</strong>
            <p className="muted">
              {resumen.aDepositar === 0 && resumen.saldoATransferir > 0
                ? t("resumen.saldo_a_transferir", { monto: total(resumen.saldoATransferir) })
                : t("resumen.cubre", { fecha: fechaCorta(r.fechaLimite), saldo: total(resumen.saldoDisponible) })}
            </p>
            <p className="muted">{etiquetaHorizonte}</p>
          </section>

          <section className="panel">
            <h2>{t("resumen.pendientes")}</h2>
            {resumen.pendientes.length === 0 ? (
              <p className="muted">{t("resumen.sin_pendientes")}</p>
            ) : (
              <div className="tabla-envoltorio">
                <table className="tabla tabla-compacta">
                  <thead>
                    <tr>
                      <th>{t("resumen.col_bien")}</th>
                      <th>{t("resumen.col_concepto")}</th>
                      <th>{t("resumen.col_periodo")}</th>
                      <th>{t("resumen.col_vencimiento")}</th>
                      <th className="num">{t("resumen.col_monto")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.pendientes.map((o) => (
                      <tr key={o.id}>
                        <td>{o.bien}</td>
                        <td>
                          {o.concepto}
                          {o.porcentaje < 100 && <span className="linea muted">{t("resumen.su_parte", { porcentaje: String(o.porcentaje).replace(".", ",") })}</span>}
                        </td>
                        <td className="nowrap">{periodoCorto(o.periodo)}</td>
                        <td className="nowrap">{fechaCorta(o.vencimiento as string)}</td>
                        <td className="num">{total(o.monto as number)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <dl className="resumen-calculo">
              <div><dt>{t("resumen.total_pendiente")}</dt><dd>{total(resumen.sumaObligaciones)}</dd></div>
              <div><dt>{t("resumen.menos_saldo")}</dt><dd>{resumen.saldoDisponible >= 0 ? `− ${total(resumen.saldoDisponible)}` : `+ ${total(-resumen.saldoDisponible)}`}</dd></div>
              {resumen.reposicionFondo > 0 && <div><dt>{t("resumen.reposicion")}</dt><dd>+ {total(resumen.reposicionFondo)}</dd></div>}
              <div className="resumen-calculo-total"><dt>{t("resumen.a_depositar")}</dt><dd>{total(resumen.aDepositar)}</dd></div>
            </dl>
            {resumen.saldoDisponible < 0 && <p className="muted">{t("resumen.nota_saldo_deudor")}</p>}
          </section>

          {resumen.futuras.length > 0 && (
            <section className="panel">
              <h2>{t("resumen.futuras")}</h2>
              <div className="tabla-envoltorio">
                <table className="tabla tabla-compacta">
                  <thead>
                    <tr>
                      <th>{t("resumen.col_bien")}</th>
                      <th>{t("resumen.col_concepto")}</th>
                      <th>{t("resumen.col_periodo")}</th>
                      <th>{t("resumen.col_vencimiento")}</th>
                      <th className="num">{t("resumen.col_monto")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.futuras.map((o) => (
                      <tr key={o.id}>
                        <td>{o.bien}</td>
                        <td>
                          {o.concepto}
                          {o.porcentaje < 100 && <span className="linea muted">{t("resumen.su_parte", { porcentaje: String(o.porcentaje).replace(".", ",") })}</span>}
                        </td>
                        <td className="nowrap">{periodoCorto(o.periodo)}</td>
                        <td className="nowrap">{fechaCorta(o.vencimiento as string)}</td>
                        <td className="num">{total(o.monto as number)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <dl className="resumen-calculo">
                <div className="resumen-calculo-total"><dt>{t("resumen.total_futuras")}</dt><dd>{total(resumen.futuras.reduce((acc, o) => acc + (o.monto as number), 0))}</dd></div>
              </dl>
              <p className="muted">{t("resumen.futuras_nota")}</p>
            </section>
          )}

          {resumen.aConfirmar.length > 0 && (
            <section className="panel">
              <h2>{t("resumen.a_confirmar")}</h2>
              <ul className="resumen-lista">
                {resumen.aConfirmar.map((o) => (
                  <li key={o.id}>
                    <span>{o.concepto} · {o.bien} · {periodoCorto(o.periodo)}</span>
                    <em className="falta-monto">{t("resumen.a_confirmar_monto")}</em>
                  </li>
                ))}
              </ul>
              <p className="muted">{t("resumen.a_confirmar_nota")}</p>
            </section>
          )}

          {resumen.posibles.length > 0 && (
            <section className="panel">
              <h2>{t("resumen.posibles")}</h2>
              <ul className="resumen-lista">
                {resumen.posibles.map((o) => (
                  <li key={o.id}>
                    <span>{o.concepto}{o.descripcion ? ` · ${o.descripcion}` : ""} · {o.bien}</span>
                    <strong>{total(o.monto as number)}</strong>
                  </li>
                ))}
              </ul>
              <p className="muted">{t("resumen.posibles_nota")}</p>
            </section>
          )}
        </div>

        <aside className="resumen-lateral">
          <section className="panel">
            <h2>{t("resumen.datos_deposito")}</h2>
            <dl className="datos">
              <dt>{t("resumen.banco")}</dt><dd>{d.banco ?? vacio}</dd>
              <dt>{t("resumen.titular")}</dt><dd>{d.titular ?? vacio}</dd>
              <dt>{t("resumen.cbu")}</dt><dd>{d.cbu ?? vacio}</dd>
              <dt>{t("resumen.alias")}</dt><dd>{d.alias ?? vacio}</dd>
            </dl>
            {!d.banco && !d.cbu && !d.alias && <p className="aviso-advertencia">{t("resumen.completar_datos")}</p>}
          </section>

          {soloLectura ? (
            <section className="panel">
              <h2>{t("resumen.titulo")}</h2>
              <div className="acciones-fila">
                <a href={`/propietarios/${id}/resumen-deposito/pdf?${parametrosPdf.toString()}`} target="_blank" rel="noreferrer" className="boton boton-secundario">{t("resumen.ver_pdf")}</a>
              </div>
              <p className="muted">{t("resumen.solo_lectura")}</p>
            </section>
          ) : (
            <>
          <section className="panel">
            <h2>{t("resumen.enviar")}</h2>
            <div className="acciones-fila">
              <a href={`/propietarios/${id}/resumen-deposito/pdf?${parametrosPdf.toString()}`} target="_blank" rel="noreferrer" className="boton boton-secundario">{t("resumen.ver_pdf")}</a>
              <button type="button" className="boton boton-secundario" disabled title={t("resumen.email_proximamente")}>{t("resumen.enviar_email")}</button>
            </div>
            <form action={generarResumenOficial.bind(null, id, f.h ?? "", f.fecha ?? "")}>
              <button type="submit" className="boton">{t("resumen.generar_oficial")}</button>
            </form>
            <p className="muted">{t("resumen.ayuda_oficial")}</p>
            <EnviarWhatsApp
              propietarioId={id}
              h={f.h ?? ""}
              fecha={f.fecha ?? ""}
              textoInicial={await mensajeWhatsApp(r)}
              telefono={telefonoWa?.numero ?? null}
              motivoDeshabilitado={motivoWa}
            />
            {ultimoEnvio && (
              <p className="muted">
                {t("resumen.ultimo_envio", {
                  fecha: new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Cordoba" }).format(new Date(ultimoEnvio.fecha)),
                  canal: t(`resumen.canal_${ultimoEnvio.canal}`),
                  numero: ultimoEnvio.numero,
                })}
              </p>
            )}
          </section>
            </>
          )}
        </aside>
      </div>

      <section className="panel">
        <h2>{t("resumen.historial")}</h2>
        {historial.length === 0 ? (
          <p className="muted">{t("resumen.sin_historial")}</p>
        ) : (
          <div className="tabla-envoltorio">
            <table className="tabla tabla-compacta">
              <thead>
                <tr>
                  <th>{t("resumen.col_numero")}</th>
                  <th>{t("resumen.col_fecha")}</th>
                  <th>{t("resumen.col_horizonte")}</th>
                  <th className="num">{t("resumen.col_a_depositar")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.id}>
                    <td className="nowrap"><strong>{h.numero}</strong></td>
                    <td className="nowrap">{fechaCorta(h.fecha)}</td>
                    <td className="nowrap">{fechaCorta(h.fechaLimite)}</td>
                    <td className="num">{h.montos.map((m) => formatearImporte(m.aDepositar, m.moneda)).join(" · ")}</td>
                    <td>
                      {h.tienePdf ? (
                        <a className="boton-texto" href={`/propietarios/${id}/resumen-deposito/pdf/${h.id}`}>{t("resumen.descargar")}</a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
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

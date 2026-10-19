import Link from "next/link";
import { notFound } from "next/navigation";
import { formatearImporte, type Moneda } from "@ai/domain";
import { t } from "@ai/i18n";
import { Avatar } from "@/components/Avatar";
import { esGestion } from "@/lib/menu";
import { obtenerPropietario } from "@/lib/propietarios";
import { calcularResumenDelPropietario, leerHorizonte, mensajeWhatsApp } from "@/lib/resumen-deposito";
import { usuarioActual } from "@/lib/usuario-actual";

interface Filtros {
  h?: string;
  fecha?: string;
  moneda?: string;
}

const fechaCorta = (f: string) => f.split("-").reverse().join("/");
const periodoCorto = (p: string) => `${p.slice(5, 7)}/${p.slice(0, 4)}`;

// P-34 Resumen de depósito: cuánto debe depositar el propietario para cubrir sus obligaciones hasta la fecha límite.
export default async function ResumenDeposito({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Filtros> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const { id } = await params;
  const f = await searchParams;
  const p = await obtenerPropietario(id);
  if (!p) notFound();

  const horizonte = leerHorizonte(f.h, f.fecha, p.horizonteResumenDias);
  const r = await calcularResumenDelPropietario(id, horizonte);
  if (!r) notFound();

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
  const vacio = t("resumen.sin_dato");
  const total = (n: number) => formatearImporte(n, moneda);

  return (
    <>
      <p className="migas">
        <Link href="/propietarios">{t("propietarios.migas")}</Link> / <Link href={`/propietarios/${id}`}>{p.nombre}</Link>
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

          <section className="panel">
            <h2>{t("resumen.enviar")}</h2>
            <div className="acciones-fila">
              <button type="button" className="boton boton-secundario" disabled title={t("resumen.proximamente")}>{t("resumen.ver_pdf")}</button>
              <button type="button" className="boton" disabled title={t("resumen.proximamente")}>{t("resumen.enviar_email")}</button>
              <button type="button" className="boton" disabled title={t("resumen.proximamente")}>{t("resumen.enviar_whatsapp")}</button>
            </div>
            <p className="muted">{t("resumen.vista_previa_whatsapp")}</p>
            <p className="mensaje-previo">{mensajeWhatsApp(r)}</p>
          </section>
        </aside>
      </div>
    </>
  );
}

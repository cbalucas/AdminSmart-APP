import Link from "next/link";
import { notFound } from "next/navigation";
import { formatearImporte, type Moneda } from "@ai/domain";
import { t } from "@ai/i18n";
import { bienesDelPropietario, libroDelPropietario, propietariosParaCuenta, tieneCuentaEnDolares } from "@/lib/cuentas-corrientes";
import { documentosDe, type DocumentoFila } from "@/lib/documentos";
import { esGestion } from "@/lib/menu";
import { usuarioActual } from "@/lib/usuario-actual";

interface Filtros {
  propietario?: string;
  moneda?: string;
  bien?: string;
  desde?: string;
  hasta?: string;
}

const fechaCorta = (f: string) => f.split("-").reverse().join("/");

// P-32 Cuenta corriente de un propietario, por moneda.
export default async function CuentasCorrientes({ searchParams }: { searchParams: Promise<Filtros> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const f = await searchParams;
  const esAdmin = usuario.roles.includes("administrador");

  const propietarios = await propietariosParaCuenta();
  const propietario = propietarios.find((p) => p.id === f.propietario) ?? propietarios[0];
  if (!propietario) {
    return (
      <>
        <div className="encabezado"><h1>{t("cuentas.titulo")}</h1></div>
        <section className="panel"><p className="muted">{t("cuentas.sin_propietarios")}</p></section>
      </>
    );
  }

  const moneda: Moneda = f.moneda === "USD" ? "USD" : "ARS";
  const [bienes, hayDolares, libro] = await Promise.all([
    bienesDelPropietario(propietario.id),
    tieneCuentaEnDolares(propietario.id),
    libroDelPropietario({ propietarioId: propietario.id, moneda, bienId: f.bien || undefined, desde: f.desde || undefined, hasta: f.hasta || undefined }),
  ]);
  const comprobantes = await documentosDe("movimiento", libro.filas.map((m) => m.id));
  const etiquetaBien = (b: { nombre: string; esGeneral: boolean }) => (b.esGeneral ? t("cuentas.general") : b.nombre);
  const nombreBien = new Map(bienes.map((b) => [b.id, etiquetaBien(b)]));

  const enlace = (cambios: Partial<Filtros>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, propietario: propietario.id, ...cambios })) if (v) q.set(k, v);
    return `/cuentas-corrientes?${q.toString()}`;
  };
  const alta = (ruta: string) => `/cuentas-corrientes/${ruta}?propietario=${propietario.id}&moneda=${moneda}`;
  const hayFiltros = Boolean(f.bien || f.desde || f.hasta);

  return (
    <>
      <div className="encabezado">
        <div>
          <p className="muted">{t("cuentas.subtitulo")}</p>
          <h1>{t("cuentas.titulo")}</h1>
        </div>
        {esAdmin && (
          <div className="acciones">
            <Link href={alta("traspaso")} className="boton boton-secundario">{t("cuentas.traspaso")}</Link>
            <Link href={alta("movimiento")} className="boton">{t("cuentas.nuevo_movimiento")}</Link>
          </div>
        )}
      </div>

      <section className="panel">
        <form className="filtros filtros-separados" role="search">
          <input type="hidden" name="moneda" value={moneda} />
          <div className="campo">
            <label htmlFor="c-prop">{t("cuentas.propietario")}</label>
            <select id="c-prop" name="propietario" defaultValue={propietario.id}>
              {propietarios.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="c-bien">{t("cuentas.bien")}</label>
            <select id="c-bien" name="bien" defaultValue={f.bien ?? ""}>
              <option value="">{t("cuentas.todos_bienes")}</option>
              {bienes.map((b) => (
                <option key={b.id} value={b.id}>{etiquetaBien(b)}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="c-desde">{t("cuentas.desde")}</label>
            <input id="c-desde" name="desde" type="date" defaultValue={f.desde ?? ""} />
          </div>
          <div className="campo">
            <label htmlFor="c-hasta">{t("cuentas.hasta")}</label>
            <input id="c-hasta" name="hasta" type="date" defaultValue={f.hasta ?? ""} />
          </div>
          <div className="filtros-pie">
            <nav className="pildoras" aria-label={t("cuentas.moneda")}>
              <Link href={enlace({ moneda: "ARS" })} className={moneda === "ARS" ? "pildora activa" : "pildora"}>ARS</Link>
              {(hayDolares || moneda === "USD") && <Link href={enlace({ moneda: "USD" })} className={moneda === "USD" ? "pildora activa" : "pildora"}>USD</Link>}
            </nav>
            <div className="acciones">
              {hayFiltros && <Link href={enlace({ bien: "", desde: "", hasta: "" })} className="boton-texto">{t("cuentas.limpiar")}</Link>}
              <button type="submit" className="boton boton-secundario">{t("cuentas.filtrar")}</button>
            </div>
          </div>
        </form>

        <p className="saldo-resumen">
          {t("cuentas.saldo_actual")}{" "}
          <strong className={libro.saldoFinal < 0 ? "saldo-deudor" : undefined}>{formatearImporte(libro.saldoFinal, moneda)}</strong>
          <span className="muted"> · {libro.saldoFinal < 0 ? t("propietarios.saldo_deudor") : t("propietarios.saldo_a_favor")}</span>
        </p>

        {libro.filas.length === 0 ? (
          <p className="muted">{t("cuentas.vacio")}</p>
        ) : (
          <div className="tabla-envoltorio">
            <table className="tabla tabla-compacta">
              <thead>
                <tr>
                  <th>{t("cuentas.col_fecha")}</th>
                  <th>{t("cuentas.col_bien")}</th>
                  <th>{t("cuentas.col_tipo")}</th>
                  <th>{t("cuentas.col_descripcion")}</th>
                  <th className="num">{t("cuentas.col_debe")}</th>
                  <th className="num">{t("cuentas.col_haber")}</th>
                  <th className="num">{t("cuentas.col_saldo")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {f.desde && (
                  <tr className="fila-saldo-anterior">
                    <td colSpan={6}>{t("cuentas.saldo_anterior")}</td>
                    <td className="num">{formatearImporte(libro.saldoAnterior, moneda)}</td>
                    <td />
                  </tr>
                )}
                {libro.filas.map((m) => (
                  <tr key={m.id} className={m.anulado || m.esContramovimiento ? "fila-anulada" : undefined}>
                    <td className="nowrap">{fechaCorta(m.fecha)}</td>
                    <td>{nombreBien.get(m.bienId) ?? "—"}</td>
                    <td>{t(`cuentas.tipo_${m.tipo}`)}</td>
                    <td>
                      {m.descripcion}
                      {m.anulado && <span className="estado estado-neutro">{t("cuentas.anulado")}</span>}
                    </td>
                    <td className="num">{m.debe > 0 ? formatearImporte(m.debe, moneda) : ""}</td>
                    <td className="num">{m.haber > 0 ? formatearImporte(m.haber, moneda) : ""}</td>
                    <td className={m.saldo < 0 ? "num saldo-deudor" : "num"}>{formatearImporte(m.saldo, moneda)}</td>
                    <td>
                      <div className="acciones-fila">
                        {((comprobantes.get(m.id) ?? []) as DocumentoFila[]).map((d, i) =>
                          d.url ? (
                            <a key={d.id} className="boton-texto" href={d.url} target="_blank" rel="noreferrer">
                              {i === 0 ? t("cuentas.comprobante") : t("cuentas.comprobante_n", { n: i + 1 })}
                            </a>
                          ) : null,
                        )}
                        {esAdmin && m.anulable && (
                          <Link className="boton-texto" href={`/cuentas-corrientes/${m.id}/anular?propietario=${propietario.id}&moneda=${moneda}`}>
                            {t("cuentas.anular")}
                          </Link>
                        )}
                      </div>
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

import Link from "next/link";
import { formatearImporte, type Moneda } from "@ai/domain";
import { t } from "@ai/i18n";
import { IconoBien } from "@/components/IconoBien";
import { TarjetaIndicador } from "@/components/TarjetaIndicador";
import { datosHomePropietario } from "@/lib/home-propietario";

const fechaCorta = (f: string) => f.split("-").reverse().join("/");
const periodoCorto = (p: string) => `${p.slice(5, 7)}/${p.slice(0, 4)}`;
const porcentajeTexto = (p: number) => String(p).replace(".", ",");

// P-08 Home del propietario: su saldo, lo que debe depositar, sus obligaciones, sus bienes y sus resúmenes.
export async function HomePropietario({ propietarioId, nombre, fecha }: { propietarioId: string; nombre: string; fecha: string }) {
  const datos = await datosHomePropietario(propietarioId);
  if (!datos) {
    return (
      <section className="panel">
        <p className="muted">{t("inicio.propietario_sin_ficha")}</p>
      </section>
    );
  }
  const { resumen: r, bienes, historial } = datos;
  const hayUsd = r.resumenes.some((x) => x.moneda === "USD");
  const ars = r.resumenes.find((x) => x.moneda === "ARS");
  const usd = r.resumenes.find((x) => x.moneda === "USD");
  const aDepositar = r.resumenes.filter((x) => x.aDepositar > 0).map((x) => formatearImporte(x.aDepositar, x.moneda)).join(" y ");
  const fm = (n: number, m: Moneda) => formatearImporte(n, m);

  // Obligaciones a su cargo: primero las que entran en el depósito y después las que vencen más adelante.
  const filas = r.resumenes.flatMap((x) => [...x.pendientes.map((o) => ({ o, adelante: false })), ...x.futuras.map((o) => ({ o, adelante: true }))]);
  const verResumen = `/propietarios/${propietarioId}/resumen-deposito`;

  return (
    <>
      <div className="encabezado home-propietario-cabecera">
        <div className="home-marca">
          {datos.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={datos.logoUrl} alt={datos.administracion} className="home-logo" />
          )}
          <div>
            <p className="muted">{datos.administracion ? `${datos.administracion} · ${fecha}` : fecha}</p>
            <h1>{t("inicio.saludo", { nombre })}</h1>
          </div>
        </div>
      </div>

      <section className="indicadores">
        <TarjetaIndicador
          id="saldo-ars"
          icono="cuentas"
          tono="ok"
          titulo={t("propietarios.saldo_ars")}
          valor={fm(ars?.saldoDisponible ?? 0, "ARS")}
          nota={(ars?.saldoDisponible ?? 0) < 0 ? t("propietarios.saldo_deudor") : t("propietarios.saldo_a_favor")}
        />
        {hayUsd && (
          <TarjetaIndicador
            id="saldo-usd"
            icono="cuentas"
            tono="acento"
            titulo={t("propietarios.saldo_usd")}
            valor={fm(usd?.saldoDisponible ?? 0, "USD")}
            nota={(usd?.saldoDisponible ?? 0) < 0 ? t("propietarios.saldo_deudor") : t("propietarios.saldo_a_favor")}
          />
        )}
        <TarjetaIndicador
          id="a-depositar"
          icono="dinero"
          tono="aviso"
          titulo={t("propietarios.a_depositar")}
          valor={aDepositar || fm(0, "ARS")}
          nota={t("propietarios.a_depositar_hasta", { fecha: fechaCorta(r.fechaLimite) })}
        />
      </section>

      <div className="paneles">
        <section className="panel">
          <h2>{t("inicio.mis_obligaciones")}</h2>
          {filas.length === 0 ? (
            <p className="muted">{t("inicio.mis_obligaciones_vacio")}</p>
          ) : (
            <div className="tabla-envoltorio">
              <table className="tabla tabla-compacta tabla-responsive">
                <thead>
                  <tr>
                    <th>{t("resumen.col_bien")}</th>
                    <th>{t("resumen.col_concepto")}</th>
                    <th>{t("resumen.col_vencimiento")}</th>
                    <th className="num">{t("resumen.col_monto")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map(({ o, adelante }) => (
                    <tr key={o.id}>
                      <td data-label={t("resumen.col_bien")}>{o.bien}</td>
                      <td data-label={t("resumen.col_concepto")}>
                        {o.concepto} <span className="muted">{periodoCorto(o.periodo)}</span>
                        {o.porcentaje < 100 && <span className="linea muted">{t("resumen.su_parte", { porcentaje: porcentajeTexto(o.porcentaje) })}</span>}
                      </td>
                      <td className="nowrap" data-label={t("resumen.col_vencimiento")}>
                        {fechaCorta(o.vencimiento as string)}
                        {(o.vencimiento as string) < r.hoy && <span className="estado estado-vencida">{t("obligaciones.estado_vencida")}</span>}
                        {adelante && <span className="linea muted">{t("inicio.mas_adelante")}</span>}
                      </td>
                      <td className="num" data-label={t("resumen.col_monto")}>{fm(o.monto as number, o.moneda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>{t("resumen.titulo")}</h2>
          <p className="muted">{t("inicio.resumen_explicacion")}</p>
          <div className="acciones-fila">
            <Link href={verResumen} className="boton">{t("inicio.ver_resumen")}</Link>
          </div>
          {historial.filter((h) => h.tienePdf).length > 0 && (
            <>
              <p className="etiqueta-lista">{t("inicio.resumenes_emitidos")}</p>
              <ul className="resumen-lista">
                {historial
                  .filter((h) => h.tienePdf)
                  .slice(0, 4)
                  .map((h) => (
                    <li key={h.id}>
                      <span>
                        <strong>{h.numero}</strong> <span className="muted">· {fechaCorta(h.fecha)} · {(h.montos.some((m) => m.aDepositar > 0) ? h.montos.filter((m) => m.aDepositar > 0) : h.montos.slice(0, 1)).map((m) => fm(m.aDepositar, m.moneda)).join(" · ")}</span>
                      </span>
                      <a href={`${verResumen}/pdf/${h.id}`} className="boton-texto">{t("resumen.descargar")}</a>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </section>

        <section className="panel">
          <h2>{t("inicio.mis_bienes")}</h2>
          {bienes.length === 0 ? (
            <p className="muted">{t("inicio.mis_bienes_vacio")}</p>
          ) : (
            <ul className="resumen-lista">
              {bienes.map((b) => (
                <li key={b.id}>
                  <span className="celda-bien-icono">
                    <IconoBien tipo={b.tipoBien} />
                    <span>
                    <strong>{b.esGastosVarios ? t("bienes.gastos_varios") : b.alias}</strong>{" "}
                    <span className="muted">· {t(`tipo_bien.${b.tipoBien}`)}{b.porcentaje < 100 ? ` · ${porcentajeTexto(b.porcentaje)} %` : ""}</span>
                    </span>
                  </span>
                  <span className="estado estado-neutro">{t(`estado_bien.${b.estado}`)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>{t("inicio.liquidaciones")}</h2>
          <p className="muted">{t("inicio.liquidaciones_vacio")}</p>
        </section>
      </div>
    </>
  );
}

import Link from "next/link";
import { formatearImporte, type Moneda } from "@ai/domain";
import { t } from "@ai/i18n";
import { bienesDelPropietario, libroDelPropietario, tieneCuentaEnDolares } from "@/lib/cuentas-corrientes";
import { conVolver } from "@/lib/volver";
import { Icono } from "./Iconos";

const fechaCorta = (f: string) => f.split("-").reverse().join("/");

// Fecha de hoy menos dos meses (en la hora de Córdoba), como AAAA-MM-DD.
function haceDosMeses(): string {
  const hoy = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Cordoba" }).format(new Date());
  const [a, m, d] = hoy.split("-").map(Number) as [number, number, number];
  const fecha = new Date(Date.UTC(a, m - 3, 1));
  const ultimoDia = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 0)).getUTCDate();
  fecha.setUTCDate(Math.min(d, ultimoDia));
  return fecha.toISOString().slice(0, 10);
}

// Solapa "Cuenta corriente" de la ficha del propietario: lo de los últimos dos meses y el paso a la cuenta completa.
export async function CuentaReciente({ propietarioId }: { propietarioId: string }) {
  const desde = haceDosMeses();
  const [bienes, conDolares] = await Promise.all([bienesDelPropietario(propietarioId), tieneCuentaEnDolares(propietarioId)]);
  const nombreBien = new Map(bienes.map((b) => [b.id, b.esGeneral ? t("cuentas.general") : b.nombre]));
  const monedas: Moneda[] = conDolares ? ["ARS", "USD"] : ["ARS"];
  const libros = await Promise.all(monedas.map((moneda) => libroDelPropietario({ propietarioId, moneda, desde })));

  return (
    <>
      {monedas.map((moneda, k) => {
        const libro = libros[k]!;
        const filas = [...libro.filas].reverse();
        return (
          <section key={moneda} className="panel">
            <div className="encabezado">
              <div>
                <h2>{t(moneda === "ARS" ? "cuentas.pesos" : "cuentas.dolares")}</h2>
                <p className="muted">{t("cuentas.recientes_desde", { fecha: fechaCorta(desde) })} · {t("cuentas.saldo_actual")} <strong className={libro.saldoFinal < 0 ? "saldo-deudor" : undefined}>{formatearImporte(libro.saldoFinal, moneda)}</strong></p>
              </div>
            </div>
            {filas.length === 0 ? (
              <p className="muted">{t("cuentas.recientes_vacio")}</p>
            ) : (
              <div className="tabla-envoltorio">
                <table className="tabla tabla-compacta tabla-responsive">
                  <thead>
                    <tr>
                      <th>{t("cuentas.col_fecha")}</th>
                      <th>{t("cuentas.col_bien")}</th>
                      <th>{t("cuentas.col_tipo")}</th>
                      <th>{t("cuentas.col_descripcion")}</th>
                      <th className="num">{t("cuentas.col_debe")}</th>
                      <th className="num">{t("cuentas.col_haber")}</th>
                      <th className="num">{t("cuentas.col_saldo")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((m) => (
                      <tr key={m.id} className={m.anulado || m.esContramovimiento ? "fila-anulada" : undefined}>
                        <td className="nowrap" data-label={t("cuentas.col_fecha")}>{fechaCorta(m.fecha)}</td>
                        <td data-label={t("cuentas.col_bien")}>{nombreBien.get(m.bienId) ?? "—"}</td>
                        <td data-label={t("cuentas.col_tipo")}>{t(`cuentas.tipo_${m.tipo}`)}</td>
                        <td data-label={t("cuentas.col_descripcion")}>
                          {m.descripcion}
                          {m.anulado && <span className="estado estado-neutro">{t("cuentas.anulado")}</span>}
                        </td>
                        <td className="num" data-label={t("cuentas.col_debe")}>{m.debe > 0 ? formatearImporte(m.debe, moneda) : ""}</td>
                        <td className="num" data-label={t("cuentas.col_haber")}>{m.haber > 0 ? formatearImporte(m.haber, moneda) : ""}</td>
                        <td className={m.saldo < 0 ? "num saldo-deudor" : "num"} data-label={t("cuentas.col_saldo")}>{formatearImporte(m.saldo, moneda)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="ver-mas">
              <Link href={`/cuentas-corrientes?propietario=${propietarioId}&moneda=${moneda}&${conVolver(`/propietarios/${propietarioId}?tab=cuenta`)}`} className="boton boton-secundario boton-con-icono">
                <Icono nombre="mas" tamano={18} />
                {t("cuentas.ver_mas")}
              </Link>
            </div>
          </section>
        );
      })}
    </>
  );
}

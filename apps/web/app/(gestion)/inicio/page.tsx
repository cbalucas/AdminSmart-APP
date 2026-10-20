import Link from "next/link";
import { formatearImporte, type Moneda } from "@ai/domain";
import { t } from "@ai/i18n";
import { Icono } from "@/components/Iconos";
import { datosHomeGestion, type Total } from "@/lib/home-gestion";
import { esGestion } from "@/lib/menu";
import { usuarioActual } from "@/lib/usuario-actual";
import { HomePropietario } from "./HomePropietario";

const fechaDeHoy = () =>
  new Intl.DateTimeFormat("es-AR", { dateStyle: "full", timeZone: "America/Argentina/Cordoba" }).format(new Date());
const fechaCorta = (f: string) => f.split("-").reverse().join("/");

/** "$ 1.000 · US$ 50": solo las monedas con importe; "—" si no hay ninguno. */
function montosTexto(montos: Record<Moneda, number>): string {
  const partes = (["ARS", "USD"] as const).filter((m) => montos[m] !== 0).map((m) => formatearImporte(montos[m], m));
  return partes.length > 0 ? partes.join(" · ") : "—";
}

// Cuanto más largo el importe, más chica la letra.
const tamanoCifra = (valor: string) => {
  const largo = valor.length;
  return largo <= 7 ? "1.7rem" : largo <= 9 ? "1.45rem" : largo <= 11 ? "1.25rem" : largo <= 13 ? "1.05rem" : "0.9rem";
};

// Ícono y tono de cada indicador del inicio.
const ICONO_INDICADOR: Record<string, [string, string]> = {
  vencidas: ["obligaciones", "peligro"],
  vencen_7: ["contratos", "aviso"],
  vencen_30: ["contratos", "acento"],
  a_completar: ["recurrente", "aviso"],
  total_administrado: ["cuentas", "ok"],
  sin_cobrar: ["inquilinos", "neutro"],
  deuda_inquilinos: ["inquilinos", "neutro"],
};

// P-07 Home de gestión y P-08 Home del propietario.
export default async function Inicio() {
  const { usuario } = await usuarioActual();
  if (!usuario) return null;
  const fecha = fechaDeHoy();

  if (!esGestion(usuario.roles)) {
    if (!usuario.propietarioId) {
      return (
        <>
          <div className="encabezado">
            <div>
              <p className="muted">{fecha}</p>
              <h1>{t("inicio.saludo", { nombre: usuario.nombre })}</h1>
            </div>
          </div>
          <section className="panel">
            <p className="muted">{t("inicio.propietario_sin_ficha")}</p>
          </section>
        </>
      );
    }
    return <HomePropietario propietarioId={usuario.propietarioId} nombre={usuario.nombre} fecha={fecha} />;
  }

  const d = await datosHomeGestion();
  // `observacion`: texto aclaratorio; va en un globo que se abre al pasar el mouse o al tocar el ícono.
  const indicador = (clave: string, valor: string, nota: string, href?: string, observacion?: string) => {
    const [icono, tono] = ICONO_INDICADOR[clave] ?? ["inicio", "neutro"];
    const titulo = t(`inicio.ind_${clave}`);
    return (
      <article key={clave} className={`indicador tono-${tono}${href ? " indicador-enlace" : ""}`}>
        {href && (
          <Link href={href} className="indicador-vinculo">
            <span className="solo-lectores">{titulo}</span>
          </Link>
        )}
        <p className="muted indicador-titulo">{titulo}</p>
        <span className="indicador-icono" aria-hidden="true"><Icono nombre={icono} tamano={22} /></span>
        <strong className="cifra" style={{ fontSize: tamanoCifra(valor) }} title={valor}>{valor}</strong>
        {observacion && (
          <span className="indicador-info">
            <button type="button" className="info-boton" aria-label={t("inicio.ver_observacion")} aria-describedby={`obs-${clave}`}>
              <Icono nombre="info" tamano={18} />
            </button>
            <span role="tooltip" id={`obs-${clave}`} className="info-globo">{observacion}</span>
          </span>
        )}
        {nota && <p className="muted indicador-nota">{nota}</p>}
      </article>
    );
  };
  const nota = (tot: Total) => (tot.cantidad === 0 ? t("inicio.nada_pendiente") : montosTexto(tot.montos));

  return (
    <>
      <div className="encabezado">
        <div>
          <p className="muted">{fecha}</p>
          <h1>{t("inicio.titulo")}</h1>
        </div>
        <div className="acciones-rapidas">
          <Link href="/obligaciones/pago-directo" className="boton">{t("inicio.registrar_pago")}</Link>
          <Link href="/obligaciones/nueva" className="boton boton-secundario">{t("inicio.nueva_obligacion")}</Link>
          <button type="button" className="boton boton-secundario" disabled title={t("inicio.llega_con_alquileres")}>
            {t("inicio.registrar_cobro")}
          </button>
        </div>
      </div>

      <section className="indicadores">
        {indicador("vencidas", String(d.vencidas.cantidad), nota(d.vencidas), "/obligaciones?estado=vencida")}
        {indicador("vencen_7", String(d.vencen7.cantidad), nota(d.vencen7), "/obligaciones?estado=pendiente")}
        {indicador("vencen_30", String(d.vencen30.cantidad), nota(d.vencen30), "/obligaciones?estado=pendiente")}
        {indicador("a_completar", String(d.aCompletar), d.aCompletar === 0 ? t("inicio.nada_pendiente") : "", d.aCompletar > 0 ? "/obligaciones?completar=1" : undefined, d.aCompletar > 0 ? t("inicio.a_completar_nota") : undefined)}
        {indicador("total_administrado", formatearImporte(d.saldoTotal.ARS, "ARS"), d.saldoTotal.USD !== 0 ? formatearImporte(d.saldoTotal.USD, "USD") : "", "/cuentas-corrientes", t("inicio.saldo_total_nota"))}
        {indicador("sin_cobrar", "—", "", undefined, t("inicio.llega_con_alquileres"))}
        {indicador("deuda_inquilinos", "—", "", undefined, t("inicio.llega_con_alquileres"))}
      </section>

      <div className="paneles">
        <section className="panel">
          <h2>{t("inicio.a_depositar")}</h2>
          {d.aDepositar.length === 0 ? (
            <p className="muted">{t("inicio.a_depositar_vacio")}</p>
          ) : (
            <div className="tabla-envoltorio">
              <table className="tabla tabla-compacta">
                <thead>
                  <tr>
                    <th>{t("cuentas.propietario")}</th>
                    <th className="num">ARS</th>
                    <th className="num">USD</th>
                  </tr>
                </thead>
                <tbody>
                  {d.aDepositar.map((f) => (
                    <tr key={f.propietarioId}>
                      <td>
                        <Link href={`/propietarios/${f.propietarioId}/resumen-deposito`}>{f.nombre}</Link>
                      </td>
                      <td className="num">{f.ars > 0 ? formatearImporte(f.ars, "ARS") : "—"}</td>
                      <td className="num">{f.usd > 0 ? formatearImporte(f.usd, "USD") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>{t("inicio.proximos_vencimientos")}</h2>
          {d.proximos.length === 0 ? (
            <p className="muted">{t("inicio.proximos_vencimientos_vacio")}</p>
          ) : (
            <ul className="resumen-lista">
              {d.proximos.map((o) => (
                <li key={o.id}>
                  <span>
                    <strong>{o.concepto}</strong> <span className="muted">· {d.nombreBien[o.bienId] ?? "—"} · {fechaCorta(o.vencimiento as string)}</span>
                  </span>
                  <strong>{formatearImporte(o.monto as number, o.moneda)}</strong>
                </li>
              ))}
            </ul>
          )}
          <Link href="/obligaciones" className="boton-texto">{t("inicio.ver_todas")}</Link>
        </section>
      </div>
    </>
  );
}

import { t } from "@ai/i18n";
import { AccionIcono } from "@/components/AccionIcono";
import { Icono } from "./Iconos";
import { formatearCbu, obtenerCuentas } from "@/lib/cuentas";
import { AccionesCuenta, VincularCuenta } from "./AccionesCuenta";

// Sección "Cuentas bancarias" de la ficha del propietario (P-12 / P-14). Solo la ve el administrador.
export async function SeccionCuentas({ propietarioId }: { propietarioId: string }) {
  const { cuentas, disponibles } = await obtenerCuentas(propietarioId);

  return (
    <section className="panel">
      <div className="encabezado">
        <h2>{t("cuentas.titulo")}</h2>
        <AccionIcono href={`/propietarios/${propietarioId}/cuentas/nueva`} icono="mas" titulo={t("cuentas.agregar")} tono="primario" />
      </div>

      {cuentas.length === 0 && <p className="muted">{t("cuentas.vacia")}</p>}
      <ul className="tarjetas-cuentas">
        {cuentas.map((c) => (
          <li key={c.vinculoId} className={c.estado === "activo" ? "tarjeta-cuenta" : "tarjeta-cuenta tarjeta-cuenta-inactiva"}>
            <span className="icono-bien" aria-hidden="true">
              <Icono nombre={c.tipoCuenta === "billetera" ? "cuentas" : "edificios"} tamano={18} />
            </span>
            <strong className="tarjeta-propietario-nombre">{c.banco ?? t(c.tipoCuenta === "billetera" ? "cuentas.entidad_billetera" : "cuentas.entidad_banco")}</strong>
            <span className="muted">{t(`cuentas.tipo_${c.tipoCuenta}`)} · {c.moneda}</span>
            <p className="cuenta-cbu">
              {c.alias && <strong>{c.alias}</strong>}
              {c.alias && c.cbuCvu && <br />}
              {c.cbuCvu && formatearCbu(c.cbuCvu)}
            </p>
            <p className="muted">{c.titular}</p>
            <p className="insignias">
              {c.predeterminada && <span className="estado estado-ok">{t("cuentas.predeterminada", { moneda: c.moneda })}</span>}
              {c.estado !== "activo" && <span className="estado estado-neutro">{t("cuentas.inactiva")}</span>}
              {c.compartidaCon.length > 0 && (
                <span className="estado estado-neutro">{t("cuentas.compartida", { nombres: c.compartidaCon.join(", ") })}</span>
              )}
            </p>
            <AccionesCuenta propietarioId={propietarioId} cuenta={c} />
          </li>
        ))}
      </ul>

      <VincularCuenta propietarioId={propietarioId} disponibles={disponibles} />
    </section>
  );
}

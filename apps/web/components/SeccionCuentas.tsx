import Link from "next/link";
import { t } from "@ai/i18n";
import { formatearCbu, obtenerCuentas } from "@/lib/cuentas";
import { AccionesCuenta, VincularCuenta } from "./AccionesCuenta";

// Sección "Cuentas bancarias" de la ficha del propietario (P-12 / P-14). Solo la ve el administrador.
export async function SeccionCuentas({ propietarioId }: { propietarioId: string }) {
  const { cuentas, disponibles } = await obtenerCuentas(propietarioId);

  return (
    <section className="panel">
      <div className="encabezado">
        <h2>{t("cuentas.titulo")}</h2>
        <Link href={`/propietarios/${propietarioId}/cuentas/nueva`} className="boton boton-secundario">
          {t("cuentas.agregar")}
        </Link>
      </div>

      {cuentas.length === 0 && <p className="muted">{t("cuentas.vacia")}</p>}
      <ul className="lista-cuentas">
        {cuentas.map((c) => (
          <li key={c.vinculoId} className="cuenta">
            <div className="cuenta-datos">
              <p className="cuenta-titulo">
                <strong>{c.banco}</strong>
                <span className="muted"> · {t(`cuentas.tipo_${c.tipoCuenta}`)} · {c.moneda}</span>
              </p>
              <p className="cuenta-cbu">{formatearCbu(c.cbuCvu)}{c.alias && <span className="muted"> · {c.alias}</span>}</p>
              <p className="muted">{c.titular}</p>
              <p className="insignias">
                {c.predeterminada && <span className="estado estado-ok">{t("cuentas.predeterminada", { moneda: c.moneda })}</span>}
                {c.estado !== "activo" && <span className="estado estado-neutro">{t("cuentas.inactiva")}</span>}
                {c.compartidaCon.length > 0 && (
                  <span className="estado estado-neutro">{t("cuentas.compartida", { nombres: c.compartidaCon.join(", ") })}</span>
                )}
              </p>
            </div>
            <AccionesCuenta propietarioId={propietarioId} cuenta={c} />
          </li>
        ))}
      </ul>

      <VincularCuenta propietarioId={propietarioId} disponibles={disponibles} />
    </section>
  );
}

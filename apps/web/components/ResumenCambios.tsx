import { formatearValorAuditoria, humanizarCampo, type CambioDeCampo } from "@ai/domain";
import { t } from "@ai/i18n";

/** Texto de un campo: el del sistema o, si no tiene, el nombre técnico sin guiones bajos. */
export function etiquetaCampo(campo: string): string {
  const clave = `auditoria.campo_${campo}`;
  const texto = t(clave);
  return texto === clave ? humanizarCampo(campo) : texto;
}

// Textos del sistema para los valores que son una opción de una lista (tipo de movimiento, medio de pago, estado…).
const PREFIJOS_DE_VALOR: Record<string, string[]> = {
  tipo: ["cuentas.tipo_"],
  medio: ["pagos.medio_"],
  pagado_por: ["pagos.quien_"],
  responsable: ["obligaciones.responsable_"],
  responsable_default: ["obligaciones.responsable_"],
  estado: ["estado_bien.", "conceptos."],
  tipo_bien: ["tipo_bien."],
  subtipo: ["subtipo."],
  periodicidad: ["propietarios.per_"],
  periodicidad_liquidacion: ["propietarios.per_"],
  frecuencia: ["obligaciones.frec_"],
  origen_tipo: ["auditoria.valor_"],
  modo_liquidacion: ["auditoria.valor_"],
  canal: ["plantillas.canal_"],
};

/** Texto de un valor para mostrar o exportar: la opción de la lista en lenguaje común, o el valor formateado. */
export function valorVisible(campo: string, valor: unknown, moneda: string | null): string {
  if (typeof valor === "string") {
    for (const prefijo of PREFIJOS_DE_VALOR[campo] ?? []) {
      const texto = t(`${prefijo}${valor}`);
      if (texto !== `${prefijo}${valor}`) return texto;
    }
  }
  return formatearValorAuditoria(campo, valor, moneda);
}

const visible = (c: CambioDeCampo, moneda: string | null) => ({
  antes: valorVisible(c.campo, c.antes, moneda),
  despues: valorVisible(c.campo, c.despues, moneda),
});

// P-45: qué cambió en un registro. Los primeros cambios a la vista; el resto, en el detalle.
export function ResumenCambios({ cambios, moneda, alta }: { cambios: CambioDeCampo[]; moneda: string | null; alta: boolean }) {
  if (cambios.length === 0) return <span className="muted">{t("auditoria.sin_cambios")}</span>;
  const primeros = cambios.slice(0, 3);
  return (
    <>
      <ul className="cambios">
        {primeros.map((c) => {
          const v = visible(c, moneda);
          return (
            <li key={c.campo}>
              <strong>{etiquetaCampo(c.campo)}</strong>:{" "}
              {alta ? (
                v.despues
              ) : (
                <>
                  <span className="muted">{v.antes}</span> → {v.despues}
                </>
              )}
            </li>
          );
        })}
      </ul>
      {cambios.length > primeros.length && <span className="muted">{t("auditoria.mas_cambios", { cantidad: cambios.length - primeros.length })}</span>}
    </>
  );
}

export function DetalleCambios({
  cambios,
  moneda,
  antes,
  despues,
  alta,
}: {
  cambios: CambioDeCampo[];
  moneda: string | null;
  antes: unknown;
  despues: unknown;
  alta: boolean;
}) {
  return (
    <details className="detalle-auditoria">
      <summary>{t("auditoria.ver_detalle")}</summary>
      <table className="tabla tabla-compacta">
        <thead>
          <tr>
            <th>{t("auditoria.campo")}</th>
            {!alta && <th>{t("auditoria.antes")}</th>}
            <th>{t("auditoria.despues")}</th>
          </tr>
        </thead>
        <tbody>
          {cambios.map((c) => {
            const v = visible(c, moneda);
            return (
              <tr key={c.campo}>
                <td>{etiquetaCampo(c.campo)}</td>
                {!alta && <td className="muted">{v.antes}</td>}
                <td>{v.despues}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <pre className="datos-crudos">{JSON.stringify({ antes, despues }, null, 2)}</pre>
    </details>
  );
}

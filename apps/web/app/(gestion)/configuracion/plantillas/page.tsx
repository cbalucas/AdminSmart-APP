import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { listarPlantillas } from "@/lib/plantillas";
import { usuarioActual } from "@/lib/usuario-actual";

// P-49 Plantillas de envío (solo administrador).
export default async function Plantillas() {
  const { usuario } = await usuarioActual();
  if (!usuario?.roles.includes("administrador")) notFound();
  const lista = await listarPlantillas();

  return (
    <>
      <p className="migas">
        <Link href="/configuracion">{t("configuracion.titulo")}</Link> / {t("plantillas.titulo")}
      </p>
      <div className="encabezado">
        <h1>{t("plantillas.titulo")}</h1>
      </div>
      <section className="panel">
        <p className="muted">{t("plantillas.ayuda")}</p>
        <div className="tabla-envoltorio">
          <table className="tabla">
            <thead>
              <tr>
                <th>{t("plantillas.col_documento")}</th>
                <th>{t("plantillas.col_canal")}</th>
                <th>{t("plantillas.col_estado")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={`${p.documento}/${p.canal}`}>
                  <td><strong>{t(`plantillas.documento_${p.documento}`)}</strong></td>
                  <td>{t(`plantillas.canal_${p.canal}`)}</td>
                  <td>
                    <span className={p.personalizada ? "estado estado-ambar" : "estado estado-neutro"}>
                      {p.personalizada ? t("plantillas.personalizada") : t("plantillas.original")}
                    </span>
                  </td>
                  <td>
                    <div className="acciones-fila">
                      <Link className="boton-texto" href={`/configuracion/plantillas/${p.documento}/${p.canal}`}>{t("plantillas.editar")}</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

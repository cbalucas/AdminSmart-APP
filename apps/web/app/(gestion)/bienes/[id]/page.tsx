import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { enlaceGoogleMaps, estadoTitularidad, formatearDireccion, porcentajeDisponible } from "@ai/domain";
import { formatearPorcentaje, listarEdificios, obtenerBien, titularesDe } from "@/lib/bienes";
import { esGestion } from "@/lib/menu";
import { usuarioActual } from "@/lib/usuario-actual";

const PESTANAS = ["datos", "servicios", "obligaciones", "documentos"] as const;

// P-16 Ficha del bien. Los titulares se editan en el paso siguiente (P-18).
export default async function FichaBien({ params }: { params: Promise<{ id: string }> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const { id } = await params;
  const bien = await obtenerBien(id);
  if (!bien) notFound();

  const titulares = (await titularesDe([bien.id])).get(bien.id) ?? [];
  const edificio = bien.edificioId ? (await listarEdificios()).find((e) => e.id === bien.edificioId) : undefined;
  const base = edificio ?? bien;
  const direccion = formatearDireccion({
    calle: base.calle,
    numero: base.numero,
    piso: bien.piso,
    departamento: bien.departamento,
    localidad: base.localidad,
    provincia: base.provincia,
  });
  const mapa = enlaceGoogleMaps({
    latitud: bien.latitud,
    longitud: bien.longitud,
    calle: base.calle,
    numero: base.numero,
    localidad: base.localidad,
    provincia: base.provincia,
  });

  const porcentajes = titulares.map((x) => x.porcentaje);
  const titularidad = estadoTitularidad(porcentajes);
  const suma = porcentajes.reduce((a, b) => a + b, 0);
  const titulo = bien.esGastosVarios ? `${t("bienes.gastos_varios")} · ${titulares[0]?.nombre ?? ""}` : bien.alias;
  const vacio = t("propietarios.dato_vacio");

  return (
    <>
      <p className="migas">
        <Link href="/bienes">{t("bienes.migas")}</Link> / {titulo}
      </p>

      <div className="ficha-cabecera">
        <div className="ficha-datos">
          <h1>{titulo}</h1>
          <p className="muted">
            {t(`tipo_bien.${bien.tipoBien}`)}
            {bien.subtipo && ` · ${t(`subtipo.${bien.subtipo}`)}`}
            {direccion && ` · ${direccion}`}
          </p>
          <p className="insignias">
            <span className={["disponible", "activo", "alquilado"].includes(bien.estado) ? "estado estado-ok" : "estado estado-neutro"}>
              {t(`estado_bien.${bien.estado}`)}
            </span>
            {titularidad === "vacia" && <span className="estado estado-vencida">{t("bienes.sin_titulares")}</span>}
            {titularidad === "excedida" && <span className="estado estado-vencida">{t("bienes.titularidad_excedida")}</span>}
          </p>
        </div>
        <div className="acciones-rapidas">
          {mapa && (
            <a href={mapa} target="_blank" rel="noreferrer" className="boton boton-secundario">{t("bienes.ver_mapa")}</a>
          )}
          {!bien.esGastosVarios && (
            <Link href={`/bienes/${bien.id}/editar`} className="boton boton-secundario">{t("app.editar")}</Link>
          )}
        </div>
      </div>

      <nav className="pestanas" aria-label={t("bienes.titulo")}>
        {PESTANAS.map((clave) =>
          clave === "datos" ? (
            <span key={clave} className="pestana activa" aria-current="page">{t("bienes.tab_datos")}</span>
          ) : (
            <span key={clave} className="pestana deshabilitada" title={t("bienes.tab_proximamente")}>{t(`bienes.tab_${clave}`)}</span>
          ),
        )}
      </nav>

      <section className="panel">
        <dl className="datos datos-ancho">
          {direccion && (
            <>
              <dt>{t("bienes.dato_direccion")}</dt>
              <dd>{direccion}</dd>
            </>
          )}
          {edificio && (
            <>
              <dt>{t("bienes.dato_edificio")}</dt>
              <dd>{edificio.nombre}</dd>
            </>
          )}
          {bien.unidadFuncional && (
            <>
              <dt>{t("bienes.dato_unidad")}</dt>
              <dd>{bien.unidadFuncional}</dd>
            </>
          )}
          {bien.tipoBien === "vehiculo" && (
            <>
              <dt>{t("bienes.dato_dominio")}</dt>
              <dd>{bien.dominio ?? vacio}</dd>
              <dt>{t("bienes.dato_marca")}</dt>
              <dd>{bien.marcaModelo ?? vacio}</dd>
              <dt>{t("bienes.dato_anio")}</dt>
              <dd>{bien.anio ?? vacio}</dd>
            </>
          )}
          <dt>{t("bienes.dato_modo")}</dt>
          <dd>{t(`bienes.modo_${bien.modoLiquidacion}`)}</dd>
          <dt>{t("bienes.dato_observaciones")}</dt>
          <dd>{bien.observaciones ?? vacio}</dd>
        </dl>
      </section>

      <section className="panel">
        <div className="encabezado">
          <h2>{t("bienes.titulares")}</h2>
        </div>
        {titulares.length === 0 ? (
          <p className="muted">{t("bienes.titulares_vacio")}</p>
        ) : (
          <div className="tabla-envoltorio">
            <table className="tabla">
              <thead>
                <tr>
                  <th>{t("bienes.campo_titular")}</th>
                  <th className="num">{t("bienes.col_porcentaje")}</th>
                </tr>
              </thead>
              <tbody>
                {titulares.map((x) => (
                  <tr key={x.vinculoId}>
                    <td>
                      <Link href={`/propietarios/${x.propietarioId}`}><strong>{x.nombre}</strong></Link>
                      {x.esRepresentante && titulares.length > 1 && <span className="muted"> · {t("bienes.titular_representante")}</span>}
                    </td>
                    <td className="num">{formatearPorcentaje(x.porcentaje)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {titulares.length > 0 && (
          <p className="muted">
            {t("bienes.titulares_suma", { suma: formatearPorcentaje(Math.round(suma * 10000) / 10000) })}
            {titularidad === "parcial" && ` · ${t("bienes.titulares_sin_cargar", { resto: formatearPorcentaje(porcentajeDisponible(porcentajes)) })}`}
          </p>
        )}
      </section>
    </>
  );
}

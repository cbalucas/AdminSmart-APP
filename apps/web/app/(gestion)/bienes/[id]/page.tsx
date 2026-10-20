import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { enlaceGoogleMaps, estadoTitularidad, formatearDireccion, type TipoBien } from "@ai/domain";
import { BotonVolver } from "@/components/BotonVolver";
import { CambiarEstadoBien } from "@/components/CambiarEstadoBien";
import { SeccionServicios } from "@/components/SeccionServicios";
import { SeccionTitulares } from "@/components/SeccionTitulares";
import { listarEdificios, obtenerBien, titularesDe } from "@/lib/bienes";
import { esGestion } from "@/lib/menu";
import { obtenerPropietario } from "@/lib/propietarios";
import { serviciosDelBien } from "@/lib/servicios";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";
import { conVolver, rutaDeVolver } from "@/lib/volver";

const PESTANAS = ["datos", "servicios", "obligaciones", "documentos"] as const;
const HABILITADAS: readonly string[] = ["datos", "servicios"];

// P-16 Ficha del bien: datos y titulares (P-18), y servicios e impuestos (P-19).
export default async function FichaBien({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; volver?: string }>;
}) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const { id } = await params;
  const bien = await obtenerBien(id);
  if (!bien) notFound();
  const { tab = "datos", volver } = await searchParams;
  const pestana = HABILITADAS.includes(tab) ? tab : "datos";

  const destino = rutaDeVolver(volver);
  const origen = destino ? await obtenerPropietario(destino.propietarioId) : null;
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
  const esAdmin = usuario.roles.includes("administrador");
  const supabase = await crearClienteServidor();
  const { data: activos } = await supabase.from("propietario").select("id, nombre_razon_social").eq("estado", "activo").is("deleted_at", null).order("nombre_razon_social");
  const candidatos = (activos ?? [])
    .filter((p) => !titulares.some((x) => x.propietarioId === p.id))
    .map((p) => ({ id: p.id as string, nombre: p.nombre_razon_social as string }));
  const titulo = bien.esGastosVarios ? `${t("bienes.gastos_varios")} · ${titulares[0]?.nombre ?? ""}` : bien.alias;
  const vacio = t("propietarios.dato_vacio");

  return (
    <>
      {destino && origen && <BotonVolver href={destino.href} nombre={origen.nombre} />}
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
            {bien.esGastosVarios && <span className="estado estado-ok">{t(`estado_bien.${bien.estado}`)}</span>}
            {titularidad === "vacia" && <span className="estado estado-vencida">{t("bienes.sin_titulares")}</span>}
            {titularidad === "excedida" && <span className="estado estado-vencida">{t("bienes.titularidad_excedida")}</span>}
          </p>
        </div>
        {!bien.esGastosVarios && <CambiarEstadoBien bienId={bien.id} tipo={bien.tipoBien as TipoBien} estado={bien.estado} />}
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
          HABILITADAS.includes(clave) ? (
            <Link
              key={clave}
              href={`/bienes/${bien.id}?tab=${clave}${destino ? `&${conVolver(destino.href)}` : ""}`}
              className={pestana === clave ? "pestana activa" : "pestana"}
              aria-current={pestana === clave ? "page" : undefined}
            >
              {t(`bienes.tab_${clave}`)}
            </Link>
          ) : (
            <span key={clave} className="pestana deshabilitada" title={t("bienes.tab_proximamente")}>{t(`bienes.tab_${clave}`)}</span>
          ),
        )}
      </nav>

      {pestana === "servicios" && <SeccionServicios bienId={bien.id} servicios={await serviciosDelBien(bien.id)} />}

      {pestana === "datos" && (
        <>
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
          <dd>
            {bien.modoLiquidacion === "a_propietario"
              ? t("bienes.modo_a_propietario_de", { nombre: titulares.find((x) => x.propietarioId === bien.propietarioLiquidacionId)?.nombre ?? "—" })
              : t(`bienes.modo_${bien.modoLiquidacion}`)}
          </dd>
          <dt>{t("bienes.dato_observaciones")}</dt>
          <dd>{bien.observaciones ?? vacio}</dd>
        </dl>
      </section>

      <SeccionTitulares
        bienId={bien.id}
        titulares={titulares}
        candidatos={candidatos}
        modo={bien.modoLiquidacion}
        propietarioLiquidacionId={bien.propietarioLiquidacionId}
        puedeEditar={esAdmin && !bien.esGastosVarios}
      />
        </>
      )}
    </>
  );
}

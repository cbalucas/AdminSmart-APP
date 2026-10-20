import Link from "next/link";
import { FormularioEnVivo } from "@/components/FormularioEnVivo";
import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { AccionIcono } from "@/components/AccionIcono";
import { enlaceGoogleMaps, estadoTitularidad, formatearDireccion, normalizarNombre, TIPOS_BIEN } from "@ai/domain";
import { listarBienes, listarEdificios, titularesDe, type Bien, type Edificio, type Titular } from "@/lib/bienes";
import { IconoBien } from "@/components/IconoBien";
import { resumenDeBienes } from "@/lib/estado-bienes";
import { esGestion } from "@/lib/menu";
import { usuarioActual } from "@/lib/usuario-actual";

interface Filtros {
  q?: string;
  tipo?: string;
  estado?: string;
  propietario?: string;
  edificio?: string;
  agrupar?: string;
  gv?: string;
}

const ESTADOS = ["disponible", "alquilado", "en_refaccion", "vendido", "activo", "de_baja"];

// La dirección de un bien: la propia o, si está en un edificio, la del edificio más su unidad.
function ubicacionDe(b: Bien, edificio: Edificio | undefined) {
  const base = edificio ?? b;
  return {
    texto: formatearDireccion({
      calle: base.calle,
      numero: base.numero,
      piso: b.piso,
      departamento: b.departamento,
      localidad: base.localidad,
      provincia: base.provincia,
    }),
    mapa: enlaceGoogleMaps({
      latitud: b.latitud,
      longitud: b.longitud,
      calle: base.calle,
      numero: base.numero,
      localidad: base.localidad,
      provincia: base.provincia,
    }),
  };
}

// P-15 Listado de bienes.
export default async function Bienes({ searchParams }: { searchParams: Promise<Filtros> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const f = await searchParams;

  const [todos, edificios] = await Promise.all([listarBienes(), listarEdificios()]);
  const titulares = await titularesDe(todos.map((b) => b.id));
  const edificioDe = new Map(edificios.map((e) => [e.id, e]));

  const buscado = normalizarNombre(f.q ?? "");
  const lista = todos
    .filter((b) => f.gv === "1" || !b.esGastosVarios)
    .filter((b) => !f.tipo || b.tipoBien === f.tipo)
    .filter((b) => !f.estado || b.estado === f.estado)
    .filter((b) => !f.propietario || (titulares.get(b.id) ?? []).some((x) => x.propietarioId === f.propietario))
    .filter((b) => !f.edificio || (f.edificio === "ninguno" ? !b.edificioId : b.edificioId === f.edificio))
    .filter((b) => {
      if (!buscado) return true;
      const u = ubicacionDe(b, b.edificioId ? edificioDe.get(b.edificioId) : undefined);
      const propios = (titulares.get(b.id) ?? []).map((x) => x.nombre).join(" ");
      const nombreEdificio = b.edificioId ? (edificioDe.get(b.edificioId)?.nombre ?? "") : "";
      return normalizarNombre([b.alias, u.texto, b.dominio ?? "", b.marcaModelo ?? "", propios, nombreEdificio].join(" ")).includes(buscado);
    });

  const situaciones = await resumenDeBienes(lista.map((b) => b.id));
  const hayFiltros = Boolean(f.q || f.tipo || f.estado || f.agrupar || f.gv);
  const edificiosEnUso = edificios.filter((e) => todos.some((b) => b.edificioId === e.id));

  const tarjeta = (b: Bien) => {
    const ts: Titular[] = titulares.get(b.id) ?? [];
    const edificio = b.edificioId ? edificioDe.get(b.edificioId) : undefined;
    const u = ubicacionDe(b, edificio);
    const titularidad = estadoTitularidad(ts.map((x) => x.porcentaje));
    const alerta = titularidad === "vacia" ? t("bienes.sin_titulares") : titularidad === "excedida" ? t("bienes.titularidad_excedida") : null;
    const nombre = b.esGastosVarios ? `${t("bienes.gastos_varios")} · ${ts[0]?.nombre ?? ""}` : b.alias;
    const situacion = situaciones.get(b.id)?.situacion ?? "sin_obligaciones";
    const clase = { con_deuda: "estado estado-vencida", a_completar: "estado estado-ambar", al_dia: "estado estado-ok", sin_obligaciones: "estado estado-neutro" }[situacion];
    const propietarios = ts.length === 0 ? "" : ts.length === 1 ? ts[0]!.nombre : `${ts[0]!.nombre} +${ts.length - 1}`;
    return (
      <li key={b.id} className="tarjeta-propietario tarjeta-bien">
        <Link href={`/bienes/${b.id}`} className="tarjeta-propietario-vinculo" aria-label={nombre} />
        <IconoBien tipo={b.tipoBien} />
        <strong className="tarjeta-propietario-nombre">{nombre}</strong>
        <span className="muted">
          {t(`tipo_bien.${b.tipoBien}`)}
          {b.subtipo && ` · ${t(`subtipo.${b.subtipo}`)}`}
          {b.dominio && ` · ${b.dominio}`}
        </span>
        <p className="insignias">
          <span className={["disponible", "activo", "alquilado"].includes(b.estado) ? "estado estado-ok" : "estado estado-neutro"}>{t(`estado_bien.${b.estado}`)}</span>
          <span className={clase}>{t(`bien_card.${situacion}`)}</span>
          {alerta && <span className="estado estado-vencida">{alerta}</span>}
        </p>
        <dl className="tarjeta-propietario-datos">
          <div className="dato-ancho"><dt>{t("bienes.col_propietarios")}</dt><dd>{propietarios || "—"}</dd></div>
          <div className="dato-ancho">
            <dt>{t("bienes.col_ubicacion")}</dt>
            <dd>{u.texto || "—"}{edificio && <span className="linea muted">{edificio.nombre}{b.unidadFuncional && ` · ${b.unidadFuncional}`}</span>}</dd>
          </div>
        </dl>
        {u.mapa && (
          <span className="tarjeta-esquina">
            <AccionIcono href={u.mapa} externo icono="ubicacion" titulo={t("bienes.ver_mapa")} />
          </span>
        )}
      </li>
    );
  };

  const tabla = (bienes: Bien[]) => <ul className="tarjetas-bienes">{bienes.map(tarjeta)}</ul>;

  // Agrupado por edificio: cada edificio con sus unidades y, al final, los bienes sin edificio.
  const grupos =
    f.agrupar === "1"
      ? [
          ...edificiosEnUso
            .map((e) => ({ titulo: e.nombre, bienes: lista.filter((b) => b.edificioId === e.id) }))
            .filter((g) => g.bienes.length > 0),
          { titulo: t("bienes.sin_edificio"), bienes: lista.filter((b) => !b.edificioId) },
        ].filter((g) => g.bienes.length > 0)
      : null;

  return (
    <>
      <div className="encabezado">
        <h1>{t("bienes.titulo")}</h1>
        <AccionIcono href="/bienes/nuevo" icono="mas" titulo={t("bienes.nuevo")} tono="primario" />
      </div>

      <section className="panel">
        <FormularioEnVivo className="filtros filtros-compactos">
          <div className="campo filtro-buscar">
            <input type="search" name="q" defaultValue={f.q ?? ""} placeholder={t("bienes.buscar")} aria-label={t("bienes.buscar")} autoComplete="off" />
          </div>
          <div className="campo">
            <label htmlFor="f-tipo">{t("bienes.filtro_tipo")}</label>
            <select id="f-tipo" name="tipo" defaultValue={f.tipo ?? ""}>
              <option value="">{t("bienes.filtro_todos")}</option>
              {TIPOS_BIEN.map((x) => (
                <option key={x} value={x}>{t(`tipo_bien.${x}`)}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-estado">{t("bienes.filtro_estado")}</label>
            <select id="f-estado" name="estado" defaultValue={f.estado ?? ""}>
              <option value="">{t("bienes.filtro_todos")}</option>
              {ESTADOS.map((x) => (
                <option key={x} value={x}>{t(`estado_bien.${x}`)}</option>
              ))}
            </select>
          </div>
          <div className="filtros-pie">
            <div className="filtros-opciones">
              <label className="casilla">
                <input type="checkbox" name="agrupar" value="1" defaultChecked={f.agrupar === "1"} />
                {t("bienes.agrupar")}
              </label>
              <label className="casilla">
                <input type="checkbox" name="gv" value="1" defaultChecked={f.gv === "1"} />
                {t("bienes.mostrar_gastos_varios")}
              </label>
            </div>
            {hayFiltros && <Link href="/bienes" className="boton-texto">{t("bienes.limpiar")}</Link>}
          </div>
        </FormularioEnVivo>

        {lista.length === 0 ? (
          <p className="muted">{todos.filter((b) => !b.esGastosVarios).length === 0 ? t("bienes.vacio") : t("bienes.sin_resultados")}</p>
        ) : grupos ? (
          grupos.map((g) => (
            <div key={g.titulo} className="grupo-edificio">
              <h2>{g.titulo}</h2>
              {tabla(g.bienes)}
            </div>
          ))
        ) : (
          tabla(lista)
        )}
      </section>
    </>
  );
}

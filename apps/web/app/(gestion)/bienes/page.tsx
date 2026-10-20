import Link from "next/link";
import { BuscadorEnVivo } from "@/components/BuscadorEnVivo";
import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { enlaceGoogleMaps, estadoTitularidad, formatearDireccion, normalizarNombre, TIPOS_BIEN } from "@ai/domain";
import { formatearPorcentaje, listarBienes, listarEdificios, titularesDe, type Bien, type Edificio, type Titular } from "@/lib/bienes";
import { esGestion } from "@/lib/menu";
import { crearClienteServidor } from "@/lib/supabase/servidor";
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

  const supabase = await crearClienteServidor();
  const [todos, edificios, { data: propietarios }] = await Promise.all([
    listarBienes(),
    listarEdificios(),
    supabase.from("propietario").select("id, nombre_razon_social").is("deleted_at", null).order("nombre_razon_social"),
  ]);
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
      return normalizarNombre([b.alias, u.texto, b.dominio ?? "", b.marcaModelo ?? ""].join(" ")).includes(buscado);
    });

  const hayFiltros = Boolean(f.q || f.tipo || f.estado || f.propietario || f.edificio);
  const edificiosEnUso = edificios.filter((e) => todos.some((b) => b.edificioId === e.id));

  const fila = (b: Bien) => {
    const ts: Titular[] = titulares.get(b.id) ?? [];
    const edificio = b.edificioId ? edificioDe.get(b.edificioId) : undefined;
    const u = ubicacionDe(b, edificio);
    const titularidad = estadoTitularidad(ts.map((x) => x.porcentaje));
    const alerta = titularidad === "vacia" ? t("bienes.sin_titulares") : titularidad === "excedida" ? t("bienes.titularidad_excedida") : null;
    return (
      <tr key={b.id}>
        <td data-label={t("bienes.col_bien")}>
          <Link href={`/bienes/${b.id}`} className="celda-bien">
            <strong>{b.esGastosVarios ? `${t("bienes.gastos_varios")} · ${ts[0]?.nombre ?? ""}` : b.alias}</strong>
            {b.dominio && <span className="muted">{b.dominio}</span>}
          </Link>
        </td>
        <td data-label={t("bienes.col_tipo")}>
          {t(`tipo_bien.${b.tipoBien}`)}
          {b.subtipo && <span className="muted"> · {t(`subtipo.${b.subtipo}`)}</span>}
        </td>
        <td data-label={t("bienes.col_propietarios")}>
          {ts.length === 0 ? (
            <span className="muted">—</span>
          ) : (
            ts.map((x) => (
              <span key={x.vinculoId} className="linea">
                {x.nombre} <span className="muted">{formatearPorcentaje(x.porcentaje)} %</span>
              </span>
            ))
          )}
          {alerta && <span className="estado estado-vencida">{alerta}</span>}
        </td>
        <td data-label={t("bienes.col_ubicacion")}>
          {u.texto || <span className="muted">—</span>}
          {edificio && <span className="linea muted">{edificio.nombre}{b.unidadFuncional && ` · ${b.unidadFuncional}`}</span>}
          {u.mapa && (
            <span className="linea">
              <a href={u.mapa} target="_blank" rel="noreferrer">{t("bienes.ver_mapa")}</a>
            </span>
          )}
        </td>
        <td data-label={t("bienes.col_estado")}>
          <span className={["disponible", "activo", "alquilado"].includes(b.estado) ? "estado estado-ok" : "estado estado-neutro"}>
            {t(`estado_bien.${b.estado}`)}
          </span>
        </td>
      </tr>
    );
  };

  const tabla = (bienes: Bien[]) => (
    <div className="tabla-envoltorio">
      <table className="tabla tabla-responsive">
        <thead>
          <tr>
            <th>{t("bienes.col_bien")}</th>
            <th>{t("bienes.col_tipo")}</th>
            <th>{t("bienes.col_propietarios")}</th>
            <th>{t("bienes.col_ubicacion")}</th>
            <th>{t("bienes.col_estado")}</th>
          </tr>
        </thead>
        <tbody>{bienes.map(fila)}</tbody>
      </table>
    </div>
  );

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
        <Link href="/bienes/nuevo" className="boton">{t("bienes.nuevo")}</Link>
      </div>

      <section className="panel">
        <form className="filtros" role="search">
          <div className="campo filtro-buscar">
            <BuscadorEnVivo defaultValue={f.q ?? ""} placeholder={t("bienes.buscar")} ariaLabel={t("bienes.buscar")} />
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
          <div className="campo">
            <label htmlFor="f-prop">{t("bienes.filtro_propietario")}</label>
            <select id="f-prop" name="propietario" defaultValue={f.propietario ?? ""}>
              <option value="">{t("bienes.filtro_todos")}</option>
              {(propietarios ?? []).map((p) => (
                <option key={p.id as string} value={p.id as string}>{p.nombre_razon_social as string}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-edif">{t("bienes.filtro_edificio")}</label>
            <select id="f-edif" name="edificio" defaultValue={f.edificio ?? ""}>
              <option value="">{t("bienes.filtro_todos")}</option>
              <option value="ninguno">{t("bienes.sin_edificio")}</option>
              {edificiosEnUso.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
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
          <div className="acciones">
            {hayFiltros && <Link href="/bienes" className="boton-texto">{t("bienes.limpiar")}</Link>}
            <button type="submit" className="boton boton-secundario">{t("bienes.filtrar")}</button>
          </div>
          </div>
        </form>

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

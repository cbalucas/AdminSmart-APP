import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { formatearImporte, formatearPeriodo, TIPOS_BIEN, type EstadoObligacion } from "@ai/domain";
import { listarBienes, titularesDe } from "@/lib/bienes";
import { listarObligaciones, type FilaObligacion } from "@/lib/obligaciones";
import { esGestion } from "@/lib/menu";
import { usuarioActual } from "@/lib/usuario-actual";

interface Filtros {
  estado?: string;
  propietario?: string;
  tipo?: string;
  responsable?: string;
  periodo?: string;
}

const ESTADOS: EstadoObligacion[] = ["vencida", "pendiente", "a_completar", "pagada"];
const CLASE_ESTADO: Record<EstadoObligacion, string> = {
  pagada: "estado estado-ok",
  pendiente: "estado estado-neutro",
  vencida: "estado estado-vencida",
  a_completar: "estado estado-ambar",
  anulada: "estado estado-neutro",
};

const fechaCorta = (f: string) => f.split("-").reverse().join("/");

// P-26 Obligaciones.
export default async function Obligaciones({ searchParams }: { searchParams: Promise<Filtros> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const f = await searchParams;

  const [todas, bienes] = await Promise.all([listarObligaciones(), listarBienes()]);
  const titulares = await titularesDe(bienes.map((b) => b.id));
  const bienDe = new Map(bienes.map((b) => [b.id, b]));

  const propietarios = new Map<string, string>();
  for (const lista of titulares.values()) for (const x of lista) propietarios.set(x.propietarioId, x.nombre);
  const periodos = [...new Set(todas.map((o) => o.periodo))].sort().reverse();

  // Todos los filtros menos el estado: sobre este resultado se cuentan las pestañas.
  const sinEstado = todas
    .filter((o) => !f.propietario || (titulares.get(o.bienId) ?? []).some((x) => x.propietarioId === f.propietario))
    .filter((o) => !f.tipo || bienDe.get(o.bienId)?.tipoBien === f.tipo)
    .filter((o) => !f.responsable || o.responsable === f.responsable)
    .filter((o) => !f.periodo || o.periodo === f.periodo);
  const cuenta = (e: EstadoObligacion) => sinEstado.filter((o) => o.estado === e).length;
  const lista = sinEstado
    .filter((o) => !f.estado || o.estado === f.estado)
    .sort((a, b) => a.periodo.localeCompare(b.periodo) || (a.vencimiento ?? "9999").localeCompare(b.vencimiento ?? "9999"));

  const hayFiltros = Boolean(f.propietario || f.tipo || f.responsable || f.periodo);
  const porCompletar = todas.filter((o) => o.estado === "a_completar").length;
  const conMonto = lista.filter((o) => o.monto !== null && o.moneda === "ARS").reduce((s, o) => s + (o.monto as number), 0);

  const enlace = (estado: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, estado })) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `/obligaciones?${s}` : "/obligaciones";
  };

  const fila = (o: FilaObligacion) => {
    const bien = bienDe.get(o.bienId);
    const ts = titulares.get(o.bienId) ?? [];
    return (
      <tr key={o.id}>
        <td>
          <strong>{bien ? (bien.esGastosVarios ? `${t("bienes.gastos_varios")} · ${ts[0]?.nombre ?? ""}` : bien.alias) : "—"}</strong>
          {bien && (
            <span className="linea muted">
              {t(`tipo_bien.${bien.tipoBien}`)}
              {ts.length > 0 && ` · ${ts.map((x) => x.nombre).join(" · ")}`}
            </span>
          )}
        </td>
        <td>
          {o.concepto}
          <span className="linea muted">
            {o.empresa ?? o.descripcion ?? t("obligaciones.gasto_suelto")}
            {o.esRecurrente && o.frecuencia && ` · ${t("obligaciones.recurrente")} ${t(`obligaciones.frec_${o.frecuencia}`).toLowerCase()}`}
          </span>
        </td>
        <td className="nowrap">{formatearPeriodo(o.periodo)}</td>
        <td className="nowrap">{o.vencimiento ? fechaCorta(o.vencimiento) : <span className="muted">—</span>}</td>
        <td className="num">
          {o.monto === null ? <span className="falta-monto">{t("obligaciones.falta_monto")}</span> : formatearImporte(o.monto, o.moneda)}
        </td>
        <td>{t(`obligaciones.responsable_${o.responsable}`)}</td>
        <td className="nowrap">
          <span className={CLASE_ESTADO[o.estado]}>{t(`obligaciones.estado_${o.estado}`)}</span>
        </td>
      </tr>
    );
  };

  return (
    <>
      <div className="encabezado">
        <div>
          <p className="muted">{t("obligaciones.subtitulo")}</p>
          <h1>{t("obligaciones.titulo")}</h1>
        </div>
      </div>

      {porCompletar > 0 && (
        <p className="aviso-advertencia" role="status">
          {porCompletar === 1 ? t("obligaciones.aviso_a_completar_uno") : t("obligaciones.aviso_a_completar", { cantidad: String(porCompletar) })}
        </p>
      )}

      <section className="panel">
        <nav className="pildoras" aria-label={t("obligaciones.col_estado")}>
          <Link href={enlace("")} className={!f.estado ? "pildora activa" : "pildora"}>
            {t("obligaciones.estado_todas")} <span className="contador">{sinEstado.length}</span>
          </Link>
          {ESTADOS.map((e) => (
            <Link key={e} href={enlace(e)} className={f.estado === e ? "pildora activa" : "pildora"}>
              {t(`obligaciones.estado_${e}`)} <span className="contador">{cuenta(e)}</span>
            </Link>
          ))}
        </nav>

        <form className="filtros filtros-separados" role="search">
          {f.estado && <input type="hidden" name="estado" value={f.estado} />}
          <div className="campo">
            <label htmlFor="f-prop">{t("obligaciones.filtro_propietario")}</label>
            <select id="f-prop" name="propietario" defaultValue={f.propietario ?? ""}>
              <option value="">{t("obligaciones.filtro_todos")}</option>
              {[...propietarios].sort((a, b) => a[1].localeCompare(b[1])).map(([id, nombre]) => (
                <option key={id} value={id}>{nombre}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-tipo">{t("obligaciones.filtro_tipo")}</label>
            <select id="f-tipo" name="tipo" defaultValue={f.tipo ?? ""}>
              <option value="">{t("obligaciones.filtro_todos")}</option>
              {TIPOS_BIEN.map((x) => (
                <option key={x} value={x}>{t(`tipo_bien.${x}`)}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-resp">{t("obligaciones.filtro_responsable")}</label>
            <select id="f-resp" name="responsable" defaultValue={f.responsable ?? ""}>
              <option value="">{t("obligaciones.filtro_todos")}</option>
              <option value="propietario">{t("obligaciones.responsable_propietario")}</option>
              <option value="inquilino">{t("obligaciones.responsable_inquilino")}</option>
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-per">{t("obligaciones.filtro_periodo")}</label>
            <select id="f-per" name="periodo" defaultValue={f.periodo ?? ""}>
              <option value="">{t("obligaciones.filtro_todas")}</option>
              {periodos.map((p) => (
                <option key={p} value={p}>{formatearPeriodo(p)}</option>
              ))}
            </select>
          </div>
          <div className="filtros-pie">
            <p className="resumen-lista">
              {lista.length === 1
                ? t("obligaciones.resumen_uno", { total: formatearImporte(conMonto, "ARS") })
                : t("obligaciones.resumen", { cantidad: String(lista.length), total: formatearImporte(conMonto, "ARS") })}
            </p>
            <div className="acciones">
              {(hayFiltros || f.estado) && <Link href="/obligaciones" className="boton-texto">{t("obligaciones.limpiar")}</Link>}
              <button type="submit" className="boton boton-secundario">{t("obligaciones.filtrar")}</button>
            </div>
          </div>
        </form>

        {lista.length === 0 ? (
          <p className="muted">{todas.length === 0 ? t("obligaciones.vacio") : t("obligaciones.sin_resultados")}</p>
        ) : (
          <div className="tabla-envoltorio">
            <table className="tabla">
              <thead>
                <tr>
                  <th>{t("obligaciones.col_bien")}</th>
                  <th>{t("obligaciones.col_concepto")}</th>
                  <th>{t("obligaciones.col_periodo")}</th>
                  <th>{t("obligaciones.col_vencimiento")}</th>
                  <th className="num">{t("obligaciones.col_monto")}</th>
                  <th>{t("obligaciones.col_responsable")}</th>
                  <th>{t("obligaciones.col_estado")}</th>
                </tr>
              </thead>
              <tbody>{lista.map(fila)}</tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

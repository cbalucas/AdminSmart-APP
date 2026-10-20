import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { DetalleCambios, ResumenCambios } from "@/components/ResumenCambios";
import { ACCIONES_AUDITORIA, consultarAuditoria, TABLAS_AUDITADAS, usuariosParaFiltro, type FiltrosAuditoria } from "@/lib/auditoria";
import { esGestion } from "@/lib/menu";
import { usuarioActual } from "@/lib/usuario-actual";

const fechaHora = (f: string) =>
  new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Cordoba" }).format(new Date(f));

const CLASE_ACCION: Record<string, string> = {
  alta: "estado estado-ok",
  modificacion: "estado estado-neutro",
  anulacion: "estado estado-vencida",
  reapertura: "estado estado-ambar",
};

// P-45 Auditoría: el administrador ve todo y el operador solo lo referido a sus bienes (AUD-01); nadie la edita (AUD-02).
export default async function Auditoria({ searchParams }: { searchParams: Promise<FiltrosAuditoria> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const f = await searchParams;

  const [{ filas, total, pagina, paginas }, usuarios] = await Promise.all([consultarAuditoria(f), usuariosParaFiltro()]);
  const hayFiltros = Boolean(f.usuario || f.tabla || f.accion || f.desde || f.hasta);

  const enlace = (cambios: Partial<FiltrosAuditoria>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, ...cambios })) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `/auditoria?${s}` : "/auditoria";
  };
  const paramsExport = new URLSearchParams();
  for (const k of ["usuario", "tabla", "accion", "desde", "hasta"] as const) if (f[k]) paramsExport.set(k, f[k] as string);

  return (
    <>
      <div className="encabezado">
        <div>
          <p className="muted">{t("auditoria.subtitulo")}</p>
          <h1>{t("auditoria.titulo")}</h1>
        </div>
        <a href={`/auditoria/exportar?${paramsExport.toString()}`} className="boton boton-secundario">{t("auditoria.exportar")}</a>
      </div>

      <section className="panel">
        <form className="filtros" role="search">
          <div className="campo">
            <label htmlFor="a-usuario">{t("auditoria.filtro_usuario")}</label>
            <select id="a-usuario" name="usuario" defaultValue={f.usuario ?? ""}>
              <option value="">{t("auditoria.todos")}</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="a-tabla">{t("auditoria.filtro_objeto")}</label>
            <select id="a-tabla" name="tabla" defaultValue={f.tabla ?? ""}>
              <option value="">{t("auditoria.todos")}</option>
              {TABLAS_AUDITADAS.map((x) => (
                <option key={x} value={x}>{t(`auditoria.tabla_${x}`)}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="a-accion">{t("auditoria.filtro_accion")}</label>
            <select id="a-accion" name="accion" defaultValue={f.accion ?? ""}>
              <option value="">{t("auditoria.todas")}</option>
              {ACCIONES_AUDITORIA.map((x) => (
                <option key={x} value={x}>{t(`auditoria.accion_${x}`)}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="a-desde">{t("auditoria.filtro_desde")}</label>
            <input id="a-desde" name="desde" type="date" defaultValue={f.desde ?? ""} />
          </div>
          <div className="campo">
            <label htmlFor="a-hasta">{t("auditoria.filtro_hasta")}</label>
            <input id="a-hasta" name="hasta" type="date" defaultValue={f.hasta ?? ""} />
          </div>
          <div className="filtros-pie">
            <p className="resumen-lista-pie">{total === 1 ? t("auditoria.resultado_uno") : t("auditoria.resultados", { total })}</p>
            <div className="acciones">
              {hayFiltros && <Link href="/auditoria" className="boton-texto">{t("auditoria.limpiar")}</Link>}
              <button type="submit" className="boton boton-secundario">{t("auditoria.filtrar")}</button>
            </div>
          </div>
        </form>

        {filas.length === 0 ? (
          <p className="muted">{t("auditoria.vacio")}</p>
        ) : (
          <div className="tabla-envoltorio">
            <table className="tabla tabla-compacta">
              <thead>
                <tr>
                  <th>{t("auditoria.col_fecha")}</th>
                  <th>{t("auditoria.col_usuario")}</th>
                  <th>{t("auditoria.col_objeto")}</th>
                  <th>{t("auditoria.col_accion")}</th>
                  <th>{t("auditoria.col_cambios")}</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap">{fechaHora(r.fecha)}</td>
                    <td>{r.usuario ?? (r.usuarioId ? "—" : t("auditoria.sistema"))}</td>
                    <td>
                      <strong>{t(`auditoria.tabla_${r.tabla}`)}</strong>
                      {r.descripcion && <span className="linea muted">{r.descripcion}</span>}
                    </td>
                    <td className="nowrap">
                      <span className={CLASE_ACCION[r.accion] ?? "estado estado-neutro"}>{t(`auditoria.accion_${r.accion}`)}</span>
                    </td>
                    <td>
                      <ResumenCambios cambios={r.cambios} moneda={r.moneda} alta={r.accion === "alta"} />
                      {r.cambios.length > 0 && (
                        <DetalleCambios cambios={r.cambios} moneda={r.moneda} antes={r.antes} despues={r.despues} alta={r.accion === "alta"} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {paginas > 1 && (
          <nav className="paginacion" aria-label={t("auditoria.titulo")}>
            {pagina > 1 ? <Link href={enlace({ pagina: String(pagina - 1) })} className="boton boton-secundario">{t("auditoria.anterior")}</Link> : <span />}
            <span className="muted">{t("auditoria.pagina", { actual: pagina, total: paginas })}</span>
            {pagina < paginas ? <Link href={enlace({ pagina: String(pagina + 1) })} className="boton boton-secundario">{t("auditoria.siguiente")}</Link> : <span />}
          </nav>
        )}
      </section>
    </>
  );
}

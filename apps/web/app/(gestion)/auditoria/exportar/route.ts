import { NextResponse } from "next/server";
import { t } from "@ai/i18n";
import { etiquetaCampo, valorVisible } from "@/components/ResumenCambios";
import { consultarAuditoria, LIMITE_EXPORTACION, type FiltrosAuditoria } from "@/lib/auditoria";
import { agregarFila, crearHoja, respuestaExcel, sufijoFecha } from "@/lib/excel";
import { esGestion } from "@/lib/menu";
import { fechaHoy } from "@/lib/obligaciones";
import { usuarioActual } from "@/lib/usuario-actual";

const FORMATO_FECHA_HORA = "dd/mm/yyyy hh:mm";
const fechaCorta = (f: string) => f.split("-").reverse().join("/");

// P-45 "Exportar": una fila por cada campo que cambió, con los filtros de la pantalla (hasta 5.000 registros).
export async function GET(request: Request) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) return new NextResponse("No autorizado", { status: 403 });
  const q = new URL(request.url).searchParams;
  const f: FiltrosAuditoria = {
    usuario: q.get("usuario") ?? undefined,
    tabla: q.get("tabla") ?? undefined,
    accion: q.get("accion") ?? undefined,
    desde: q.get("desde") ?? undefined,
    hasta: q.get("hasta") ?? undefined,
  };
  const { filas, total } = await consultarAuditoria(f, "todo");
  const hoy = fechaHoy();
  const filtros = [f.tabla ? t(`auditoria.tabla_${f.tabla}`) : null, f.accion ? t(`auditoria.accion_${f.accion}`) : null, f.desde ? `${t("auditoria.filtro_desde")} ${fechaCorta(f.desde)}` : null, f.hasta ? `${t("auditoria.filtro_hasta")} ${fechaCorta(f.hasta)}` : null].filter(Boolean);
  const limite = total > LIMITE_EXPORTACION ? ` · ${t("auditoria.limite_exportacion", { limite: LIMITE_EXPORTACION })}` : "";

  const h = crearHoja(
    t("auditoria.hoja"),
    t("auditoria.titulo"),
    `${t("exportar.exportado_el", { fecha: fechaCorta(hoy) })} · ${t("exportar.filtro", { filtro: filtros.length > 0 ? filtros.join(", ") : t("exportar.sin_filtro") })}${limite}`,
    [
      { titulo: t("auditoria.col_fecha"), ancho: 17, tipo: "fecha" },
      { titulo: t("auditoria.col_usuario"), ancho: 22 },
      { titulo: t("auditoria.col_objeto"), ancho: 26 },
      { titulo: t("auditoria.registro"), ancho: 28 },
      { titulo: t("auditoria.col_accion"), ancho: 14 },
      { titulo: t("auditoria.campo"), ancho: 28 },
      { titulo: t("auditoria.antes"), ancho: 30 },
      { titulo: t("auditoria.despues"), ancho: 30 },
    ],
  );
  const formatos = [FORMATO_FECHA_HORA, undefined, undefined, undefined, undefined, undefined, undefined, undefined];
  for (const r of filas) {
    const base = [new Date(r.fecha), r.usuario ?? (r.usuarioId ? "—" : t("auditoria.sistema")), t(`auditoria.tabla_${r.tabla}`), r.descripcion || r.registroId.slice(0, 8), t(`auditoria.accion_${r.accion}`)];
    if (r.cambios.length === 0) {
      agregarFila(h, [...base, null, null, null], formatos);
      continue;
    }
    for (const c of r.cambios) {
      agregarFila(h, [...base, etiquetaCampo(c.campo), r.accion === "alta" ? null : valorVisible(c.campo, c.antes, r.moneda), valorVisible(c.campo, c.despues, r.moneda)], formatos);
    }
  }
  return respuestaExcel(h, `auditoria-${sufijoFecha(hoy)}.xlsx`);
}

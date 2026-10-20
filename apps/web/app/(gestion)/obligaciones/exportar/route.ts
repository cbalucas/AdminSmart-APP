import { NextResponse } from "next/server";
import { t } from "@ai/i18n";
import { formatoImporte, FORMATO_FECHA, aFecha, agregarFila, agregarTotal, crearHoja, respuestaExcel, sufijoFecha, type Celda } from "@/lib/excel";
import { filtrarObligaciones, type FiltrosObligaciones } from "@/lib/filtrar-obligaciones";
import { listarBienes, titularesDe } from "@/lib/bienes";
import { esGestion } from "@/lib/menu";
import { fechaHoy, listarObligaciones } from "@/lib/obligaciones";
import { pagosVigentesDe } from "@/lib/pagos";
import { usuarioActual } from "@/lib/usuario-actual";
import { formatearPeriodo, type Moneda } from "@ai/domain";

// P-26 "Exportar a Excel": las obligaciones con los filtros que se estaban usando, en el formato del modelo.
export async function GET(request: Request) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) return new NextResponse("No autorizado", { status: 403 });
  const q = new URL(request.url).searchParams;
  const f: FiltrosObligaciones = {
    estado: q.get("estado") ?? undefined,
    propietario: q.get("propietario") ?? undefined,
    tipo: q.get("tipo") ?? undefined,
    responsable: q.get("responsable") ?? undefined,
    periodo: q.get("periodo") ?? undefined,
    q: q.get("q") ?? undefined,
  };

  const [todas, bienes] = await Promise.all([listarObligaciones(), listarBienes()]);
  const [titulares, pagos] = await Promise.all([
    titularesDe(bienes.map((b) => b.id)),
    pagosVigentesDe(todas.filter((o) => o.estado === "pagada").map((o) => o.id)),
  ]);
  const bienDe = new Map(bienes.map((b) => [b.id, b]));
  const { lista } = filtrarObligaciones(todas, f, titulares, bienDe);

  // Descripción del filtro para el subtítulo.
  const nombrePropietario = f.propietario ? [...titulares.values()].flat().find((x) => x.propietarioId === f.propietario)?.nombre : undefined;
  const partes = [
    f.estado ? t(`obligaciones.estado_${f.estado}`) : null,
    nombrePropietario ?? null,
    f.tipo ? t(`tipo_bien.${f.tipo}`) : null,
    f.responsable ? t(`obligaciones.responsable_${f.responsable}`) : null,
    f.periodo ? formatearPeriodo(f.periodo) : null,
    f.q ? `"${f.q}"` : null,
  ].filter(Boolean);
  const hoy = fechaHoy();
  const subtitulo = `${t("exportar.exportado_el", { fecha: hoy.split("-").reverse().join("/") })} · ${t("exportar.filtro", { filtro: partes.length > 0 ? partes.join(", ") : t("exportar.sin_filtro") })}`;

  const h = crearHoja(t("obligaciones.titulo"), t("obligaciones.titulo"), subtitulo, [
    { titulo: t("obligaciones.col_bien"), ancho: 24 },
    { titulo: t("obligaciones.col_concepto"), ancho: 16 },
    { titulo: t("obligaciones.col_empresa"), ancho: 34 },
    { titulo: t("obligaciones.col_periodo"), ancho: 10 },
    { titulo: t("obligaciones.col_vencimiento"), ancho: 13, tipo: "fecha" },
    { titulo: t("obligaciones.col_moneda"), ancho: 9 },
    { titulo: t("obligaciones.col_monto"), ancho: 14, tipo: "importe" },
    { titulo: t("obligaciones.col_responsable"), ancho: 14 },
    { titulo: t("obligaciones.col_estado"), ancho: 12 },
    { titulo: t("obligaciones.col_fecha_pago"), ancho: 14, tipo: "fecha" },
    { titulo: t("obligaciones.col_pagado_por"), ancho: 16 },
  ]);

  const nombreBien = (id: string) => {
    const b = bienDe.get(id);
    if (!b) return "";
    return b.esGastosVarios ? `${t("bienes.gastos_varios")} · ${titulares.get(id)?.[0]?.nombre ?? ""}` : b.alias;
  };
  for (const o of lista) {
    const pago = pagos.get(o.id);
    const importe = o.monto === null ? null : o.monto / 100;
    const fila: Celda[] = [
      nombreBien(o.bienId),
      o.concepto,
      o.empresa ?? o.descripcion ?? "",
      `${o.periodo.slice(5, 7)}/${o.periodo.slice(0, 4)}`,
      aFecha(o.vencimiento),
      o.moneda,
      importe,
      t(`obligaciones.responsable_${o.responsable}`),
      t(`obligaciones.estado_${o.estado}`),
      aFecha(pago?.fecha ?? null),
      pago ? t(`pagos.quien_${pago.pagadoPor}`) : null,
    ];
    agregarFila(h, fila, [undefined, undefined, undefined, undefined, FORMATO_FECHA, undefined, formatoImporte(o.moneda, o.monto !== null && o.monto % 100 !== 0), undefined, undefined, FORMATO_FECHA, undefined]);
  }

  // Totales por moneda, con fórmulas de Excel (los pesos y los dólares nunca se suman entre sí).
  const ultima = h.siguiente - 1;
  const rango = (col: string) => `${col}${h.filaInicial}:${col}${ultima}`;
  const suma = (moneda: Moneda, estados?: string[]) =>
    lista.filter((o) => o.moneda === moneda && o.monto !== null && (!estados || estados.includes(o.estado))).reduce((s, o) => s + (o.monto as number), 0) / 100;
  for (const moneda of ["ARS", "USD"] as const) {
    if (!lista.some((o) => o.moneda === moneda)) continue;
    const formato = formatoImporte(moneda, lista.some((o) => o.moneda === moneda && o.monto !== null && o.monto % 100 !== 0));
    const sinFormato = Array(11).fill(undefined) as (string | undefined)[];
    const fmt = [...sinFormato];
    fmt[6] = formato;
    const vacios = (n: number) => Array<Celda>(n).fill(null);
    if (ultima >= h.filaInicial) {
      agregarTotal(h, [t("exportar.total_moneda", { moneda }), ...vacios(5), { formula: `SUMIFS(${rango("G")},${rango("F")},"${moneda}")`, resultado: suma(moneda) }, ...vacios(4)], fmt);
      const pendiente = t("obligaciones.estado_pendiente");
      const vencida = t("obligaciones.estado_vencida");
      agregarTotal(
        h,
        [
          t("exportar.total_pendiente", { moneda }),
          ...vacios(5),
          { formula: `SUMIFS(${rango("G")},${rango("F")},"${moneda}",${rango("I")},"${pendiente}")+SUMIFS(${rango("G")},${rango("F")},"${moneda}",${rango("I")},"${vencida}")`, resultado: suma(moneda, ["pendiente", "vencida"]) },
          ...vacios(4),
        ],
        fmt,
      );
    }
  }
  return respuestaExcel(h, `obligaciones-${sufijoFecha(hoy)}.xlsx`);
}

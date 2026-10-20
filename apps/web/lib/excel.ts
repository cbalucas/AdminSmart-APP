import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import type { Moneda } from "@ai/domain";

// Exportaciones a Excel con el formato de docs/modelos/Exportacion_modelo.xlsx: título, subtítulo, encabezado oscuro
// con fila fija y filtro, filas con borde fino, totales en gris y fórmulas de Excel para totales y saldos.
const FUENTE = "Arial";
const COLOR = { texto: "FF18212B", gris: "FF55606B", cabecera: "FF18212B", blanco: "FFFFFFFF", borde: "FFD8DEE6", total: "FFF3F5F8", entrada: "FF0000FF" };

/** Formato de importe del modelo: "$ 1.234" y "US$ 1.234"; con centavos solo donde el importe los tiene. */
export function formatoImporte(moneda: Moneda, conCentavos: boolean): string {
  const sufijo = conCentavos ? ".00" : "";
  const marca = moneda === "USD" ? "US$ " : "$ ";
  return `"${marca}"#,##0${sufijo};"-${marca}"#,##0${sufijo};\\-`;
}

export type TipoColumna = "texto" | "fecha" | "importe";
export interface Columna {
  titulo: string;
  ancho: number;
  tipo?: TipoColumna;
}

export type Celda = string | number | Date | null | { formula: string; resultado?: number };

export interface HojaExcel {
  libro: ExcelJS.Workbook;
  hoja: ExcelJS.Worksheet;
  /** Primera fila de datos (la 5, como en el modelo). */
  filaInicial: number;
  siguiente: number;
}

/** Hoja con título (fila 1), subtítulo (fila 2) y encabezado (fila 4), con la fila fija y el filtro. */
export function crearHoja(nombre: string, titulo: string, subtitulo: string, columnas: Columna[]): HojaExcel {
  const libro = new ExcelJS.Workbook();
  libro.creator = "AdminSmart";
  libro.created = new Date();
  const hoja = libro.addWorksheet(nombre.slice(0, 31), { views: [{ state: "frozen", ySplit: 4 }] });
  hoja.columns = columnas.map((c) => ({ width: c.ancho }));
  hoja.getCell("A1").value = titulo;
  hoja.getCell("A1").font = { name: FUENTE, size: 14, bold: true, color: { argb: COLOR.texto } };
  hoja.getCell("A2").value = subtitulo;
  hoja.getCell("A2").font = { name: FUENTE, size: 9, color: { argb: COLOR.gris } };
  const cabecera = hoja.getRow(4);
  columnas.forEach((c, i) => {
    const celda = cabecera.getCell(i + 1);
    celda.value = c.titulo;
    celda.font = { name: FUENTE, size: 9, bold: true, color: { argb: COLOR.blanco } };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.cabecera } };
    celda.alignment = { vertical: "middle", wrapText: true, horizontal: c.tipo === "importe" ? "right" : "left" };
  });
  cabecera.height = 21.75;
  hoja.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columnas.length } };
  return { libro, hoja, filaInicial: 5, siguiente: 5 };
}

/** Agrega una fila de datos con el estilo del modelo. `formatos` da el formato de número de cada columna. */
export function agregarFila(h: HojaExcel, valores: Celda[], formatos: (string | undefined)[], opciones: { entrada?: number[] } = {}): number {
  const numero = h.siguiente++;
  const fila = h.hoja.getRow(numero);
  valores.forEach((v, i) => {
    const celda = fila.getCell(i + 1);
    celda.value = v === null ? null : typeof v === "object" && !(v instanceof Date) ? { formula: v.formula, result: v.resultado } : v;
    celda.font = { name: FUENTE, size: 10, color: { argb: opciones.entrada?.includes(i) ? COLOR.entrada : COLOR.texto } };
    celda.border = { bottom: { style: "thin", color: { argb: COLOR.borde } } };
    const formato = formatos[i];
    if (formato) celda.numFmt = formato;
  });
  return numero;
}

/** Fila de total, en gris y negrita. */
export function agregarTotal(h: HojaExcel, valores: Celda[], formatos: (string | undefined)[]): number {
  const numero = h.siguiente++;
  const fila = h.hoja.getRow(numero);
  valores.forEach((v, i) => {
    const celda = fila.getCell(i + 1);
    celda.value = v === null ? null : typeof v === "object" && !(v instanceof Date) ? { formula: v.formula, result: v.resultado } : v;
    celda.font = { name: FUENTE, size: 10, bold: true, color: { argb: COLOR.texto } };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.total } };
    const formato = formatos[i];
    if (formato) celda.numFmt = formato;
  });
  return numero;
}

export const FORMATO_FECHA = "dd/mm/yyyy";

/** AAAA-MM-DD a fecha de Excel (mediodía UTC: no se corre de día por la zona horaria). */
export const aFecha = (f: string | null): Date | null => (f ? new Date(`${f}T12:00:00Z`) : null);

export async function respuestaExcel(h: HojaExcel, nombreArchivo: string): Promise<NextResponse> {
  const buffer = await h.libro.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** "2026-10-20" → "20-10-2026": para el nombre del archivo. */
export const sufijoFecha = (hoy: string) => hoy.split("-").reverse().join("-");

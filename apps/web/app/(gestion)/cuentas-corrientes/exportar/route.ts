import { NextResponse } from "next/server";
import { t } from "@ai/i18n";
import type { Moneda } from "@ai/domain";
import { agregarFila, agregarTotal, aFecha, crearHoja, formatoImporte, FORMATO_FECHA, respuestaExcel, sufijoFecha, type Celda } from "@/lib/excel";
import { bienesDelPropietario, libroDelPropietario, propietariosParaCuenta } from "@/lib/cuentas-corrientes";
import { esGestion } from "@/lib/menu";
import { fechaHoy } from "@/lib/obligaciones";
import { usuarioActual } from "@/lib/usuario-actual";

const fechaCorta = (f: string) => f.split("-").reverse().join("/");
const diaAnterior = (f: string) => new Date(Date.parse(`${f}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

// P-32 "Exportar a Excel": la cuenta corriente de un propietario en una moneda, con los filtros de la pantalla.
export async function GET(request: Request) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) return new NextResponse("No autorizado", { status: 403 });
  const q = new URL(request.url).searchParams;
  const propietario = (await propietariosParaCuenta()).find((p) => p.id === q.get("propietario"));
  if (!propietario) return new NextResponse("No encontrado", { status: 404 });
  const moneda: Moneda = q.get("moneda") === "USD" ? "USD" : "ARS";
  const desde = q.get("desde") || undefined;
  const hasta = q.get("hasta") || undefined;
  const bien = q.get("bien") || undefined;

  const [bienes, libro] = await Promise.all([bienesDelPropietario(propietario.id), libroDelPropietario({ propietarioId: propietario.id, moneda, bienId: bien, desde, hasta })]);
  const nombreBien = new Map(bienes.map((b) => [b.id, b.esGeneral ? t("cuentas.general") : b.nombre]));
  const hoy = fechaHoy();

  const periodo = desde || hasta ? t("exportar.del_al", { desde: desde ? fechaCorta(desde) : "…", hasta: hasta ? fechaCorta(hasta) : fechaCorta(hoy) }) : t("exportar.todos_movimientos");
  const filtroBien = bien ? ` · ${nombreBien.get(bien) ?? ""}` : "";
  const h = crearHoja(
    t("menu.cuentas"),
    t("exportar.cuenta_titulo", { propietario: propietario.nombre, moneda: t(moneda === "ARS" ? "cuentas.pesos" : "cuentas.dolares") }),
    `${periodo}${filtroBien} · ${t("exportar.exportado_el", { fecha: fechaCorta(hoy) })}`,
    [
      { titulo: t("cuentas.col_fecha"), ancho: 13, tipo: "fecha" },
      { titulo: t("cuentas.col_bien"), ancho: 22 },
      { titulo: t("cuentas.col_tipo"), ancho: 24 },
      { titulo: t("cuentas.col_descripcion"), ancho: 40 },
      { titulo: t("cuentas.col_debe"), ancho: 14, tipo: "importe" },
      { titulo: t("cuentas.col_haber"), ancho: 14, tipo: "importe" },
      { titulo: t("cuentas.col_saldo"), ancho: 14, tipo: "importe" },
    ],
  );

  // Los centavos se muestran solo si algún importe de la hoja los tiene.
  const hayCentavos = libro.filas.some((m) => m.debe % 100 !== 0 || m.haber % 100 !== 0 || m.saldo % 100 !== 0) || libro.saldoAnterior % 100 !== 0;
  const fmt = formatoImporte(moneda, hayCentavos);
  const formatos = [FORMATO_FECHA, undefined, undefined, undefined, fmt, fmt, fmt];

  // Primera fila: saldo anterior (dato de entrada, en azul); las demás calculan el saldo con fórmulas.
  const filaSaldoAnterior = agregarFila(h, [desde ? aFecha(diaAnterior(desde)) : null, null, t("exportar.saldo_anterior"), desde ? t("cuentas.saldo_anterior") : t("exportar.saldo_inicial"), 0, 0, desde ? libro.saldoAnterior / 100 : 0], formatos, { entrada: [6] });
  let previa = filaSaldoAnterior;
  for (const m of libro.filas) {
    const fila: Celda[] = [
      aFecha(m.fecha),
      nombreBien.get(m.bienId) ?? "",
      t(`cuentas.tipo_${m.tipo}`),
      m.anulado ? `${m.descripcion} (${t("cuentas.anulado")})` : m.descripcion,
      m.debe / 100,
      m.haber / 100,
      { formula: `G${previa}+F${h.siguiente}-E${h.siguiente}`, resultado: m.saldo / 100 },
    ];
    previa = agregarFila(h, fila, formatos);
  }
  const primera = h.filaInicial + 1;
  const ultima = h.siguiente - 1;
  const totalDebe = libro.filas.reduce((s, m) => s + m.debe, 0) / 100;
  const totalHaber = libro.filas.reduce((s, m) => s + m.haber, 0) / 100;
  const saldoFinal = (libro.filas[libro.filas.length - 1]?.saldo ?? libro.saldoAnterior) / 100;
  agregarTotal(
    h,
    [
      t("exportar.saldo_final"),
      null,
      null,
      null,
      ultima >= primera ? { formula: `SUM(E${primera}:E${ultima})`, resultado: totalDebe } : 0,
      ultima >= primera ? { formula: `SUM(F${primera}:F${ultima})`, resultado: totalHaber } : 0,
      { formula: `G${ultima}`, resultado: saldoFinal },
    ],
    formatos,
  );
  const nombre = propietario.nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return respuestaExcel(h, `cuenta-corriente-${nombre}-${moneda}-${sufijoFecha(hoy)}.xlsx`);
}

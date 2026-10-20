import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatearImporte, type Moneda, type ResumenDeposito } from "@ai/domain";
import { t } from "@ai/i18n";
import { coloresClaro as c } from "@ai/ui";
import type { ResumenDelPropietario } from "@/lib/resumen-deposito";

// Resumen de depósito en PDF, según docs/modelos/Resumen_deposito_modelo.pdf: una página por moneda.
const e = StyleSheet.create({
  pagina: { fontFamily: "Plex", fontSize: 9.5, color: c.text, paddingTop: 30, paddingBottom: 50, paddingHorizontal: 40 },
  cabecera: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.lineSoft },
  marca: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { height: 34, maxWidth: 110, objectFit: "contain" },
  administracion: { fontFamily: "Serif", fontWeight: 700, fontSize: 14 },
  cabeceraDerecha: { alignItems: "flex-end" },
  tipoInforme: { fontWeight: 600, fontSize: 9.5 },
  numero: { color: c.muted, fontSize: 9 },
  titulo: { fontFamily: "Serif", fontWeight: 700, fontSize: 22, marginTop: 14, marginBottom: 8 },
  datos: { flexDirection: "row", backgroundColor: c.surface2, borderWidth: 1, borderColor: c.lineSoft, padding: 8, marginBottom: 10 },
  dato: { flex: 1, paddingRight: 8 },
  datoEtiqueta: { color: c.muted, fontSize: 8, marginBottom: 2 },
  datoValor: { fontWeight: 600 },
  caja: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#E4EBF4", borderWidth: 1, borderColor: c.accent, paddingVertical: 9, paddingHorizontal: 14, marginBottom: 8 },
  cajaEtiqueta: { fontFamily: "Serif", fontWeight: 600, fontSize: 13 },
  cajaMonto: { fontFamily: "Serif", fontWeight: 700, fontSize: 20, color: c.accent },
  seccion: { fontFamily: "Serif", fontWeight: 600, fontSize: 12.5, marginTop: 9, marginBottom: 4 },
  tablaCab: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: c.text, paddingBottom: 3 },
  th: { fontSize: 7.5, fontWeight: 600, color: c.muted, textTransform: "uppercase", letterSpacing: 0.4 },
  fila: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: c.lineSoft },
  filaTotal: { flexDirection: "row", paddingVertical: 5, backgroundColor: c.surface2, borderTopWidth: 1, borderTopColor: c.line },
  derecha: { textAlign: "right" },
  negrita: { fontWeight: 600 },
  calculo: { borderWidth: 1, borderColor: c.lineSoft },
  calculoFila: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: c.lineSoft },
  calculoTotal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 8, backgroundColor: "#E4EBF4" },
  calculoTotalTexto: { fontWeight: 600, color: c.accent },
  deposito: { flexDirection: "row", flexWrap: "wrap", backgroundColor: c.surface2, borderWidth: 1, borderColor: c.lineSoft, padding: 10 },
  depositoCelda: { paddingRight: 14 },
  nota: { marginTop: 10, color: c.muted, fontSize: 8.5 },
  pie: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", color: c.muted, fontSize: 7.5, borderTopWidth: 0.5, borderTopColor: c.lineSoft, paddingTop: 6 },
});

const fechaCorta = (f: string) => f.split("-").reverse().join("/");
const periodoCorto = (p: string) => `${p.slice(5, 7)}/${p.slice(0, 4)}`;

function etiquetaHorizonte(r: ResumenDelPropietario): string {
  const h = r.horizonte;
  const hasta = fechaCorta(r.fechaLimite);
  if (h.tipo === "dias") return t("pdf.horizonte_dias", { dias: h.dias, fecha: hasta });
  if (h.tipo === "fin_de_mes") return t("pdf.horizonte_fin_mes", { fecha: hasta });
  return t("pdf.horizonte_fecha", { fecha: hasta });
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={e.dato}>
      <Text style={e.datoEtiqueta}>{etiqueta}</Text>
      <Text style={e.datoValor}>{valor}</Text>
    </View>
  );
}

export type LogoPdf = { data: Buffer; format: "png" | "jpg" } | null;

function PaginaMoneda({ r, resumen, numero, logo }: { r: ResumenDelPropietario; resumen: ResumenDeposito; numero: string | null; logo: LogoPdf }) {
  const m = (n: number) => formatearImporte(n, resumen.moneda as Moneda);
  const d = r.deposito;
  return (
    <Page size="A4" style={e.pagina}>
      <View style={e.cabecera}>
        <View style={e.marca}>
          {logo && <Image src={{ data: logo.data, format: logo.format }} style={e.logo} />}
          <Text style={e.administracion}>{d.administracion}</Text>
        </View>
        <View style={e.cabeceraDerecha}>
          <Text style={e.tipoInforme}>{t("pdf.titulo")}</Text>
          <Text style={e.numero}>{numero ? t("pdf.numero", { numero }) : t("pdf.vista_previa")}</Text>
        </View>
      </View>

      <Text style={e.titulo}>{t("pdf.titulo")}</Text>
      <View style={e.datos}>
        <Dato etiqueta={t("pdf.propietario")} valor={r.nombre} />
        <Dato etiqueta={t("pdf.fecha")} valor={fechaCorta(r.hoy)} />
        <Dato etiqueta={t("pdf.horizonte")} valor={etiquetaHorizonte(r)} />
        <Dato etiqueta={t("pdf.moneda")} valor={t(resumen.moneda === "ARS" ? "pdf.moneda_ars" : "pdf.moneda_usd")} />
      </View>

      <View style={e.caja}>
        <Text style={e.cajaEtiqueta}>{t("pdf.a_depositar")}</Text>
        <Text style={e.cajaMonto}>{m(resumen.aDepositar)}</Text>
      </View>

      <Text style={e.seccion}>{t("pdf.pendientes")}</Text>
      <View style={e.tablaCab}>
        <Text style={[e.th, { width: "28%" }]}>{t("pdf.col_bien")}</Text>
        <Text style={[e.th, { width: "24%" }]}>{t("pdf.col_concepto")}</Text>
        <Text style={[e.th, { width: "14%" }]}>{t("pdf.col_periodo")}</Text>
        <Text style={[e.th, { width: "16%" }]}>{t("pdf.col_vencimiento")}</Text>
        <Text style={[e.th, e.derecha, { width: "18%" }]}>{t("pdf.col_monto")}</Text>
      </View>
      {resumen.pendientes.length === 0 ? (
        <Text style={[e.fila, { color: c.muted }]}>{t("pdf.sin_pendientes")}</Text>
      ) : (
        resumen.pendientes.map((o) => (
          <View key={o.id} style={e.fila} wrap={false}>
            <Text style={{ width: "28%" }}>{o.bien}</Text>
            <Text style={{ width: "24%" }}>{o.porcentaje < 100 ? `${o.concepto} (${t("pdf.su_parte", { porcentaje: String(o.porcentaje).replace(".", ",") })})` : o.concepto}</Text>
            <Text style={{ width: "14%" }}>{periodoCorto(o.periodo)}</Text>
            <Text style={{ width: "16%" }}>{fechaCorta(o.vencimiento as string)}</Text>
            <Text style={[e.derecha, { width: "18%" }]}>{m(o.monto as number)}</Text>
          </View>
        ))
      )}
      <View style={e.filaTotal}>
        <Text style={[e.negrita, { width: "82%", paddingLeft: 6 }]}>{t("pdf.total_pendiente")}</Text>
        <Text style={[e.negrita, e.derecha, { width: "18%" }]}>{m(resumen.sumaObligaciones)}</Text>
      </View>

      <Text style={e.seccion}>{t("pdf.calculo")}</Text>
      <View style={e.calculo} wrap={false}>
        <View style={e.calculoFila}>
          <Text>{t("pdf.calculo_total", { fecha: fechaCorta(r.fechaLimite) })}</Text>
          <Text>{m(resumen.sumaObligaciones)}</Text>
        </View>
        <View style={e.calculoFila}>
          <Text>{t("pdf.calculo_saldo")}</Text>
          <Text>{resumen.saldoDisponible >= 0 ? `− ${m(resumen.saldoDisponible)}` : `+ ${m(-resumen.saldoDisponible)}`}</Text>
        </View>
        {resumen.reposicionFondo > 0 && (
          <View style={e.calculoFila}>
            <Text>{t("pdf.calculo_reposicion")}</Text>
            <Text>+ {m(resumen.reposicionFondo)}</Text>
          </View>
        )}
        <View style={e.calculoTotal}>
          <Text style={e.calculoTotalTexto}>{t("pdf.a_depositar")}</Text>
          <Text style={e.calculoTotalTexto}>{m(resumen.aDepositar)}</Text>
        </View>
      </View>
      {resumen.aDepositar === 0 && resumen.saldoATransferir > 0 && (
        <Text style={e.nota}>{t("pdf.saldo_a_transferir", { monto: m(resumen.saldoATransferir) })}</Text>
      )}

      {resumen.futuras.length > 0 && (
        <View wrap={false}>
          <Text style={e.seccion}>{t("pdf.futuras")}</Text>
          <View style={e.tablaCab}>
            <Text style={[e.th, { width: "28%" }]}>{t("pdf.col_bien")}</Text>
            <Text style={[e.th, { width: "24%" }]}>{t("pdf.col_concepto")}</Text>
            <Text style={[e.th, { width: "14%" }]}>{t("pdf.col_periodo")}</Text>
            <Text style={[e.th, { width: "16%" }]}>{t("pdf.col_vencimiento")}</Text>
            <Text style={[e.th, e.derecha, { width: "18%" }]}>{t("pdf.col_monto")}</Text>
          </View>
          {resumen.futuras.map((o) => (
            <View key={o.id} style={e.fila}>
              <Text style={{ width: "28%" }}>{o.bien}</Text>
              <Text style={{ width: "24%" }}>{o.porcentaje < 100 ? `${o.concepto} (${t("pdf.su_parte", { porcentaje: String(o.porcentaje).replace(".", ",") })})` : o.concepto}</Text>
              <Text style={{ width: "14%" }}>{periodoCorto(o.periodo)}</Text>
              <Text style={{ width: "16%" }}>{fechaCorta(o.vencimiento as string)}</Text>
              <Text style={[e.derecha, { width: "18%" }]}>{m(o.monto as number)}</Text>
            </View>
          ))}
          <View style={e.filaTotal}>
            <Text style={[e.negrita, { width: "82%", paddingLeft: 6 }]}>{t("pdf.total_futuras")}</Text>
            <Text style={[e.negrita, e.derecha, { width: "18%" }]}>{m(resumen.futuras.reduce((acc, o) => acc + (o.monto as number), 0))}</Text>
          </View>
        </View>
      )}

      {resumen.aConfirmar.length > 0 && (
        <View wrap={false}>
          <Text style={e.seccion}>{t("pdf.a_confirmar")}</Text>
          <View style={e.tablaCab}>
            <Text style={[e.th, { width: "32%" }]}>{t("pdf.col_bien")}</Text>
            <Text style={[e.th, { width: "40%" }]}>{t("pdf.col_concepto")}</Text>
            <Text style={[e.th, { width: "12%" }]}>{t("pdf.col_periodo")}</Text>
            <Text style={[e.th, e.derecha, { width: "16%" }]}>{t("pdf.col_monto")}</Text>
          </View>
          {resumen.aConfirmar.map((o) => (
            <View key={o.id} style={e.fila}>
              <Text style={{ width: "32%" }}>{o.bien}</Text>
              <Text style={{ width: "40%" }}>{o.concepto}</Text>
              <Text style={{ width: "12%" }}>{periodoCorto(o.periodo)}</Text>
              <Text style={[e.derecha, { width: "16%", color: c.warn }]}>{t("pdf.a_confirmar_monto")}</Text>
            </View>
          ))}
        </View>
      )}

      {resumen.posibles.length > 0 && (
        <View wrap={false}>
          <Text style={e.seccion}>{t("pdf.posibles")}</Text>
          <View style={e.tablaCab}>
            <Text style={[e.th, { width: "28%" }]}>{t("pdf.col_bien")}</Text>
            <Text style={[e.th, { width: "16%" }]}>{t("pdf.col_concepto")}</Text>
            <Text style={[e.th, { width: "38%" }]}>{t("pdf.col_detalle")}</Text>
            <Text style={[e.th, e.derecha, { width: "18%" }]}>{t("pdf.col_monto")}</Text>
          </View>
          {resumen.posibles.map((o) => (
            <View key={o.id} style={e.fila}>
              <Text style={{ width: "28%" }}>{o.bien}</Text>
              <Text style={{ width: "16%" }}>{o.concepto}</Text>
              <Text style={{ width: "38%" }}>{o.descripcion ?? ""}</Text>
              <Text style={[e.derecha, { width: "18%" }]}>{m(o.monto as number)}</Text>
            </View>
          ))}
        </View>
      )}

      <View wrap={false}>
        <Text style={e.seccion}>{t("pdf.datos_deposito")}</Text>
        <View style={e.deposito}>
          {/* Solo se muestran los datos cargados. */}
          {[
            { etiqueta: t("pdf.banco"), valor: d.banco, ancho: "22%" },
            { etiqueta: t("pdf.titular"), valor: d.titular, ancho: "27%" },
            { etiqueta: t("pdf.cbu"), valor: d.cbu, ancho: "30%" },
            { etiqueta: t("pdf.alias"), valor: d.alias, ancho: "21%" },
          ]
            .filter((x) => x.valor)
            .map((x) => (
              <View key={x.etiqueta} style={[e.depositoCelda, { minWidth: x.ancho }]}>
                <Text style={e.datoEtiqueta}>{x.etiqueta}</Text>
                <Text style={e.datoValor}>{x.valor}</Text>
              </View>
            ))}
        </View>
        <Text style={e.nota}>{t("pdf.cierre")}</Text>
      </View>

      <View style={e.pie} fixed>
        <Text>{t("pdf.pie")}</Text>
        <Text render={({ pageNumber, totalPages }) => t("pdf.pagina", { n: pageNumber, total: totalPages })} />
      </View>
    </Page>
  );
}

export function ResumenDepositoPdf({ r, numero, logo }: { r: ResumenDelPropietario; numero: string | null; logo: LogoPdf }) {
  return (
    <Document title={`${t("pdf.titulo")} ${numero ?? ""}`.trim()} author={r.deposito.administracion} creator="AdminSmart" producer="AdminSmart">
      {/* Pesos siempre; dólares solo si hay algo que informar o depositar en esa moneda. */}
      {r.resumenes
        .filter((x) => x.moneda === "ARS" || x.pendientes.length > 0 || x.aConfirmar.length > 0 || x.posibles.length > 0 || x.futuras.length > 0 || x.aDepositar > 0)
        .map((x) => (
          <PaginaMoneda key={x.moneda} r={r} resumen={x} numero={numero} logo={logo} />
        ))}
    </Document>
  );
}

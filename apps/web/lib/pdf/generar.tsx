import { renderToBuffer } from "@react-pdf/renderer";
import { formatoDeLogoGuardado, logoSaleEnPdf } from "@ai/domain";
import { descargarLogo } from "@/lib/administracion";
import type { ResumenDelPropietario } from "@/lib/resumen-deposito";
import { registrarFuentes } from "./fuentes";
import { ResumenDepositoPdf } from "./ResumenDepositoPdf";

/** PDF del resumen de depósito. Sin número es una vista previa (no consume el correlativo DEP-AAAA-NNNN). */
export async function generarPdfResumen(r: ResumenDelPropietario, numero: string | null): Promise<Buffer> {
  registrarFuentes();
  // El logo sale en el PDF solo si es PNG o JPG; con SVG el PDF lleva únicamente el nombre.
  const formato = r.deposito.logoPath ? formatoDeLogoGuardado(r.deposito.logoPath) : null;
  const datos = r.deposito.logoPath && formato && logoSaleEnPdf(formato) ? await descargarLogo(r.deposito.logoPath) : null;
  const logo = datos && (formato === "png" || formato === "jpg") ? { data: datos, format: formato } : null;
  return renderToBuffer(<ResumenDepositoPdf r={r} numero={numero} logo={logo} />);
}

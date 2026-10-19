import { renderToBuffer } from "@react-pdf/renderer";
import type { ResumenDelPropietario } from "@/lib/resumen-deposito";
import { registrarFuentes } from "./fuentes";
import { ResumenDepositoPdf } from "./ResumenDepositoPdf";

/** PDF del resumen de depósito. Sin número es una vista previa (no consume el correlativo DEP-AAAA-NNNN). */
export async function generarPdfResumen(r: ResumenDelPropietario, numero: string | null): Promise<Buffer> {
  registrarFuentes();
  return renderToBuffer(<ResumenDepositoPdf r={r} numero={numero} />);
}

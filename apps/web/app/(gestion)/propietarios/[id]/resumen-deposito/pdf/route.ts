import { NextResponse } from "next/server";
import { generarPdfResumen } from "@/lib/pdf/generar";
import { esGestion } from "@/lib/menu";
import { obtenerPropietario } from "@/lib/propietarios";
import { calcularResumenDelPropietario, leerHorizonte } from "@/lib/resumen-deposito";
import { usuarioActual } from "@/lib/usuario-actual";

// Vista previa del resumen de depósito: PDF sin número, que no se guarda ni consume el correlativo.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) return new NextResponse("No autorizado", { status: 403 });
  const { id } = await params;
  const p = await obtenerPropietario(id);
  if (!p) return new NextResponse("No encontrado", { status: 404 });

  const q = new URL(request.url).searchParams;
  const r = await calcularResumenDelPropietario(id, leerHorizonte(q.get("h") ?? undefined, q.get("fecha") ?? undefined, p.horizonteResumenDias));
  if (!r) return new NextResponse("No encontrado", { status: 404 });

  const pdf = await generarPdfResumen(r, null);
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="resumen-de-deposito-vista-previa.pdf"', "Cache-Control": "no-store" },
  });
}

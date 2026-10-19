import { NextResponse } from "next/server";
import { esGestion } from "@/lib/menu";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

// Descarga de un resumen de depósito ya generado: enlace temporal del almacén privado (DOC-03).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; resumenId: string }> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) return new NextResponse("No autorizado", { status: 403 });
  const { id, resumenId } = await params;

  // La base solo devuelve el resumen si el usuario puede verlo (RLS).
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("resumen_deposito").select("numero, pdf_path").eq("id", resumenId).eq("propietario_id", id).maybeSingle();
  if (!data?.pdf_path) return new NextResponse("No encontrado", { status: 404 });

  const { data: firmado } = await supabase.storage.from("informes").createSignedUrl(data.pdf_path as string, 60, { download: `${data.numero as string}.pdf` });
  if (!firmado?.signedUrl) return new NextResponse("No se pudo abrir el archivo", { status: 500 });
  return NextResponse.redirect(firmado.signedUrl);
}

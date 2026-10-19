"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { elegirTelefonoWhatsApp, enlaceWhatsApp, generarUuidV7 } from "@ai/domain";
import { esGestion } from "@/lib/menu";
import { obtenerPropietario } from "@/lib/propietarios";
import { calcularResumenDelPropietario, leerHorizonte, mensajeWhatsApp } from "@/lib/resumen-deposito";
import { crearResumenOficial, resumenOficialVigente } from "@/lib/resumen-oficial";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** LIQ-08: genera el resumen de depósito oficial y vuelve a la pantalla con el aviso de descarga. */
export async function generarResumenOficial(propietarioId: string, h: string, fecha: string, _formulario: FormData): Promise<void> {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles) || !UUID.test(propietarioId)) redirect(`/propietarios/${propietarioId}/resumen-deposito`);
  const volver = (estado: string) => {
    const q = new URLSearchParams();
    if (h) q.set("h", h);
    if (fecha) q.set("fecha", fecha);
    q.set("generado", estado);
    return `/propietarios/${propietarioId}/resumen-deposito?${q.toString()}`;
  };

  const p = await obtenerPropietario(propietarioId);
  if (!p) redirect(volver("error"));
  const r = await calcularResumenDelPropietario(propietarioId, leerHorizonte(h, fecha, p.horizonteResumenDias));
  if (!r) redirect(volver("error"));

  const resultado = await crearResumenOficial(r, usuario.organizacionId);
  if (!resultado.ok) redirect(volver(resultado.motivo));
  revalidatePath(`/propietarios/${propietarioId}/resumen-deposito`);
  redirect(volver(resultado.id));
}

export interface ResultadoWhatsApp {
  error?: string;
  /** Enlace que abre la conversación de WhatsApp con el texto. */
  url?: string;
  /** Descarga del PDF para adjuntarlo en la conversación. */
  pdfUrl?: string;
  numero?: string;
}

/**
 * Envío por WhatsApp desde la web: deja listo el resumen oficial (reutiliza el de hoy si es el mismo), registra el
 * envío con su texto y devuelve el enlace de la conversación y la descarga del PDF. WhatsApp no deja adjuntar un
 * archivo desde un enlace: el PDF se descarga para adjuntarlo a mano (la app móvil lo adjunta sola).
 */
export async function prepararEnvioWhatsApp(propietarioId: string, h: string, fecha: string, texto: string): Promise<ResultadoWhatsApp> {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles) || !UUID.test(propietarioId)) return { error: "resumen.error_enviar" };
  const p = await obtenerPropietario(propietarioId);
  if (!p) return { error: "resumen.error_enviar" };
  const r = await calcularResumenDelPropietario(propietarioId, leerHorizonte(h, fecha, p.horizonteResumenDias));
  if (!r) return { error: "resumen.error_enviar" };

  const telefono = elegirTelefonoWhatsApp(r.telefonos);
  if (!telefono) return { error: "resumen.sin_telefono" };
  const mensaje = texto.trim() || mensajeWhatsApp(r);
  const url = enlaceWhatsApp(telefono.numero, mensaje);
  if (!url) return { error: "resumen.telefono_invalido" };

  const existente = await resumenOficialVigente(r);
  const oficial = existente ? { ok: true as const, ...existente } : await crearResumenOficial(r, usuario.organizacionId);
  if (!oficial.ok) return { error: oficial.motivo === "sin_pdf" ? "resumen.error_pdf" : "resumen.error_enviar" };

  // LIQ-07: cada envío queda registrado con fecha, canal, destinatario, texto y usuario.
  const supabase = await crearClienteServidor();
  const { data: sesion } = await supabase.auth.getUser();
  if (!sesion.user) return { error: "resumen.error_enviar" };
  const { error } = await supabase.from("envio").insert({
    id: generarUuidV7(),
    organizacion_id: usuario.organizacionId,
    documento_tipo: "resumen_deposito",
    documento_id: oficial.id,
    canal: "whatsapp",
    destinatario: telefono.numero,
    idioma: "es",
    texto: mensaje,
    estado: "abierto_whatsapp",
    usuario_id: sesion.user.id,
  });
  if (error) return { error: "resumen.error_registrar_envio" };

  revalidatePath(`/propietarios/${propietarioId}/resumen-deposito`);
  return { url, pdfUrl: `/propietarios/${propietarioId}/resumen-deposito/pdf/${oficial.id}`, numero: oficial.numero };
}

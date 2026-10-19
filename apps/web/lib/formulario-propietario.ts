import { esquemaPropietario, type DatosPropietario } from "@ai/domain";

export interface EstadoFormulario {
  /** Clave de texto de cada campo con error (por nombre de campo). */
  errores?: Record<string, string>;
  /** Error general (no de un campo). */
  error?: string;
  /** PRO-01: hay un propietario con el mismo nombre; se pide confirmación. */
  duplicado?: boolean;
}

const texto = (f: FormData, nombre: string) => String(f.get(nombre) ?? "");

/** Convierte el formulario en datos validados con las reglas del dominio. */
export function leerFormularioPropietario(
  formulario: FormData,
): { ok: true; datos: DatosPropietario } | { ok: false; errores: Record<string, string> } {
  const tipos = formulario.getAll("telefono_tipo").map(String);
  const numeros = formulario.getAll("telefono_numero").map(String);
  const emails = formulario.getAll("email_valor").map(String);
  const principal = texto(formulario, "email_principal");

  // Las filas completamente vacías se ignoran: el formulario siempre muestra al menos una.
  const telefonos = numeros
    .map((numero, i) => ({ tipo: tipos[i] ?? "celular", numero }))
    .filter((t) => t.numero.trim() !== "");
  const listaEmails = emails
    .map((email, i) => ({ email, principal: String(i) === principal, original: i }))
    .filter((e) => e.email.trim() !== "")
    .map(({ email, principal }) => ({ email, principal }));
  // Si el email principal marcado quedó vacío y hay uno solo, ese es el principal.
  if (listaEmails.length === 1 && !listaEmails[0]!.principal) listaEmails[0]!.principal = true;

  const dia = texto(formulario, "diaLiquidacion").trim();
  const horizonte = texto(formulario, "horizonteResumenDias").trim();

  const resultado = esquemaPropietario.safeParse({
    tipoPersona: texto(formulario, "tipoPersona") || undefined,
    nombre: texto(formulario, "nombre"),
    telefonos,
    emails: listaEmails,
    apoderadoNombre: texto(formulario, "apoderadoNombre"),
    apoderadoContacto: texto(formulario, "apoderadoContacto"),
    periodicidadLiquidacion: texto(formulario, "periodicidadLiquidacion") || undefined,
    diaLiquidacion: dia === "" ? null : Number(dia),
    horizonteResumenDias: horizonte === "" ? undefined : Number(horizonte),
    fondoReservaArs: texto(formulario, "fondoReservaArs"),
    fondoReservaUsd: texto(formulario, "fondoReservaUsd"),
    observaciones: texto(formulario, "observaciones"),
  });

  if (resultado.success) return { ok: true, datos: resultado.data };

  const errores: Record<string, string> = {};
  for (const issue of resultado.error.issues) {
    const campo = String(issue.path[0] ?? "general");
    errores[campo] ??= issue.message.startsWith("validacion.") ? issue.message : "propietarios.error_guardar";
  }
  return { ok: false, errores };
}

/** Datos del propietario tal como los guarda la base (jsonb de teléfonos y emails). */
export function aFilaPropietario(d: DatosPropietario) {
  return {
    tipo_persona: d.tipoPersona,
    nombre_razon_social: d.nombre,
    telefonos: d.telefonos,
    emails: d.emails,
    apoderado_nombre: d.apoderadoNombre,
    apoderado_contacto: d.apoderadoContacto,
    periodicidad_liquidacion: d.periodicidadLiquidacion,
    dia_liquidacion: d.diaLiquidacion,
    horizonte_resumen_dias: d.horizonteResumenDias,
    fondo_reserva_ars: d.fondoReservaArs,
    fondo_reserva_usd: d.fondoReservaUsd,
    idioma_informes: d.idiomaInformes,
    observaciones: d.observaciones,
  };
}

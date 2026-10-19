// Validaciones del propietario (sección 1 del diccionario) y de su cuenta bancaria (1.1).
// Los mensajes de error son claves de `packages/i18n/es-AR.json`.
import { z } from "zod";
import { aCentavos } from "./dinero";

export const TIPOS_PERSONA = ["humana", "juridica"] as const;
export const TIPOS_TELEFONO = ["celular", "fijo", "trabajo", "otro"] as const;
export const PERIODICIDADES = ["mensual", "bimestral", "trimestral", "semestral", "anual"] as const;
export const HORIZONTE_POR_DEFECTO = 30;

export type TipoPersona = (typeof TIPOS_PERSONA)[number];
export type TipoTelefono = (typeof TIPOS_TELEFONO)[number];

const texto = z.string().trim();
const textoOpcional = texto.optional().transform((v) => (v ? v : null));

// Importe opcional escrito en formato es-AR ("1.250,50"): vacío = sin fondo de reserva.
const importeOpcional = texto
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const centavos = aCentavos(v);
    if (centavos === null || centavos < 0) {
      ctx.addIssue({ code: "custom", message: "validacion.importe_invalido" });
      return z.NEVER;
    }
    return centavos;
  });

const telefono = z.object({
  tipo: z.enum(TIPOS_TELEFONO),
  numero: texto.regex(/^[0-9+()\s.-]{6,25}$/, { error: "validacion.telefono_invalido" }),
});

const email = z.object({
  email: texto.toLowerCase().pipe(z.email({ error: "validacion.email_invalido" })),
  principal: z.boolean(),
});

export const esquemaPropietario = z
  .object({
    tipoPersona: z.enum(TIPOS_PERSONA).default("humana"),
    nombre: texto.min(1, { error: "validacion.nombre_obligatorio" }),
    telefonos: z.array(telefono).min(1, { error: "validacion.telefono_obligatorio" }),
    emails: z.array(email).min(1, { error: "validacion.email_obligatorio" }),
    apoderadoNombre: textoOpcional,
    apoderadoContacto: textoOpcional,
    periodicidadLiquidacion: z.enum(PERIODICIDADES).default("mensual"),
    diaLiquidacion: z.number().int().min(1).max(31).nullable().default(null),
    horizonteResumenDias: z.number().int().positive({ error: "validacion.horizonte_invalido" }).default(HORIZONTE_POR_DEFECTO),
    fondoReservaArs: importeOpcional,
    fondoReservaUsd: importeOpcional,
    idiomaInformes: z.literal("es").default("es"),
    observaciones: textoOpcional,
  })
  // PRO-04: exactamente un email principal.
  .refine((p) => p.emails.filter((e) => e.principal).length === 1, {
    path: ["emails"],
    error: "validacion.email_principal",
  });

export type DatosPropietario = z.output<typeof esquemaPropietario>;

/** PRO-01: dos nombres son "el mismo" si coinciden sin tildes, mayúsculas ni espacios de más. */
export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function hayNombreDuplicado(nombre: string, existentes: readonly string[]): boolean {
  const buscado = normalizarNombre(nombre);
  return existentes.some((e) => normalizarNombre(e) === buscado);
}

/**
 * CBU/CVU: 22 dígitos con dos dígitos verificadores (entidad y cuenta).
 * Bloque 1: 7 dígitos + verificador (pesos 7-1-3-9-7-1-3). Bloque 2: 13 dígitos + verificador
 * (pesos 3-9-7-1-3-9-7-1-3-9-7-1-3). El verificador es (10 − suma mod 10) mod 10.
 */
export function esCbuValido(valor: string): boolean {
  const cbu = valor.replace(/\s/g, "");
  if (!/^\d{22}$/.test(cbu)) return false;
  const verificador = (digitos: string, pesos: number[]) => {
    const suma = pesos.reduce((acc, peso, i) => acc + peso * Number(digitos[i]), 0);
    return (10 - (suma % 10)) % 10;
  };
  const bloque1 = verificador(cbu.slice(0, 7), [7, 1, 3, 9, 7, 1, 3]) === Number(cbu[7]);
  const bloque2 =
    verificador(cbu.slice(8, 21), [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]) === Number(cbu[21]);
  return bloque1 && bloque2;
}

export const TIPOS_CUENTA = ["caja_ahorro", "cuenta_corriente", "billetera"] as const;

/**
 * Alias de CBU/CVU: de 6 a 20 caracteres entre letras, números, punto y guion.
 * No distingue mayúsculas: se guarda en minúsculas.
 */
export const PATRON_ALIAS = /^[a-z0-9.-]{6,20}$/;

export function esAliasValido(valor: string): boolean {
  return PATRON_ALIAS.test(valor.trim().toLowerCase());
}

const aliasOpcional = texto
  .optional()
  .transform((v) => (v ? v.toLowerCase() : null))
  .refine((v) => v === null || PATRON_ALIAS.test(v), { error: "validacion.alias_invalido" });

const cbuOpcional = texto
  .optional()
  .transform((v) => (v ? v.replace(/\s/g, "") : null))
  .refine((v) => v === null || esCbuValido(v), { error: "validacion.cbu_invalido" });

// La cuenta se identifica por su alias, por su CBU/CVU o por ambos: alcanza con uno.
export const esquemaCuentaBancaria = z
  .object({
    // Nombre del banco o de la billetera: opcional (el tipo de cuenta ya dice cuál es).
    banco: textoOpcional,
    tipoCuenta: z.enum(TIPOS_CUENTA),
    moneda: z.enum(["ARS", "USD"]).default("ARS"),
    cbuCvu: cbuOpcional,
    alias: aliasOpcional,
    titular: texto.min(1, { error: "validacion.nombre_obligatorio" }),
  })
  .refine((c) => c.cbuCvu !== null || c.alias !== null, {
    path: ["alias"],
    error: "validacion.cuenta_cbu_o_alias",
  });

export type DatosCuentaBancaria = z.output<typeof esquemaCuentaBancaria>;

export interface MotivoBaja {
  bienesActivos: number; // sin contar su Gastos varios (PRO-02)
  obligacionesPendientes: number;
  saldoArs: number;
  saldoUsd: number;
}

/** PRO-02: solo se da de baja un propietario sin bienes activos, sin obligaciones pendientes y con saldo cero. */
export function impedimentosDeBaja(m: MotivoBaja): ("bienes" | "obligaciones" | "saldo")[] {
  const motivos: ("bienes" | "obligaciones" | "saldo")[] = [];
  if (m.bienesActivos > 0) motivos.push("bienes");
  if (m.obligacionesPendientes > 0) motivos.push("obligaciones");
  if (m.saldoArs !== 0 || m.saldoUsd !== 0) motivos.push("saldo");
  return motivos;
}

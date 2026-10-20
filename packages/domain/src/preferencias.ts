// Preferencias generales de la administración (P-43). Los mensajes de error son claves de `packages/i18n/src/es-AR.json`.
import { z } from "zod";

/** Máximo de días previos a fin de mes para pedir los montos de los gastos recurrentes (OBL-08). */
export const MAX_DIAS_AVISO_RECURRENTES = 15;
export const DIAS_AVISO_RECURRENTES_POR_DEFECTO = 5;

export const esquemaPreferencias = z.object({
  diasAvisoRecurrentes: z
    .number({ error: "validacion.dias_aviso_invalido" })
    .int({ error: "validacion.dias_aviso_invalido" })
    .min(1, { error: "validacion.dias_aviso_invalido" })
    .max(MAX_DIAS_AVISO_RECURRENTES, { error: "validacion.dias_aviso_invalido" }),
  monedaDefecto: z.enum(["ARS", "USD"], { error: "validacion.dato_obligatorio" }),
});
export type DatosPreferencias = z.output<typeof esquemaPreferencias>;

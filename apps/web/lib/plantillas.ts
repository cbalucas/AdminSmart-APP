import { DOCUMENTOS_PLANTILLA, CANALES_PLANTILLA, type CanalPlantilla, type DocumentoPlantilla } from "@ai/domain";
import { t } from "@ai/i18n";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export interface Plantilla {
  documento: DocumentoPlantilla;
  canal: CanalPlantilla;
  asunto: string;
  cuerpo: string;
  /** El administrador la modificó; si no, es el texto de fábrica. */
  personalizada: boolean;
}

/** Texto de fábrica de una plantilla (06-textos-de-envio), en español. */
export function plantillaDeFabrica(documento: DocumentoPlantilla, canal: CanalPlantilla): { asunto: string; cuerpo: string } {
  return {
    asunto: canal === "email" ? t(`plantilla.${documento}.email.asunto`) : "",
    cuerpo: t(`plantilla.${documento}.${canal}.cuerpo`),
  };
}

// PLA-01: una plantilla por documento, canal e idioma (hoy solo español). Si el administrador no la modificó, rige la de fábrica.
export async function plantillaVigente(documento: DocumentoPlantilla, canal: CanalPlantilla): Promise<Plantilla> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("plantilla_envio")
    .select("asunto, cuerpo")
    .eq("documento", documento)
    .eq("canal", canal)
    .eq("idioma", "es")
    .is("deleted_at", null)
    .maybeSingle();
  if (data) return { documento, canal, asunto: (data.asunto as string | null) ?? "", cuerpo: data.cuerpo as string, personalizada: true };
  return { documento, canal, ...plantillaDeFabrica(documento, canal), personalizada: false };
}

/** Las seis plantillas (3 documentos × 2 canales), con su estado. */
export async function listarPlantillas(): Promise<Plantilla[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("plantilla_envio").select("documento, canal, asunto, cuerpo").eq("idioma", "es").is("deleted_at", null);
  const guardadas = new Map((data ?? []).map((p) => [`${p.documento as string}/${p.canal as string}`, p]));
  const lista: Plantilla[] = [];
  for (const documento of DOCUMENTOS_PLANTILLA) {
    for (const canal of CANALES_PLANTILLA) {
      const g = guardadas.get(`${documento}/${canal}`);
      lista.push(
        g
          ? { documento, canal, asunto: (g.asunto as string | null) ?? "", cuerpo: g.cuerpo as string, personalizada: true }
          : { documento, canal, ...plantillaDeFabrica(documento, canal), personalizada: false },
      );
    }
  }
  return lista;
}

/** Datos de ejemplo para la vista previa de una plantilla. */
export function datosDeEjemplo(documento: DocumentoPlantilla, administracion: string): Record<string, string> {
  return {
    nombre: t("plantillas.ejemplo_nombre"),
    administracion: administracion || t("plantillas.ejemplo_administracion"),
    numero: t(`plantillas.ejemplo_numero_${documento}`),
    periodo: t("plantillas.ejemplo_periodo"),
    bien: t("plantillas.ejemplo_bien"),
    monto: t("plantillas.ejemplo_monto"),
    fecha_limite: t("plantillas.ejemplo_fecha_limite"),
    resultado: t("plantillas.ejemplo_resultado"),
    datos_deposito: t("plantillas.ejemplo_datos_deposito"),
  };
}

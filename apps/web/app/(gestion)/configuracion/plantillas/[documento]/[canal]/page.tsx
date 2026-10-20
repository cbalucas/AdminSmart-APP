import Link from "next/link";
import { notFound } from "next/navigation";
import { CANALES_PLANTILLA, DOCUMENTOS_PLANTILLA, type CanalPlantilla, type DocumentoPlantilla } from "@ai/domain";
import { t } from "@ai/i18n";
import { EditorPlantilla } from "@/components/EditorPlantilla";
import { obtenerAdministracion } from "@/lib/administracion";
import { datosDeEjemplo, plantillaDeFabrica, plantillaVigente } from "@/lib/plantillas";
import { usuarioActual } from "@/lib/usuario-actual";

// P-49 Edición de una plantilla de envío (solo administrador).
export default async function EditarPlantilla({ params }: { params: Promise<{ documento: string; canal: string }> }) {
  const { usuario } = await usuarioActual();
  if (!usuario?.roles.includes("administrador")) notFound();
  const { documento, canal } = await params;
  if (!(DOCUMENTOS_PLANTILLA as readonly string[]).includes(documento) || !(CANALES_PLANTILLA as readonly string[]).includes(canal)) notFound();
  const doc = documento as DocumentoPlantilla;
  const can = canal as CanalPlantilla;

  const [plantilla, admin] = await Promise.all([plantillaVigente(doc, can), obtenerAdministracion()]);

  return (
    <>
      <p className="migas">
        <Link href="/configuracion">{t("configuracion.titulo")}</Link> / <Link href="/configuracion/plantillas">{t("plantillas.titulo")}</Link>
      </p>
      <div className="encabezado">
        <h1>{t("plantillas.editar_titulo", { documento: t(`plantillas.documento_${doc}`), canal: t(`plantillas.canal_${can}`) })}</h1>
      </div>
      <EditorPlantilla
        documento={doc}
        canal={can}
        asuntoInicial={plantilla.asunto}
        cuerpoInicial={plantilla.cuerpo}
        original={plantillaDeFabrica(doc, can)}
        personalizada={plantilla.personalizada}
        ejemplo={datosDeEjemplo(doc, admin?.nombre ?? "")}
      />
    </>
  );
}

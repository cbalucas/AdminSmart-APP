import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { TituloConIcono } from "@/components/ElementosFormulario";
import { FormularioServicio, SERVICIO_NUEVO } from "@/components/FormularioServicio";
import { obtenerBien } from "@/lib/bienes";
import { esGestion } from "@/lib/menu";
import { empresasCargadas, listarConceptos } from "@/lib/servicios";
import { usuarioActual } from "@/lib/usuario-actual";
import { crearServicio } from "../acciones";

// P-19 Alta de servicio o impuesto del bien.
export default async function NuevoServicio({ params }: { params: Promise<{ id: string }> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const { id } = await params;
  const bien = await obtenerBien(id);
  if (!bien) notFound();

  const [conceptos, empresas] = await Promise.all([listarConceptos(), empresasCargadas()]);
  const activos = conceptos.filter((c) => c.estado === "activo");

  return (
    <>
      <p className="migas">{bien.esGastosVarios ? t("bienes.gastos_varios") : bien.alias}</p>
      <TituloConIcono icono="obligaciones">{t("servicios.alta_titulo")}</TituloConIcono>
      {activos.length === 0 ? (
        <p className="aviso-advertencia">{t("servicios.sin_conceptos")}</p>
      ) : (
        <FormularioServicio
          accion={crearServicio.bind(null, bien.id)}
          valores={SERVICIO_NUEVO}
          conceptos={activos}
          empresas={empresas}
          cancelarHref={`/bienes/${bien.id}?tab=servicios`}
        />
      )}
    </>
  );
}

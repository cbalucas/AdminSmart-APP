import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { TituloConIcono } from "@/components/ElementosFormulario";
import { FormularioServicio } from "@/components/FormularioServicio";
import { obtenerBien } from "@/lib/bienes";
import { esGestion } from "@/lib/menu";
import { empresasCargadas, listarConceptos, serviciosDelBien } from "@/lib/servicios";
import { usuarioActual } from "@/lib/usuario-actual";
import { actualizarServicio } from "../../acciones";

// Importe en centavos a texto es-AR editable: 2622650 → "26226,50" (sin separador de miles).
const aTextoEditable = (centavos: number | null) =>
  centavos === null ? "" : (centavos / 100).toFixed(2).replace(".", ",").replace(/,00$/, "");

// P-19 Edición de servicio o impuesto del bien.
export default async function EditarServicio({ params }: { params: Promise<{ id: string; servicioId: string }> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const { id, servicioId } = await params;
  const bien = await obtenerBien(id);
  if (!bien) notFound();
  const servicio = (await serviciosDelBien(bien.id)).find((s) => s.id === servicioId);
  if (!servicio) notFound();

  const [conceptos, empresas] = await Promise.all([listarConceptos(), empresasCargadas()]);
  // Se ofrecen los conceptos activos y el del propio servicio, aunque ya esté inactivo.
  const opciones = conceptos.filter((c) => c.estado === "activo" || c.id === servicio.conceptoId);

  return (
    <>
      <p className="migas">{bien.esGastosVarios ? t("bienes.gastos_varios") : bien.alias}</p>
      <TituloConIcono icono="editar">{t("servicios.edicion_titulo")}</TituloConIcono>
      <FormularioServicio
        editando
        accion={actualizarServicio.bind(null, bien.id, servicio.id)}
        conceptos={opciones}
        empresas={empresas}
        cancelarHref={`/bienes/${bien.id}?tab=servicios`}
        valores={{
          conceptoId: servicio.conceptoId,
          nroCuentaCliente: servicio.nroCuentaCliente,
          empresaPrestadora: servicio.empresaPrestadora,
          responsableDefault: servicio.responsableDefault,
          estado: servicio.estado,
          titularServicio: servicio.titularServicio ?? "",
          periodicidad: servicio.periodicidad ?? "",
          diaVencimiento: servicio.diaVencimiento === null ? "" : String(servicio.diaVencimiento),
          montoEstimado: aTextoEditable(servicio.montoEstimado),
          montoEstimadoMoneda: servicio.montoEstimadoMoneda ?? "ARS",
          debitoAutomatico: servicio.debitoAutomatico,
          sitioBoletas: servicio.sitioBoletas ?? "",
          observaciones: servicio.observaciones ?? "",
        }}
      />
    </>
  );
}

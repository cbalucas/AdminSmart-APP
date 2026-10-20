import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { TituloConIcono } from "@/components/ElementosFormulario";
import { FormularioPropietario } from "@/components/FormularioPropietario";
import { esGestion } from "@/lib/menu";
import { obtenerPropietario } from "@/lib/propietarios";
import { usuarioActual } from "@/lib/usuario-actual";
import { actualizarPropietario } from "../../acciones";

// Importe en centavos a texto es-AR editable: 5000050 → "50000,50" (sin separador de miles).
const aTextoEditable = (centavos: number | null) =>
  centavos === null ? "" : (centavos / 100).toFixed(2).replace(".", ",").replace(/,00$/, "");

// P-13 Edición de propietario.
export default async function EditarPropietario({ params }: { params: Promise<{ id: string }> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const { id } = await params;
  const p = await obtenerPropietario(id);
  if (!p) notFound();

  return (
    <>
      <TituloConIcono icono="editar">{t("propietarios.edicion_titulo")}</TituloConIcono>
      <FormularioPropietario
        accion={actualizarPropietario.bind(null, p.id)}
        cancelarHref={`/propietarios/${p.id}`}
        valores={{
          tipoPersona: p.tipoPersona,
          nombre: p.nombre,
          telefonos: p.telefonos.length ? p.telefonos : [{ tipo: "celular", numero: "" }],
          emails: p.emails.length ? p.emails : [{ email: "", principal: true }],
          apoderadoNombre: p.apoderadoNombre ?? "",
          apoderadoContacto: p.apoderadoContacto ?? "",
          periodicidadLiquidacion: p.periodicidadLiquidacion,
          diaLiquidacion: p.diaLiquidacion === null ? "" : String(p.diaLiquidacion),
          horizonteResumenDias: String(p.horizonteResumenDias),
          fondoReservaArs: aTextoEditable(p.fondoReservaArs),
          fondoReservaUsd: aTextoEditable(p.fondoReservaUsd),
          observaciones: p.observaciones ?? "",
        }}
      />
    </>
  );
}

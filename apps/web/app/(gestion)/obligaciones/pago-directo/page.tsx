import { notFound } from "next/navigation";
import { generarUuidV7 } from "@ai/domain";
import { t } from "@ai/i18n";
import { TituloConIcono } from "@/components/ElementosFormulario";
import { FormularioPago } from "@/components/FormularioPago";
import { obtenerAdministracion } from "@/lib/administracion";
import { esGestion } from "@/lib/menu";
import { fechaHoy } from "@/lib/obligaciones";
import { opcionesObligacion } from "@/lib/opciones-obligacion";
import { usuarioActual } from "@/lib/usuario-actual";
import { registrarPagoDirecto } from "../pagos";

// P-28 Pago directo de un gasto sin obligación previa (PAG-02).
export default async function PagoDirecto() {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const [o, admin] = await Promise.all([opcionesObligacion(), obtenerAdministracion()]);
  const pagoId = generarUuidV7();
  return (
    <>
      <TituloConIcono icono="dinero">{t("pagos.titulo_directo")}</TituloConIcono>
      <FormularioPago
        accion={registrarPagoDirecto.bind(null, pagoId)}
        hoy={fechaHoy()}
        pagoId={pagoId}
        organizacionId={usuario.organizacionId}
        cancelarHref="/obligaciones"
        directo={{ bienes: o.bienes, conceptos: o.conceptos }}
        monedaDefecto={admin?.monedaDefecto ?? "ARS"}
      />
    </>
  );
}

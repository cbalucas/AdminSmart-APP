import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { FormularioObligacion } from "@/components/FormularioObligacion";
import { esGestion } from "@/lib/menu";
import { fechaHoy } from "@/lib/obligaciones";
import { opcionesObligacion } from "@/lib/opciones-obligacion";
import { usuarioActual } from "@/lib/usuario-actual";
import { crearObligacion } from "../acciones";

// P-27 Alta de obligación.
export default async function NuevaObligacion({ searchParams }: { searchParams: Promise<{ bien?: string }> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const { bien } = await searchParams;
  const o = await opcionesObligacion();
  const otro = o.conceptos.find((c) => c.nombre.trim().toLowerCase() === "otro");

  return (
    <>
      <div className="encabezado">
        <h1>{t("obligaciones.alta_titulo")}</h1>
      </div>
      <FormularioObligacion
        accion={crearObligacion}
        bienes={o.bienes}
        servicios={o.servicios}
        conceptos={o.conceptos}
        cancelarHref="/obligaciones"
        valores={{
          bienId: o.bienes.some((b) => b.id === bien) ? (bien as string) : "",
          bienServicioId: "",
          conceptoId: otro?.id ?? "",
          periodo: fechaHoy().slice(0, 7),
          esRecurrente: false,
          frecuencia: "",
          monto: "",
          moneda: "ARS",
          responsable: "propietario",
          vencimiento: "",
          descripcion: "",
          codigoPago: "",
          observaciones: "",
        }}
      />
    </>
  );
}

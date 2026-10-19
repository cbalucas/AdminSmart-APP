import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { formatearPeriodo, puedeModificarObligacion } from "@ai/domain";
import { FormularioObligacion } from "@/components/FormularioObligacion";
import { documentosDe } from "@/lib/documentos";
import { esGestion } from "@/lib/menu";
import { listarObligaciones } from "@/lib/obligaciones";
import { opcionesObligacion } from "@/lib/opciones-obligacion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";
import { actualizarObligacion } from "../../acciones";

// Importe en centavos a texto es-AR editable: 2622650 → "26226,50".
const aTextoEditable = (centavos: number | null) =>
  centavos === null ? "" : (centavos / 100).toFixed(2).replace(".", ",").replace(/,00$/, "");

// P-27 Edición de obligación.
export default async function EditarObligacion({ params }: { params: Promise<{ id: string }> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await crearClienteServidor();
  const [{ data: o }, fila, opciones] = await Promise.all([
    supabase.from("obligacion").select("*").eq("id", id).is("deleted_at", null).maybeSingle(),
    listarObligaciones().then((l) => l.find((x) => x.id === id)),
    opcionesObligacion(),
  ]);
  if (!o || !fila) notFound();
  const boletas = (await documentosDe("obligacion", [id], "boleta")).get(id) ?? [];

  // OBL-06: una obligación pagada o anulada no se modifica.
  if (!puedeModificarObligacion({ pagada: fila.estado === "pagada", anulada: fila.estado === "anulada" })) {
    return (
      <>
        <div className="encabezado">
          <h1>{t("obligaciones.edicion_titulo")}</h1>
        </div>
        <p className="aviso-advertencia">{t("obligaciones.error_no_modificable")}</p>
        <Link href="/obligaciones" className="boton boton-secundario">{t("app.volver")}</Link>
      </>
    );
  }

  return (
    <>
      <div className="encabezado">
        <h1>{t("obligaciones.edicion_titulo")}</h1>
      </div>
      <FormularioObligacion
        accion={actualizarObligacion.bind(null, id)}
        bienes={opciones.bienes}
        servicios={opciones.servicios}
        conceptos={opciones.conceptosTodos}
        cancelarHref="/obligaciones"
        adjuntos={{ organizacionId: usuario.organizacionId, obligacionId: id, existentes: boletas }}
        fijos={{
          bien: opciones.bienes.find((b) => b.id === fila.bienId)?.nombre ?? "—",
          concepto: fila.concepto,
          periodo: formatearPeriodo(fila.periodo),
        }}
        valores={{
          bienId: fila.bienId,
          bienServicioId: fila.bienServicioId ?? "",
          conceptoId: fila.conceptoId,
          periodo: fila.periodo.slice(0, 7),
          esRecurrente: fila.esRecurrente,
          frecuencia: fila.frecuencia ?? "",
          monto: aTextoEditable(fila.monto),
          moneda: fila.moneda,
          responsable: fila.responsable,
          vencimiento: fila.vencimiento ?? "",
          descripcion: fila.descripcion ?? "",
          codigoPago: (o.codigo_pago as string | null) ?? "",
          observaciones: (o.observaciones as string | null) ?? "",
        }}
      />
    </>
  );
}

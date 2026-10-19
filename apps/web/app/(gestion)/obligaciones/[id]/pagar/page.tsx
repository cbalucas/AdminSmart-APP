import Link from "next/link";
import { notFound } from "next/navigation";
import { formatearPeriodo, generarUuidV7 } from "@ai/domain";
import { t } from "@ai/i18n";
import { FormularioPago } from "@/components/FormularioPago";
import { esGestion } from "@/lib/menu";
import { fechaHoy, listarObligaciones } from "@/lib/obligaciones";
import { opcionesObligacion } from "@/lib/opciones-obligacion";
import { usuarioActual } from "@/lib/usuario-actual";
import { registrarPago } from "../../pagos";

// P-28 Registrar el pago de una obligación.
export default async function PagarObligacion({ params }: { params: Promise<{ id: string }> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [lista, opciones] = await Promise.all([listarObligaciones(), opcionesObligacion()]);
  const o = lista.find((x) => x.id === id);
  if (!o) notFound();

  if (o.estado === "pagada" || o.estado === "anulada") {
    return (
      <>
        <div className="encabezado"><h1>{t("pagos.titulo")}</h1></div>
        <p className="aviso-advertencia">{t("pagos.ya_pagada")}</p>
        <Link href="/obligaciones" className="boton boton-secundario">{t("app.volver")}</Link>
      </>
    );
  }

  // El id del pago se genera acá para poder subir el comprobante antes de guardar (UUID v7 en el cliente).
  const pagoId = generarUuidV7();
  return (
    <>
      <div className="encabezado"><h1>{t("pagos.titulo")}</h1></div>
      <FormularioPago
        accion={registrarPago.bind(null, id, pagoId)}
        hoy={fechaHoy()}
        pagoId={pagoId}
        organizacionId={usuario.organizacionId}
        cancelarHref="/obligaciones"
        obligacion={{
          concepto: o.descripcion ? `${o.concepto} · ${o.descripcion}` : o.concepto,
          periodo: formatearPeriodo(o.periodo),
          bien: opciones.bienes.find((b) => b.id === o.bienId)?.nombre ?? "—",
          monto: o.monto,
          moneda: o.moneda,
          responsable: o.responsable,
          estado: o.estado,
        }}
      />
    </>
  );
}

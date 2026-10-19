import Link from "next/link";
import { notFound } from "next/navigation";
import { formatearImporte, formatearPeriodo } from "@ai/domain";
import { t } from "@ai/i18n";
import { FormularioAnulacion } from "@/components/FormularioAnulacion";
import { esGestion } from "@/lib/menu";
import { listarObligaciones } from "@/lib/obligaciones";
import { pagosVigentesDe } from "@/lib/pagos";
import { usuarioActual } from "@/lib/usuario-actual";
import { anularPago } from "../../pagos";

// P-28 Anular el pago de una obligación (solo administrador).
export default async function AnularPago({ params }: { params: Promise<{ id: string }> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const o = (await listarObligaciones()).find((x) => x.id === id);
  const pago = o ? (await pagosVigentesDe([id])).get(id) : undefined;
  if (!o || !pago) notFound();

  if (!usuario.roles.includes("administrador")) {
    return (
      <>
        <div className="encabezado"><h1>{t("pagos.titulo_anular")}</h1></div>
        <p className="aviso-advertencia">{t("pagos.solo_administrador")}</p>
        <Link href="/obligaciones" className="boton boton-secundario">{t("app.volver")}</Link>
      </>
    );
  }

  return (
    <>
      <div className="encabezado"><h1>{t("pagos.titulo_anular")}</h1></div>
      <FormularioAnulacion
        accion={anularPago.bind(null, pago.id)}
        resumen={`${o.concepto} · ${formatearPeriodo(o.periodo)} · ${formatearImporte(pago.importe, o.moneda)}`}
      />
    </>
  );
}

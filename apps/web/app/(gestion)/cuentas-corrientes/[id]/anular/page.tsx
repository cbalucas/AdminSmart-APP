import { notFound } from "next/navigation";
import { formatearImporte, type Moneda } from "@ai/domain";
import { t } from "@ai/i18n";
import { FormularioAnularMovimiento } from "@/components/FormularioAnularMovimiento";
import { libroDelPropietario } from "@/lib/cuentas-corrientes";
import { esGestion } from "@/lib/menu";
import { usuarioActual } from "@/lib/usuario-actual";
import { anularMovimiento } from "../../acciones";

// Anular un movimiento manual (solo administrador).
export default async function AnularMovimiento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ propietario?: string; moneda?: string }>;
}) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles) || !usuario.roles.includes("administrador")) notFound();
  const { id } = await params;
  const f = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !f.propietario) notFound();
  const moneda: Moneda = f.moneda === "USD" ? "USD" : "ARS";
  const { filas } = await libroDelPropietario({ propietarioId: f.propietario, moneda });
  const m = filas.find((x) => x.id === id);
  if (!m || !m.anulable) notFound();
  const importe = m.debe > 0 ? m.debe : m.haber;
  return (
    <>
      <div className="encabezado"><h1>{t("cuentas.titulo_anular")}</h1></div>
      <FormularioAnularMovimiento
        accion={anularMovimiento.bind(null, id, f.propietario, moneda)}
        resumen={`${t(`cuentas.tipo_${m.tipo}`)} · ${m.descripcion} · ${formatearImporte(importe, moneda)}`}
        esTraspaso={m.traspasoId !== null}
        cancelarHref={`/cuentas-corrientes?propietario=${f.propietario}&moneda=${moneda}`}
      />
    </>
  );
}

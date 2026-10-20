import { notFound } from "next/navigation";
import { generarUuidV7, type Moneda } from "@ai/domain";
import { t } from "@ai/i18n";
import { TituloConIcono } from "@/components/ElementosFormulario";
import { FormularioMovimiento } from "@/components/FormularioMovimiento";
import { bienesDelPropietario, propietariosParaCuenta } from "@/lib/cuentas-corrientes";
import { esGestion } from "@/lib/menu";
import { fechaHoy } from "@/lib/obligaciones";
import { usuarioActual } from "@/lib/usuario-actual";
import { crearMovimientoManual } from "../acciones";

// P-33 Movimiento manual (solo administrador).
export default async function NuevoMovimiento({ searchParams }: { searchParams: Promise<{ propietario?: string; moneda?: string }> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles) || !usuario.roles.includes("administrador")) notFound();
  const f = await searchParams;
  const propietario = (await propietariosParaCuenta()).find((p) => p.id === f.propietario);
  if (!propietario) notFound();
  const moneda: Moneda = f.moneda === "USD" ? "USD" : "ARS";
  const movimientoId = generarUuidV7();
  return (
    <>
      <TituloConIcono icono="cuentas">{t("cuentas.nuevo_movimiento")}</TituloConIcono>
      <FormularioMovimiento
        accion={crearMovimientoManual.bind(null, movimientoId)}
        movimientoId={movimientoId}
        organizacionId={usuario.organizacionId}
        propietario={propietario}
        bienes={await bienesDelPropietario(propietario.id)}
        moneda={moneda}
        hoy={fechaHoy()}
        cancelarHref={`/cuentas-corrientes?propietario=${propietario.id}&moneda=${moneda}`}
      />
    </>
  );
}

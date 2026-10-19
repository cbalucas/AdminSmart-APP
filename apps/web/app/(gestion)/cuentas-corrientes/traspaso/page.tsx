import { notFound } from "next/navigation";
import type { Moneda } from "@ai/domain";
import { t } from "@ai/i18n";
import { FormularioTraspaso } from "@/components/FormularioMovimiento";
import { bienesDelPropietario, propietariosParaCuenta } from "@/lib/cuentas-corrientes";
import { esGestion } from "@/lib/menu";
import { fechaHoy } from "@/lib/obligaciones";
import { usuarioActual } from "@/lib/usuario-actual";
import { registrarTraspaso } from "../acciones";

// MOV-04 Traspaso entre pesos y dólares (solo administrador).
export default async function NuevoTraspaso({ searchParams }: { searchParams: Promise<{ propietario?: string; moneda?: string }> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles) || !usuario.roles.includes("administrador")) notFound();
  const f = await searchParams;
  const propietario = (await propietariosParaCuenta()).find((p) => p.id === f.propietario);
  if (!propietario) notFound();
  const moneda: Moneda = f.moneda === "USD" ? "USD" : "ARS";
  return (
    <>
      <div className="encabezado"><h1>{t("cuentas.traspaso")}</h1></div>
      <FormularioTraspaso
        accion={registrarTraspaso}
        propietario={propietario}
        bienes={await bienesDelPropietario(propietario.id)}
        monedaInicial={moneda}
        hoy={fechaHoy()}
        cancelarHref={`/cuentas-corrientes?propietario=${propietario.id}&moneda=${moneda}`}
      />
    </>
  );
}

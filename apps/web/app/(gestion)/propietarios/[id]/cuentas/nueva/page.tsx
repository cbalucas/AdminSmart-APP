import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { CUENTA_NUEVA, FormularioCuenta } from "@/components/FormularioCuenta";
import { obtenerPropietario } from "@/lib/propietarios";
import { usuarioActual } from "@/lib/usuario-actual";
import { crearCuenta } from "../acciones";

// P-14 Alta de cuenta bancaria del propietario (solo administrador).
export default async function NuevaCuenta({ params }: { params: Promise<{ id: string }> }) {
  const { usuario } = await usuarioActual();
  if (!usuario?.roles.includes("administrador")) notFound();
  const { id } = await params;
  const p = await obtenerPropietario(id);
  if (!p) notFound();

  return (
    <>
      <p className="migas">{p.nombre}</p>
      <div className="encabezado">
        <h1>{t("cuentas.alta_titulo")}</h1>
      </div>
      <FormularioCuenta
        accion={crearCuenta.bind(null, p.id)}
        valores={{ ...CUENTA_NUEVA, titular: p.nombre }}
        cancelarHref={`/propietarios/${p.id}`}
      />
    </>
  );
}

import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { FormularioCuenta } from "@/components/FormularioCuenta";
import { obtenerCuentas } from "@/lib/cuentas";
import { obtenerPropietario } from "@/lib/propietarios";
import { usuarioActual } from "@/lib/usuario-actual";
import { actualizarCuenta } from "../../acciones";

// P-14 Edición de cuenta bancaria (solo administrador).
export default async function EditarCuenta({ params }: { params: Promise<{ id: string; cuentaId: string }> }) {
  const { usuario } = await usuarioActual();
  if (!usuario?.roles.includes("administrador")) notFound();
  const { id, cuentaId } = await params;
  const p = await obtenerPropietario(id);
  if (!p) notFound();
  const cuenta = (await obtenerCuentas(id)).cuentas.find((c) => c.cuentaId === cuentaId);
  if (!cuenta) notFound();

  return (
    <>
      <p className="migas">{p.nombre}</p>
      <div className="encabezado">
        <h1>{t("cuentas.edicion_titulo")}</h1>
      </div>
      {cuenta.compartidaCon.length > 0 && (
        <p className="aviso-advertencia">{t("cuentas.edicion_compartida", { nombres: cuenta.compartidaCon.join(", ") })}</p>
      )}
      <FormularioCuenta
        editando
        accion={actualizarCuenta.bind(null, p.id, cuenta.cuentaId)}
        valores={{
          banco: cuenta.banco ?? "",
          tipoCuenta: cuenta.tipoCuenta,
          moneda: cuenta.moneda,
          cbuCvu: cuenta.cbuCvu ?? "",
          alias: cuenta.alias ?? "",
          titular: cuenta.titular,
        }}
        cancelarHref={`/propietarios/${p.id}`}
      />
    </>
  );
}

import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { TituloConIcono } from "@/components/ElementosFormulario";
import { formatearDireccion, type TipoBien } from "@ai/domain";
import { FormularioBien } from "@/components/FormularioBien";
import { listarEdificios, obtenerBien } from "@/lib/bienes";
import { esGestion } from "@/lib/menu";
import { usuarioActual } from "@/lib/usuario-actual";
import { actualizarBien } from "../../acciones";

// P-17 Edición de bien. El bien Gastos varios no se edita: lo gestiona el sistema.
export default async function EditarBien({ params }: { params: Promise<{ id: string }> }) {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();
  const { id } = await params;
  const bien = await obtenerBien(id);
  if (!bien || bien.esGastosVarios) notFound();

  const edificios = await listarEdificios();
  const edificioActual = edificios.find((e) => e.id === bien.edificioId);

  return (
    <>
      <TituloConIcono icono="editar">{t("bienes.edicion_titulo")}</TituloConIcono>
      <FormularioBien
        editando
        accion={actualizarBien.bind(null, bien.id)}
        cancelarHref={`/bienes/${bien.id}`}
        edificios={edificios.map((e) => ({ id: e.id, nombre: e.nombre, direccion: formatearDireccion(e) }))}
        valores={{
          tipoBien: bien.tipoBien as TipoBien,
          subtipo: bien.subtipo ?? "",
          alias: bien.alias,
          calle: bien.calle ?? "",
          numero: bien.numero ?? "",
          piso: bien.piso ?? "",
          departamento: bien.departamento ?? "",
          localidad: bien.localidad ?? "",
          provincia: bien.provincia ?? "",
          codigoPostal: bien.codigoPostal ?? "",
          latitud: bien.latitud === null ? "" : String(bien.latitud),
          longitud: bien.longitud === null ? "" : String(bien.longitud),
          dominio: bien.dominio ?? "",
          marcaModelo: bien.marcaModelo ?? "",
          anio: bien.anio === null ? "" : String(bien.anio),
          estado: bien.estado,
          edificioNombre: edificioActual?.nombre ?? "",
          unidadFuncional: bien.unidadFuncional ?? "",
          observaciones: bien.observaciones ?? "",
        }}
      />
    </>
  );
}

import { cache } from "react";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type Rol = "administrador" | "operador" | "propietario" | "inquilino";

// Quién ingresó. Se consulta una sola vez por petición, aunque lo pidan el diseño y la página.
// La base solo devuelve la fila propia (RLS); si no hay fila, la cuenta no tiene acceso.
export const usuarioActual = cache(async () => {
  const supabase = await crearClienteServidor();
  const { data: sesion } = await supabase.auth.getUser();
  if (!sesion.user) redirect("/ingreso");

  const { data: usuario } = await supabase
    .from("usuario")
    .select("nombre, roles, estado, organizacion_id, propietario_id")
    .eq("id", sesion.user.id)
    .maybeSingle();

  return {
    email: sesion.user.email ?? "",
    proveedores: (sesion.user.app_metadata?.providers as string[] | undefined) ?? [],
    usuario: usuario
      ? {
          nombre: usuario.nombre as string,
          roles: usuario.roles as Rol[],
          estado: usuario.estado as string,
          organizacionId: usuario.organizacion_id as string,
          /** USU-03: la ficha de propietario a la que está vinculado (rol Propietario). */
          propietarioId: (usuario.propietario_id as string | null) ?? null,
        }
      : null,
  };
});

import { cache } from "react";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type Rol = "administrador" | "operador" | "propietario" | "inquilino";

// Quién ingresó. Se consulta una sola vez por petición, aunque lo pidan el diseño y la página.
// La base solo devuelve la fila propia (RLS); si no hay fila, la cuenta no tiene acceso.
export const usuarioActual = cache(async () => {
  const supabase = await crearClienteServidor();
  // `getClaims` verifica la firma del token con la clave pública (sin consultar a Supabase por la red); el proxy
  // ya renovó la sesión si hacía falta. `getUser` agregaba una consulta de unos 300 ms a cada pantalla.
  const { data: sesion } = await supabase.auth.getClaims();
  const claims = sesion?.claims;
  if (!claims?.sub) redirect("/ingreso");

  const { data: usuario } = await supabase
    .from("usuario")
    .select("nombre, roles, estado, organizacion_id, propietario_id")
    .eq("id", claims.sub)
    .maybeSingle();

  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? "",
    proveedores: (claims.app_metadata?.providers as string[] | undefined) ?? [],
    usuario: usuario
      ? {
          id: claims.sub,
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

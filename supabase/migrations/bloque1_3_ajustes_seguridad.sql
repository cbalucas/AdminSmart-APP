-- Bloque 1 · Ajustes de seguridad señalados por el verificador de Supabase.
-- Se ejecuta DESPUÉS de bloque1_2_restricciones.sql.

-- 1) La extensión btree_gist no debe estar en el esquema público.
create schema if not exists extensions;
alter extension btree_gist set schema extensions;

-- 2) La función de los triggers fija su ruta de búsqueda, para que nadie pueda
--    desviarla creando objetos con el mismo nombre en otro esquema.
create or replace function public.actualizar_fila_modificada() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  new.version := old.version + 1;
  return new;
end;
$$;

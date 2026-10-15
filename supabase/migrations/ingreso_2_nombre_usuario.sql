-- Ingreso · Nombre de usuario: alternativa al email para ingresar (opcional, único, en minúsculas).
-- Se ejecuta DESPUÉS de ingreso_1_configuracion_inicial.sql.
-- Lo define el administrador; el resto de los usuarios no lo pueden cambiar.

ALTER TABLE "usuario" ADD COLUMN "nombre_usuario" text;
CREATE UNIQUE INDEX "usuario_nombre_usuario_uq" ON "usuario" USING btree ("nombre_usuario") WHERE "usuario"."deleted_at" is null and "usuario"."nombre_usuario" is not null;
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_nombre_usuario_ck" CHECK ("usuario"."nombre_usuario" is null or "usuario"."nombre_usuario" ~ '^[a-z0-9._-]{3,30}$');
-- Se amplía la protección de `usuario` (bloque3_4): solo el administrador modifica el nombre de
-- usuario, igual que los roles, el estado, el email y los vínculos. Reemplaza la función anterior.
create or replace function app.controlar_usuario() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and not app.es_admin() then
    if new.roles is distinct from old.roles or new.estado is distinct from old.estado
       or new.propietario_id is distinct from old.propietario_id
       or new.organizacion_id is distinct from old.organizacion_id
       or lower(new.email) is distinct from lower(old.email)
       or new.nombre_usuario is distinct from old.nombre_usuario
       or new.deleted_at is distinct from old.deleted_at then
      raise exception 'Solo el administrador modifica roles, estado, email, nombre de usuario y vínculos de un usuario.' using errcode = 'P0001';
    end if;
  end if;

  if 'administrador' = any (old.roles) and old.estado = 'activo' and old.deleted_at is null
     and not ('administrador' = any (new.roles) and new.estado = 'activo' and new.deleted_at is null)
     and not exists (
       select 1 from public.usuario u
       where u.organizacion_id = old.organizacion_id and u.id <> old.id and u.estado = 'activo'
         and u.deleted_at is null and 'administrador' = any (u.roles)
     ) then
    raise exception 'USU-02: debe existir siempre al menos un administrador activo.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

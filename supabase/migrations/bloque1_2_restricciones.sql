-- Bloque 1 · Restricciones y automatismos que Drizzle no expresa.
-- Se ejecuta DESPUÉS de bloque1_1_base.sql.

-- PRO-08: los acuerdos de honorarios de un propietario no se superponen en el tiempo.
create extension if not exists btree_gist;

alter table acuerdo_honorarios
  add constraint acuerdo_honorarios_sin_superposicion
  exclude using gist (
    propietario_id with =,
    daterange(vigente_desde, vigente_hasta, '[]') with &&
  ) where (deleted_at is null);

-- Todas las tablas: al modificar una fila se actualiza `updated_at` y se suma 1 a `version`
-- (sección 5.1: `version` resuelve los conflictos de sincronización).
create or replace function actualizar_fila_modificada() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end;
$$;

do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'organizacion', 'propietario', 'usuario', 'cuenta_bancaria', 'propietario_cuenta',
    'acuerdo_honorarios', 'edificio', 'bien', 'usuario_bien', 'bien_propietario',
    'concepto', 'bien_servicio', 'reparto_concepto', 'reparto_concepto_porcentaje'
  ] loop
    execute format(
      'create trigger %I before update on %I for each row execute function actualizar_fila_modificada()',
      tabla || '_modificada', tabla
    );
  end loop;
end;
$$;

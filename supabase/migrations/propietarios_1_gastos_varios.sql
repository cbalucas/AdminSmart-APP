-- Paso 3 · Propietarios.
-- 1) UUID v7 generado en el servidor, para los registros que crea el sistema (los del cliente usan el mismo formato).
-- 2) PROP-06: al crear un propietario, el sistema crea su bien "Gastos varios" (tipo Otros) y lo vincula al 100 %.

create or replace function app.uuid_v7() returns uuid
language sql volatile set search_path = ''
as $$
  select encode(
    set_bit(
      set_bit(
        overlay(uuid_send(gen_random_uuid())
                placing substring(int8send((extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
                from 1 for 6),
        52, 1),
      53, 1),
    'hex')::uuid;
$$;

create or replace function app.crear_gastos_varios() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_bien uuid := app.uuid_v7();
  v_alias text := 'Gastos varios - ' || new.nombre_razon_social;
begin
  -- El alias de cada bien es único (sin distinguir mayúsculas): si dos propietarios se llaman igual
  -- (PRO-01 lo permite con confirmación) se agrega un fragmento del identificador.
  if exists (select 1 from public.bien where lower(alias) = lower(v_alias)) then
    v_alias := v_alias || ' (' || left(new.id::text, 8) || ')';
  end if;

  insert into public.bien (id, organizacion_id, tipo_bien, alias, estado, es_gastos_varios)
  values (v_bien, new.organizacion_id, 'otros', v_alias, 'activo', true);

  insert into public.bien_propietario (id, organizacion_id, bien_id, propietario_id, porcentaje, es_representante)
  values (app.uuid_v7(), new.organizacion_id, v_bien, new.id, 100, true);

  return new;
end;
$$;

drop trigger if exists propietario_crear_gastos_varios on public.propietario;
create trigger propietario_crear_gastos_varios
  after insert on public.propietario
  for each row execute function app.crear_gastos_varios();

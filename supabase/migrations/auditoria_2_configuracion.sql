-- Auditoría configurable (AUD-04): el administrador puede apagar el registro de auditoría de datos para toda la
-- administración o dejarlo solo en algunos propietarios. Los movimientos de dinero (pagos, cobros, depósitos,
-- liquidaciones y cuenta corriente), la configuración de la administración y los usuarios se auditan siempre.
-- Un registro de varios titulares (por ejemplo, un bien) se audita si al menos uno de ellos tiene la auditoría activa.
-- Los registros ya guardados no se tocan. Se ejecuta DESPUÉS de seguridad_1_funciones_sin_acceso_anonimo.sql.

alter table public.organizacion add column if not exists auditoria_activa boolean not null default true;
alter table public.propietario add column if not exists auditar boolean not null default true;

create or replace function app.auditar() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_nuevo jsonb := to_jsonb(new);
  v_viejo jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) end;
  v_id uuid := (to_jsonb(new) ->> 'id')::uuid;
  v_org uuid;
  v_bien uuid;
  v_accion public.accion_auditoria;
  v_props uuid[];
begin
  if tg_op = 'UPDATE' and (v_nuevo - 'updated_at' - 'version') = (v_viejo - 'updated_at' - 'version') then
    return null;
  end if;

  v_org := case when tg_table_name = 'organizacion' then v_id else (v_nuevo ->> 'organizacion_id')::uuid end;

  if tg_op = 'INSERT' then
    v_accion := 'alta';
  elsif tg_table_name = 'liquidacion' and v_nuevo ->> 'estado' = 'reabierta' and v_viejo ->> 'estado' <> 'reabierta' then
    v_accion := 'reapertura';
  elsif coalesce((v_nuevo ->> 'anulado')::boolean, false) and not coalesce((v_viejo ->> 'anulado')::boolean, false) then
    v_accion := 'anulacion';
  elsif coalesce((v_nuevo ->> 'anulada')::boolean, false) and not coalesce((v_viejo ->> 'anulada')::boolean, false) then
    v_accion := 'anulacion';
  elsif v_nuevo ->> 'deleted_at' is not null and v_viejo ->> 'deleted_at' is null then
    v_accion := 'anulacion';
  else
    v_accion := 'modificacion';
  end if;

  -- Bien al que se refiere el cambio (AUD-01: el operador ve solo lo de sus bienes).
  v_bien := case
    when tg_table_name = 'bien' then v_id
    when tg_table_name = 'pago' then
      (select o.bien_id from public.obligacion o where o.id = (v_nuevo ->> 'obligacion_id')::uuid)
    when tg_table_name in ('cobro_alquiler', 'canon_tramo', 'contrato_responsabilidad') then
      (select c.bien_id from public.contrato c where c.id = (v_nuevo ->> 'contrato_id')::uuid)
    when tg_table_name = 'reparto_concepto_porcentaje' then
      (select r.bien_id from public.reparto_concepto r where r.id = (v_nuevo ->> 'reparto_concepto_id')::uuid)
    else nullif(v_nuevo ->> 'bien_id', '')::uuid
  end;

  -- AUD-04: se omite el registro de datos si la auditoría está apagada. Siempre se auditan el dinero, los usuarios,
  -- la configuración de la administración y el propio cambio de la casilla de auditoría de un propietario.
  if tg_table_name not in (
       'organizacion', 'usuario', 'usuario_bien', 'movimiento', 'pago', 'cobro_alquiler',
       'resumen_deposito', 'resumen_deposito_monto', 'liquidacion', 'liquidacion_total'
     )
     and not (tg_table_name = 'propietario' and tg_op = 'UPDATE' and (v_nuevo -> 'auditar') is distinct from (v_viejo -> 'auditar'))
  then
    if not coalesce((select o.auditoria_activa from public.organizacion o where o.id = v_org), true) then
      return null;
    end if;
    v_props := case
      when tg_table_name = 'propietario' then array[v_id]
      when nullif(v_nuevo ->> 'propietario_id', '') is not null then array[(v_nuevo ->> 'propietario_id')::uuid]
      when v_bien is not null then
        (select coalesce(array_agg(bp.propietario_id), '{}') from public.bien_propietario bp
          where bp.bien_id = v_bien and bp.deleted_at is null)
      else '{}'
    end;
    if cardinality(v_props) > 0
       and not exists (select 1 from public.propietario p where p.id = any (v_props) and p.auditar) then
      return null;
    end if;
  end if;

  insert into public.auditoria
    (id, organizacion_id, tabla, registro_id, bien_id, accion, valores_antes, valores_despues, usuario_id)
  values
    (gen_random_uuid(), v_org, tg_table_name, v_id, v_bien, v_accion, v_viejo, v_nuevo, auth.uid());
  return null;
end;
$$;

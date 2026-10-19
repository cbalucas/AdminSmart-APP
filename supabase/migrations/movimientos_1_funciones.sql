-- Paso 8 · Cuenta corriente: traspaso entre monedas (MOV-04) y anulación de movimientos manuales (RN-05, MOV-02, MOV-03).
-- Corren con los permisos de quien las llama (security invoker): rigen las políticas RLS (los movimientos
-- manuales y los contramovimientos son solo del administrador) y las protecciones del bloque 3
-- (el contramovimiento debe invertir exactamente al original y no se admite sobre una liquidación emitida).

-- MOV-04: un traspaso genera dos movimientos enlazados por `traspaso_id`: un débito en la moneda de
-- origen y un crédito en la de destino, con el tipo de cambio aplicado (pesos por dólar).
drop function if exists public.registrar_traspaso(uuid, uuid, uuid, public.moneda, bigint, bigint, date, text);

create or replace function public.registrar_traspaso(
  p_organizacion uuid,
  p_propietario uuid,
  p_bien uuid,
  p_moneda_origen public.moneda,
  p_importe_origen bigint,
  p_importe_destino bigint,
  p_fecha date,
  p_descripcion text,
  p_tipo_cambio numeric default null
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_traspaso uuid := app.uuid_v7();
  v_destino public.moneda := case when p_moneda_origen = 'ARS' then 'USD' else 'ARS' end;
  v_pesos bigint := case when p_moneda_origen = 'ARS' then p_importe_origen else p_importe_destino end;
  v_dolares bigint := case when p_moneda_origen = 'ARS' then p_importe_destino else p_importe_origen end;
  v_cambio numeric(18, 6);
  v_texto text;
begin
  if p_importe_origen <= 0 or p_importe_destino <= 0 then
    raise exception 'MOV-04: los dos importes del traspaso deben ser mayores a cero.' using errcode = 'P0001';
  end if;
  -- El tipo de cambio escrito por el administrador se conserva; si no hay, sale de los dos importes.
  v_cambio := coalesce(round(p_tipo_cambio, 6), round(v_pesos::numeric / v_dolares::numeric, 6));
  v_texto := 'Traspaso ' || p_moneda_origen || ' → ' || v_destino || ' (tipo de cambio ' || v_cambio || ')'
             || coalesce(' · ' || nullif(trim(p_descripcion), ''), '');

  insert into public.movimiento
    (id, organizacion_id, propietario_id, bien_id, moneda, fecha, tipo, debe, haber, descripcion, origen_tipo, traspaso_id, tipo_cambio)
  values
    (app.uuid_v7(), p_organizacion, p_propietario, p_bien, p_moneda_origen, p_fecha, 'traspaso_moneda', p_importe_origen, 0, v_texto, 'manual', v_traspaso, v_cambio),
    (app.uuid_v7(), p_organizacion, p_propietario, p_bien, v_destino, p_fecha, 'traspaso_moneda', 0, p_importe_destino, v_texto, 'manual', v_traspaso, v_cambio);
  return v_traspaso;
end;
$$;

-- RN-05, MOV-02, MOV-03: un movimiento manual no se borra ni se edita: se anula con un contramovimiento que
-- lo invierte. Si es parte de un traspaso se anulan los dos movimientos juntos.
create or replace function public.anular_movimiento(p_movimiento uuid) returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  o public.movimiento;
  v_hechos int := 0;
begin
  select * into o from public.movimiento where id = p_movimiento and deleted_at is null;
  if not found then
    raise exception 'El movimiento no existe.' using errcode = 'P0001';
  end if;
  if o.origen_tipo <> 'manual' or o.contramovimiento_de_id is not null then
    raise exception 'MOV-02: los movimientos automáticos se corrigen anulando su origen (pago o cobro).' using errcode = 'P0001';
  end if;

  insert into public.movimiento
    (id, organizacion_id, propietario_id, bien_id, moneda, fecha, tipo, debe, haber, descripcion, origen_tipo, origen_id, contramovimiento_de_id, traspaso_id, tipo_cambio)
  select app.uuid_v7(), m.organizacion_id, m.propietario_id, m.bien_id, m.moneda,
         (now() at time zone 'America/Argentina/Cordoba')::date,
         'contramovimiento_anulacion', m.haber, m.debe, 'Anulación: ' || m.descripcion, m.origen_tipo, null, m.id, m.traspaso_id, m.tipo_cambio
    from public.movimiento m
   where m.deleted_at is null and m.contramovimiento_de_id is null and m.origen_tipo = 'manual'
     and (m.id = o.id or (o.traspaso_id is not null and m.traspaso_id = o.traspaso_id))
     and not exists (select 1 from public.movimiento x where x.contramovimiento_de_id = m.id);
  get diagnostics v_hechos = row_count;
  if v_hechos = 0 then
    raise exception 'El movimiento ya está anulado.' using errcode = 'P0001';
  end if;
end;
$$;

grant execute on function public.registrar_traspaso(uuid, uuid, uuid, public.moneda, bigint, bigint, date, text, numeric) to authenticated;
grant execute on function public.anular_movimiento(uuid) to authenticated;

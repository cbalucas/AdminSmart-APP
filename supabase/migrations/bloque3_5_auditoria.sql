-- Bloque 3 · Auditoría automática (SEG-05): un trigger registra en `auditoria` toda alta,
-- modificación y anulación, con valores anteriores y nuevos, usuario y fecha.
-- Se ejecuta DESPUÉS de bloque3_4_protecciones.sql.
--
-- Las filas de auditoría las crea el servidor (el id se genera acá, no en el cliente) y nadie
-- puede editarlas ni borrarlas (AUD-02). La depuración a los 5 años (AUD-03) queda para una
-- tarea programada posterior.

create function app.auditar() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_nuevo jsonb := to_jsonb(new);
  v_viejo jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) end;
  v_id uuid := (to_jsonb(new) ->> 'id')::uuid;
  v_org uuid;
  v_bien uuid;
  v_accion public.accion_auditoria;
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

  insert into public.auditoria
    (id, organizacion_id, tabla, registro_id, bien_id, accion, valores_antes, valores_despues, usuario_id)
  values
    (gen_random_uuid(), v_org, tg_table_name, v_id, v_bien, v_accion, v_viejo, v_nuevo, auth.uid());
  return null;
end;
$$;

do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'organizacion', 'usuario', 'usuario_bien', 'propietario', 'cuenta_bancaria', 'propietario_cuenta',
    'acuerdo_honorarios', 'edificio', 'bien', 'bien_propietario', 'concepto', 'bien_servicio',
    'reparto_concepto', 'reparto_concepto_porcentaje', 'inquilino', 'contrato', 'canon_tramo',
    'contrato_responsabilidad', 'obligacion', 'pago', 'cobro_alquiler', 'liquidacion',
    'liquidacion_total', 'movimiento', 'resumen_deposito', 'resumen_deposito_monto', 'documento',
    'indice_ipc', 'plantilla_envio', 'envio'
  ] loop
    execute format(
      'create trigger %I after insert or update on public.%I for each row execute function app.auditar()',
      tabla || '_auditoria', tabla
    );
  end loop;
end;
$$;

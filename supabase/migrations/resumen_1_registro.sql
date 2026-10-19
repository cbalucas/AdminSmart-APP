-- Paso 9b · Resumen de depósito: registro con número DEP-AAAA-NNNN y guardado del PDF (LIQ-08).
--
-- 1) Política para que administrador y operador guarden en el bucket privado `informes` los PDF que genera el
--    servidor con su sesión. Solo en la carpeta de su organización; nunca se borra ni se pisa un archivo.
-- 2) Función que registra el resumen y sus montos por moneda en una sola operación. El número lo asigna el
--    disparador `resumen_deposito_numerar` y no cambia nunca.

create policy storage_informes_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'informes'
    and (storage.foldername(name))[1] = (select app.mi_organizacion())::text
    and ((select app.es_admin()) or (select app.es_operador()))
  );

-- p_montos: [{"moneda": "ARS", "obligaciones_pendientes": 0, "saldo_disponible": 0, "reposicion_fondo": 0,
--             "a_depositar": 0, "saldo_a_transferir": 0}, ...] en centavos.
create or replace function public.registrar_resumen_deposito(
  p_organizacion uuid,
  p_propietario uuid,
  p_fecha date,
  p_horizonte_dias integer,
  p_fecha_limite date,
  p_montos jsonb,
  p_id uuid default null
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid := coalesce(p_id, app.uuid_v7());
  v_numero text;
  m jsonb;
begin
  -- El número es provisorio hasta el disparador, que lo reemplaza por el correlativo del año.
  insert into public.resumen_deposito (id, organizacion_id, propietario_id, numero, fecha, horizonte_dias, fecha_limite)
  values (v_id, p_organizacion, p_propietario, 'DEP-pendiente', p_fecha, greatest(1, p_horizonte_dias), p_fecha_limite)
  returning numero into v_numero;

  for m in select * from jsonb_array_elements(coalesce(p_montos, '[]'::jsonb)) loop
    insert into public.resumen_deposito_monto
      (id, organizacion_id, resumen_deposito_id, moneda, obligaciones_pendientes, saldo_disponible, reposicion_fondo, a_depositar, saldo_a_transferir)
    values
      (app.uuid_v7(), p_organizacion, v_id, (m ->> 'moneda')::public.moneda,
       (m ->> 'obligaciones_pendientes')::bigint, (m ->> 'saldo_disponible')::bigint, (m ->> 'reposicion_fondo')::bigint,
       (m ->> 'a_depositar')::bigint, (m ->> 'saldo_a_transferir')::bigint);
  end loop;

  return jsonb_build_object('id', v_id, 'numero', v_numero);
end;
$$;

grant execute on function public.registrar_resumen_deposito(uuid, uuid, date, integer, date, jsonb, uuid) to authenticated;

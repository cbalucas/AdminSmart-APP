-- Datos de prueba (solo desarrollo): obligaciones de octubre y noviembre de 2026 sobre los servicios
-- cargados por datos_prueba_servicios.sql. Se puede ejecutar más de una vez (no repite servicio + período).
do $$
declare
  v_org uuid := (select id from public.organizacion limit 1);
  fila record;
begin
  for fila in
    select * from (values
      ('Terreno Berrotaran', 'Rentas',        '2026-10-01', 1870000::bigint, '2026-10-20', true),
      ('Terreno Berrotaran', 'Municipalidad', '2026-10-01', 980000::bigint,  '2026-10-08', true),
      ('Terreno Berrotaran', 'Agua',          '2026-10-01', 1820000::bigint, '2026-10-22', false),
      ('Dpto Caseros',       'Luz',           '2026-10-01', 2875000::bigint, '2026-10-14', true),
      ('Dpto Caseros',       'Gas',           '2026-10-01', 640000::bigint,  '2026-10-25', true),
      ('Terreno Berrotaran', 'Rentas',        '2026-11-01', null,            null,         true),
      ('Terreno Berrotaran', 'Municipalidad', '2026-11-01', null,            null,         true),
      ('Dpto Caseros',       'Luz',           '2026-11-01', null,            null,         true)
    ) as t(bien, concepto, periodo, monto, vencimiento, recurrente)
  loop
    insert into public.obligacion
      (id, organizacion_id, bien_servicio_id, bien_id, concepto_id, periodo, es_recurrente, frecuencia,
       monto, moneda, responsable, vencimiento)
    select app.uuid_v7(), v_org, s.id, b.id, c.id, fila.periodo::date, fila.recurrente,
           case when fila.recurrente then 'mensual' end::public.periodicidad,
           fila.monto, 'ARS', 'propietario', fila.vencimiento::date
    from public.bien b
    join public.concepto c on c.nombre = fila.concepto and c.deleted_at is null
    join public.bien_servicio s on s.bien_id = b.id and s.concepto_id = c.id and s.deleted_at is null
    where b.alias = fila.bien and b.deleted_at is null
      and not exists (
        select 1 from public.obligacion o
        where o.bien_servicio_id = s.id and o.periodo = fila.periodo::date and o.deleted_at is null and not o.anulada
      );
  end loop;
end $$;

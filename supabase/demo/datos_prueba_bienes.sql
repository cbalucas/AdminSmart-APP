-- Datos de prueba (solo desarrollo): los bienes y la titularidad del Excel "Pepe - Bienes".
-- Se ejecuta DESPUÉS de datos_prueba_propietarios.sql y ANTES de datos_prueba_servicios.sql.
-- Se puede ejecutar más de una vez (no repite un bien con el mismo alias).
--   Dpto Caseros:       Carlos José 50 % (representante), Lucas 25 %, Julieta 10 % (el 15 % restante no se carga).
--   Terreno Berrotaran: Carlos José 100 %.
--   AI539LO (auto):     Carlos José 100 %.        AE896SR (auto): Lucas 100 %.
do $$
declare
  v_org uuid := (select id from public.organizacion limit 1);
  v_bien uuid;
  fila record;
begin
  for fila in
    select * from (values
      ('Dpto Caseros',       'inmueble', 'departamento', 'Caseros',          '681',  'disponible', null,     null),
      ('Terreno Berrotaran', 'terreno',  null,           'Nicolas Berrotaran', '1545', 'disponible', null,   null),
      ('AI539LO',            'vehiculo', 'auto',         null,               null,   'activo',     'AI539LO', null),
      ('AE896SR',            'vehiculo', 'auto',         null,               null,   'activo',     'AE896SR', null)
    ) as t(alias, tipo, subtipo, calle, numero, estado, dominio, x)
  loop
    if not exists (select 1 from public.bien where lower(alias) = lower(fila.alias) and deleted_at is null) then
      insert into public.bien (id, organizacion_id, tipo_bien, subtipo, alias, calle, numero, localidad, provincia, dominio, estado)
      values (app.uuid_v7(), v_org, fila.tipo::public.tipo_bien, fila.subtipo, fila.alias, fila.calle, fila.numero,
              case when fila.calle is null then null else 'Córdoba' end, case when fila.calle is null then null else 'Córdoba' end,
              fila.dominio, fila.estado::public.estado_bien);
    end if;
  end loop;

  for fila in
    select * from (values
      ('Dpto Caseros',       'Carlos José Paez Allende', 50::numeric, true),
      ('Dpto Caseros',       'Lucas Paez Allende',       25::numeric, false),
      ('Dpto Caseros',       'Julieta Carranza',         10::numeric, false),
      ('Terreno Berrotaran', 'Carlos José Paez Allende', 100::numeric, true),
      ('AI539LO',            'Carlos José Paez Allende', 100::numeric, true),
      ('AE896SR',            'Lucas Paez Allende',       100::numeric, true)
    ) as t(bien, propietario, porcentaje, representante)
  loop
    select id into v_bien from public.bien where lower(alias) = lower(fila.bien) and deleted_at is null;
    insert into public.bien_propietario (id, organizacion_id, bien_id, propietario_id, porcentaje, es_representante)
    select app.uuid_v7(), v_org, v_bien, p.id, fila.porcentaje, fila.representante
    from public.propietario p
    where p.nombre_razon_social = fila.propietario and p.deleted_at is null
      and not exists (select 1 from public.bien_propietario bp where bp.bien_id = v_bien and bp.propietario_id = p.id and bp.deleted_at is null);
  end loop;
end $$;

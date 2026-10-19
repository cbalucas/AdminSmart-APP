-- Datos de prueba (solo desarrollo): servicios e impuestos de la hoja "Servicios e Impuestos"
-- del Excel "Pepe - Bienes". Se puede ejecutar más de una vez (no repite bien + concepto).
-- Requiere que existan los bienes "Terreno Berrotaran" y "Dpto Caseros" y el catálogo de conceptos.
-- "Mes desde / hasta" del Excel no es un campo del sistema: queda anotado en las observaciones.
do $$
declare
  v_org uuid := (select id from public.organizacion limit 1);
  fila record;
begin
  for fila in
    select * from (values
      ('Terreno Berrotaran', 'Rentas',         '110124278791',    'Rentas de Córdoba',          'mensual', 'Rentas 2026 en 6 cuotas (febrero a julio)', true),
      ('Terreno Berrotaran', 'Municipalidad',  '051402604500003', 'Municipalidad de Córdoba',   'mensual', 'Municipalidad 2026 en 6 cuotas (febrero a julio)', true),
      ('Terreno Berrotaran', 'Agua',           '827475',          'Aguas Cordobesas',           'mensual', null, true),
      ('Dpto Caseros',       'Rentas',         '110109724190',    'Rentas de Córdoba',          'anual',   '2026 pagado en cuota única. Completar mes de vencimiento y activar', false),
      ('Dpto Caseros',       'Municipalidad',  '040501403400012', 'Municipalidad de Córdoba',   'anual',   '2026 pagado en cuota única. Completar mes de vencimiento y activar', false),
      ('Dpto Caseros',       'Agua',           '346464',          'Aguas Cordobesas',           'mensual', 'July lo tiene por débito', true),
      ('Dpto Caseros',       'Luz',            '0067577202',      'EPEC',                       'mensual', 'July lo tiene por débito', true),
      ('Dpto Caseros',       'Gas',            '21922804',        'Ecogas',                     'mensual', 'July lo tiene por débito', true)
    ) as t(bien, concepto, cuenta, empresa, periodicidad, observaciones, activo)
  loop
    insert into public.bien_servicio
      (id, organizacion_id, bien_id, concepto_id, nro_cuenta_cliente, empresa_prestadora,
       responsable_default, estado, periodicidad, observaciones)
    select app.uuid_v7(), v_org, b.id, c.id, fila.cuenta, fila.empresa,
           'propietario', case when fila.activo then 'activo' else 'inactivo' end::public.estado_activo,
           fila.periodicidad::public.periodicidad, fila.observaciones
    from public.bien b, public.concepto c
    where b.alias = fila.bien and b.deleted_at is null
      and c.nombre = fila.concepto and c.deleted_at is null
      and not exists (
        select 1 from public.bien_servicio s
        where s.bien_id = b.id and s.concepto_id = c.id and s.deleted_at is null
      );
  end loop;
end $$;

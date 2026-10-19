-- Datos de prueba (solo desarrollo): los titulares que aparecen en el Excel "Pepe - Bienes".
-- Los cotitulares que no se administran no se cargan: la titularidad puede sumar menos de 100 %.
-- Al crear cada propietario, la base crea sola su bien "Gastos varios" (PROP-06).
-- Los emails y teléfonos son inventados. Se puede ejecutar más de una vez.
do $$
declare
  v_org uuid := (select id from public.organizacion limit 1);
  v_nombre text;
begin
  foreach v_nombre in array array[
    'Carlos José Paez Allende',
    'Lucas Paez Allende',
    'Julieta Carranza'
  ] loop
    if not exists (select 1 from public.propietario where nombre_razon_social = v_nombre and deleted_at is null) then
      insert into public.propietario (id, organizacion_id, tipo_persona, nombre_razon_social, telefonos, emails, idioma_informes)
      values (
        app.uuid_v7(), v_org, 'humana', v_nombre,
        '[{"tipo":"celular","numero":"+54 351 555-0100"}]'::jsonb,
        jsonb_build_array(jsonb_build_object(
          'email', lower(replace(translate(v_nombre, 'óé', 'oe'), ' ', '.')) || '@example.com', 'principal', true)),
        'es'
      );
    end if;
  end loop;
end $$;

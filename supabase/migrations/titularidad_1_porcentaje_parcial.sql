-- Titularidad: los porcentajes cargados pueden sumar menos de 100 % (los cotitulares que no se
-- administran no hace falta cargarlos). Lo que no se admite es superar 100 %, ni un bien sin titulares.
-- La vista alimenta la advertencia en pantalla; mismas columnas que antes.
create or replace view bien_titularidad_control with (security_invoker = true) as
select
  b.id as bien_id,
  b.organizacion_id,
  coalesce(sum(bp.porcentaje), 0) as suma_porcentajes,
  count(*) filter (where bp.es_representante) as representantes,
  (coalesce(sum(bp.porcentaje), 0) > 100 or count(bp.id) = 0) as porcentajes_incorrectos,
  (b.modo_liquidacion = 'al_representante'
     and count(*) filter (where bp.es_representante) <> 1) as representante_incorrecto
from public.bien b
left join public.bien_propietario bp on bp.bien_id = b.id and bp.deleted_at is null
where b.deleted_at is null
group by b.id, b.organizacion_id, b.modo_liquidacion;

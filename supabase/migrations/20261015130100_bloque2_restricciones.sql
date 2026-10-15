-- Bloque 2 · Restricciones, vistas y automatismos que Drizzle no expresa.
-- Se ejecuta DESPUÉS de 20261015130000_bloque2_operacion.sql.

-- La extensión btree_gist vive en el esquema `extensions`.
set search_path = public, extensions;

-- CTR-02: un bien no puede tener dos contratos vigentes a la vez.
-- La vigencia va desde el inicio (o desde siempre, si no se cargó) hasta lo que ocurra primero
-- entre la fecha de fin y la rescisión (o hasta siempre, si no hay ninguna de las dos).
alter table contrato
  add constraint contrato_sin_superposicion
  exclude using gist (
    bien_id with =,
    daterange(
      coalesce(fecha_inicio, '-infinity'::date),
      coalesce(least(fecha_fin, rescision_fecha), 'infinity'::date),
      '[]'
    ) with &&
  ) where (deleted_at is null);

-- LIQ-05: no pueden existir dos liquidaciones emitidas de un propietario con períodos superpuestos.
alter table liquidacion
  add constraint liquidacion_sin_superposicion
  exclude using gist (
    propietario_id with =,
    daterange(periodo_desde, periodo_hasta, '[]') with &&
  ) where (deleted_at is null and estado in ('emitida', 'enviada'));

-- Al modificar una fila se actualiza `updated_at` y se suma 1 a `version`.
do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'inquilino', 'contrato', 'canon_tramo', 'contrato_responsabilidad', 'obligacion', 'pago',
    'cobro_alquiler', 'liquidacion', 'liquidacion_total', 'movimiento', 'resumen_deposito',
    'resumen_deposito_monto', 'documento', 'indice_ipc', 'plantilla_envio', 'envio'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.actualizar_fila_modificada()',
      tabla || '_modificada', tabla
    );
  end loop;
end;
$$;

-- Estado calculado de la obligación (sección 10 del diccionario). Nunca se guarda.
-- Una obligación pagada lo está aunque no tuviera monto (OBL-11); Vencida exige fecha (OBL-02, RN-04).
create view obligacion_estado with (security_invoker = true) as
select
  o.id as obligacion_id,
  o.organizacion_id,
  case
    when o.anulada then 'anulada'
    when exists (
      select 1 from pago p
      where p.obligacion_id = o.id and not p.anulado and not p.en_conflicto and p.deleted_at is null
    ) then 'pagada'
    when o.monto is null then 'a_completar'
    when o.vencimiento is not null
      and o.vencimiento < (now() at time zone 'America/Argentina/Cordoba')::date then 'vencida'
    else 'pendiente'
  end as estado
from obligacion o
where o.deleted_at is null;

-- Saldo del propietario por moneda (MOV-01): suma de haber menos debe. Nunca se guarda.
-- Las anulaciones son contramovimientos, por lo que el original y su contrario se compensan.
create view saldo_propietario with (security_invoker = true) as
select
  m.organizacion_id,
  m.propietario_id,
  m.moneda,
  sum(m.haber - m.debe)::bigint as saldo
from movimiento m
where m.deleted_at is null
group by m.organizacion_id, m.propietario_id, m.moneda;

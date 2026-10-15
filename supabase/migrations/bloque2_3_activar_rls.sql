-- Bloque 2 · Activa la seguridad por fila (RLS) en TODAS las tablas del esquema público.
-- Sin RLS, cualquiera con la clave publicable podría leer y escribir. Con RLS activa y sin
-- políticas, nadie accede desde la web o la app; las políticas por organización y rol
-- (SEG-02) se crean en el bloque 3. Es seguro ejecutarla más de una vez.
-- Se ejecuta DESPUÉS de bloque2_2_restricciones.sql.

do $$
declare
  tabla record;
begin
  for tabla in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('alter table public.%I enable row level security', tabla.relname);
  end loop;
end;
$$;

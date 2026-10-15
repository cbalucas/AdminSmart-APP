-- Bloque 3 · Almacenamiento de archivos (SEG-03, DOC-03): buckets privados y sus políticas.
-- Se ejecuta DESPUÉS de bloque3_5_auditoria.sql.
--
-- Todo archivo se guarda bajo una carpeta con el id de la organización:
--   documentos/<organizacion_id>/<entidad>/<entidad_id>/<archivo>
--   avatares/<organizacion_id>/usuarios/<usuario_id>/<archivo>   (y de propietarios e inquilinos)
--   marca/<organizacion_id>/<logo>
--   informes/<organizacion_id>/...   (PDF de liquidaciones y resúmenes; los escribe el servidor)
-- Los buckets son privados: se accede con enlaces firmados de vencimiento corto.
-- Nunca se borran archivos desde la aplicación (no hay política de borrado).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('documentos', 'documentos', false, 26214400, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('avatares',   'avatares',   false, 2097152,  array['image/jpeg', 'image/png', 'image/webp']),
  ('marca',      'marca',      false, 2097152,  array['image/jpeg', 'image/png', 'image/svg+xml']),
  ('informes',   'informes',   false, 26214400, array['application/pdf'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------- documentos
-- Se ve lo que la tabla `documento` deja ver (su propia RLS aplica DOC-02); el administrador, todo.
create policy storage_documentos_select on storage.objects for select to authenticated
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = (select app.mi_organizacion())::text
    and ((select app.es_admin()) or exists (select 1 from public.documento d where d.archivo_path = name))
  );
create policy storage_documentos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = (select app.mi_organizacion())::text
    and ((select app.es_admin()) or (select app.es_operador()))
  );

-- ---------------------------------------------------------------- avatares
-- Los ve cualquier usuario de la organización; cada usuario sube el suyo y administrador y
-- operador suben los de propietarios e inquilinos.
create policy storage_avatares_select on storage.objects for select to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select app.mi_organizacion())::text);
create policy storage_avatares_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = (select app.mi_organizacion())::text
    and ((select app.es_admin()) or (select app.es_operador())
         or ((storage.foldername(name))[2] = 'usuarios' and (storage.foldername(name))[3] = (select auth.uid())::text))
  );
create policy storage_avatares_update on storage.objects for update to authenticated
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = (select app.mi_organizacion())::text
    and ((select app.es_admin()) or (select app.es_operador())
         or ((storage.foldername(name))[2] = 'usuarios' and (storage.foldername(name))[3] = (select auth.uid())::text))
  );

-- ---------------------------------------------------------------- marca (logo de la administración)
create policy storage_marca_select on storage.objects for select to authenticated
  using (bucket_id = 'marca' and (storage.foldername(name))[1] = (select app.mi_organizacion())::text);
create policy storage_marca_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'marca'
    and (storage.foldername(name))[1] = (select app.mi_organizacion())::text
    and (select app.es_admin())
  );
create policy storage_marca_update on storage.objects for update to authenticated
  using (
    bucket_id = 'marca'
    and (storage.foldername(name))[1] = (select app.mi_organizacion())::text
    and (select app.es_admin())
  );

-- ---------------------------------------------------------------- informes (PDF generados)
-- Se ven si el usuario puede ver la liquidación o el resumen de depósito que los referencia.
create policy storage_informes_select on storage.objects for select to authenticated
  using (
    bucket_id = 'informes'
    and (storage.foldername(name))[1] = (select app.mi_organizacion())::text
    and (
      exists (select 1 from public.liquidacion l where l.pdf_path = name)
      or exists (select 1 from public.resumen_deposito r where r.pdf_path = name)
    )
  );

-- Bloque 3 · Políticas RLS (SEG-02): cada consulta queda filtrada por organización y rol.
-- Se ejecuta DESPUÉS de bloque3_2_acceso.sql.
--
-- Reglas generales:
--  * Todo registro exige `organizacion_id` igual al del usuario conectado.
--  * No hay políticas de borrado en ninguna tabla: nada se borra, la baja es lógica (deleted_at).
--  * `numeracion` no tiene políticas: la maneja solo el servidor.
--  * `auditoria` solo se lee; la escriben los triggers del bloque 3_5.
--  * Los usuarios Inquilino (fase futura) no tienen acceso hasta que se defina esa fase.
--  * Las limitaciones por columna (qué campo puede tocar cada rol) están en los triggers de
--    bloque3_4_protecciones.sql.

-- Ejecuta lo mismo que bloque2_3: garantiza RLS activa en todas las tablas existentes.
do $$
declare
  tabla record;
begin
  for tabla in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('alter table public.%I enable row level security', tabla.relname);
  end loop;
end;
$$;

-- ---------------------------------------------------------------- organización (18)
create policy organizacion_select on organizacion for select to authenticated
  using (id = (select app.mi_organizacion()));
create policy organizacion_update on organizacion for update to authenticated
  using (id = (select app.mi_organizacion()) and (select app.es_admin()))
  with check (id = (select app.mi_organizacion()) and (select app.es_admin()));
-- El alta de la organización y del primer usuario (P-06) la hace el servidor con la clave de servicio.

-- ---------------------------------------------------------------- usuario (2)
create policy usuario_select on usuario for select to authenticated
  using (
    organizacion_id = (select app.mi_organizacion())
    and (
      id = (select auth.uid())
      or (select app.es_admin())
      or ((select app.es_operador()) and 'propietario' = any (roles)
          and propietario_id in (select app.propietarios_operador()))
    )
  );
-- Las altas de usuarios (invitaciones) pasan por una función del servidor que aplica USU-05.
create policy usuario_insert on usuario for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));
create policy usuario_update on usuario for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and ((select app.es_admin()) or id = (select auth.uid())))
  with check (organizacion_id = (select app.mi_organizacion()) and ((select app.es_admin()) or id = (select auth.uid())));

create policy usuario_bien_select on usuario_bien for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and ((select app.es_admin()) or usuario_id = (select auth.uid())));
create policy usuario_bien_insert on usuario_bien for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));
create policy usuario_bien_update on usuario_bien for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()))
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));

-- ---------------------------------------------------------------- propietario (1)
create policy propietario_select on propietario for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_ver_propietario(id));
create policy propietario_insert on propietario for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and ((select app.es_admin()) or (select app.es_operador())));
create policy propietario_update on propietario for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_propietario(id))
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_propietario(id));

-- Cuentas bancarias (P-14): solo el administrador las gestiona; el propietario ve las suyas.
create policy cuenta_bancaria_select on cuenta_bancaria for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and ((select app.es_admin()) or app.cuenta_del_propietario(id)));
create policy cuenta_bancaria_insert on cuenta_bancaria for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));
create policy cuenta_bancaria_update on cuenta_bancaria for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()))
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));

create policy propietario_cuenta_select on propietario_cuenta for select to authenticated
  using (organizacion_id = (select app.mi_organizacion())
         and ((select app.es_admin()) or propietario_id = (select app.mi_propietario())));
create policy propietario_cuenta_insert on propietario_cuenta for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));
create policy propietario_cuenta_update on propietario_cuenta for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()))
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));

-- Acuerdos de honorarios: lo ven quienes ven al propietario; solo el administrador los modifica.
create policy acuerdo_honorarios_select on acuerdo_honorarios for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_ver_propietario(propietario_id));
create policy acuerdo_honorarios_insert on acuerdo_honorarios for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));
create policy acuerdo_honorarios_update on acuerdo_honorarios for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()))
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));

-- ---------------------------------------------------------------- bienes (3 a 5)
create policy edificio_select on edificio for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and ((select app.es_admin()) or (select app.es_operador())));
create policy edificio_insert on edificio for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and ((select app.es_admin()) or (select app.es_operador())));
create policy edificio_update on edificio for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and ((select app.es_admin()) or (select app.es_operador())))
  with check (organizacion_id = (select app.mi_organizacion()) and ((select app.es_admin()) or (select app.es_operador())));

create policy bien_select on bien for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_ver_bien(id));
create policy bien_insert on bien for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and ((select app.es_admin()) or (select app.es_operador())));
create policy bien_update on bien for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(id))
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(id));

-- Titularidad y reparto (P-18): solo el administrador, salvo el primer titular de un bien nuevo.
create policy bien_propietario_select on bien_propietario for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_ver_bien(bien_id));
create policy bien_propietario_insert on bien_propietario for insert to authenticated
  with check (
    organizacion_id = (select app.mi_organizacion())
    and ((select app.es_admin()) or (app.puede_operar_bien(bien_id) and app.bien_sin_titulares(bien_id)))
  );
create policy bien_propietario_update on bien_propietario for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()))
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));

create policy reparto_concepto_select on reparto_concepto for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_ver_bien(bien_id));
create policy reparto_concepto_insert on reparto_concepto for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));
create policy reparto_concepto_update on reparto_concepto for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()))
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));

create policy reparto_concepto_porcentaje_select on reparto_concepto_porcentaje for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_ver_bien(app.bien_de_reparto(reparto_concepto_id)));
create policy reparto_concepto_porcentaje_insert on reparto_concepto_porcentaje for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));
create policy reparto_concepto_porcentaje_update on reparto_concepto_porcentaje for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()))
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));

-- ---------------------------------------------------------------- conceptos y servicios (4)
create policy concepto_select on concepto for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()));
create policy concepto_insert on concepto for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));
create policy concepto_update on concepto for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()))
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));

create policy bien_servicio_select on bien_servicio for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_ver_bien(bien_id));
create policy bien_servicio_insert on bien_servicio for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(bien_id));
create policy bien_servicio_update on bien_servicio for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(bien_id))
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(bien_id));

-- ---------------------------------------------------------------- inquilinos y contratos (6 a 9)
create policy inquilino_select on inquilino for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_ver_inquilino(id));
create policy inquilino_insert on inquilino for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and ((select app.es_admin()) or (select app.es_operador())));
create policy inquilino_update on inquilino for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_inquilino(id))
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_inquilino(id));

create policy contrato_select on contrato for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_ver_bien(bien_id));
create policy contrato_insert on contrato for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(bien_id));
create policy contrato_update on contrato for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(bien_id))
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(bien_id));

create policy canon_tramo_select on canon_tramo for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_ver_bien(app.bien_de_contrato(contrato_id)));
create policy canon_tramo_insert on canon_tramo for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(app.bien_de_contrato(contrato_id)));
create policy canon_tramo_update on canon_tramo for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(app.bien_de_contrato(contrato_id)))
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(app.bien_de_contrato(contrato_id)));

create policy contrato_responsabilidad_select on contrato_responsabilidad for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_ver_bien(app.bien_de_contrato(contrato_id)));
create policy contrato_responsabilidad_insert on contrato_responsabilidad for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(app.bien_de_contrato(contrato_id)));
create policy contrato_responsabilidad_update on contrato_responsabilidad for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(app.bien_de_contrato(contrato_id)))
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(app.bien_de_contrato(contrato_id)));

-- ---------------------------------------------------------------- obligaciones y pagos (10, 11)
-- El propietario ve solo las obligaciones a su cargo (P-26).
create policy obligacion_select on obligacion for select to authenticated
  using (
    organizacion_id = (select app.mi_organizacion())
    and ((select app.es_admin()) or app.ve_bien_como_operador(bien_id)
         or (responsable = 'propietario' and app.ve_bien_como_propietario(bien_id)))
  );
create policy obligacion_insert on obligacion for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(bien_id));
create policy obligacion_update on obligacion for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(bien_id))
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(bien_id));

create policy pago_select on pago for select to authenticated
  using (
    organizacion_id = (select app.mi_organizacion())
    and (app.puede_operar_bien(app.bien_de_obligacion(obligacion_id)) or app.obligacion_a_cargo_del_propietario(obligacion_id))
  );
create policy pago_insert on pago for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(app.bien_de_obligacion(obligacion_id)));
-- Solo se actualizan los campos de anulación y conflicto; lo controla bloque3_4.
create policy pago_update on pago for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(app.bien_de_obligacion(obligacion_id)))
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(app.bien_de_obligacion(obligacion_id)));

-- ---------------------------------------------------------------- cobros y cuenta corriente (12, 13)
create policy cobro_alquiler_select on cobro_alquiler for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_ver_bien(app.bien_de_contrato(contrato_id)));
create policy cobro_alquiler_insert on cobro_alquiler for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(app.bien_de_contrato(contrato_id)));
create policy cobro_alquiler_update on cobro_alquiler for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(app.bien_de_contrato(contrato_id)))
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_bien(app.bien_de_contrato(contrato_id)));

-- Movimientos: el administrador ve y carga todo (los manuales son solo suyos, MOV-03); el operador
-- consulta y solo registra los automáticos de un pago o cobro; el propietario ve los suyos.
create policy movimiento_select on movimiento for select to authenticated
  using (
    organizacion_id = (select app.mi_organizacion())
    and ((select app.es_admin()) or app.ve_bien_como_operador(bien_id) or propietario_id = (select app.mi_propietario()))
  );
create policy movimiento_insert on movimiento for insert to authenticated
  with check (
    organizacion_id = (select app.mi_organizacion())
    and ((select app.es_admin())
         or ((select app.es_operador()) and app.ve_bien_como_operador(bien_id)
             and tipo in ('alquiler_percibido', 'pago_obligacion') and origen_tipo in ('pago', 'cobro')))
  );
-- Solo el administrador completa `liquidacion_id` al emitir; el resto no se modifica (bloque3_4).
create policy movimiento_update on movimiento for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()))
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));

-- ---------------------------------------------------------------- liquidaciones y resúmenes (14)
create policy liquidacion_select on liquidacion for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_ver_liquidacion(id));
create policy liquidacion_insert on liquidacion for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));
create policy liquidacion_update on liquidacion for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()))
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));

create policy liquidacion_total_select on liquidacion_total for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_ver_liquidacion(liquidacion_id));
create policy liquidacion_total_insert on liquidacion_total for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));
create policy liquidacion_total_update on liquidacion_total for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()))
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));

create policy resumen_deposito_select on resumen_deposito for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_ver_propietario(propietario_id));
create policy resumen_deposito_insert on resumen_deposito for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_propietario(propietario_id));
create policy resumen_deposito_update on resumen_deposito for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_propietario(propietario_id))
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_propietario(propietario_id));

create policy resumen_deposito_monto_select on resumen_deposito_monto for select to authenticated
  using (organizacion_id = (select app.mi_organizacion())
         and app.puede_ver_propietario(app.propietario_de_resumen(resumen_deposito_id)));
create policy resumen_deposito_monto_insert on resumen_deposito_monto for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion())
              and app.puede_operar_propietario(app.propietario_de_resumen(resumen_deposito_id)));
create policy resumen_deposito_monto_update on resumen_deposito_monto for update to authenticated
  using (organizacion_id = (select app.mi_organizacion())
         and app.puede_operar_propietario(app.propietario_de_resumen(resumen_deposito_id)))
  with check (organizacion_id = (select app.mi_organizacion())
              and app.puede_operar_propietario(app.propietario_de_resumen(resumen_deposito_id)));

-- ---------------------------------------------------------------- documentos, IPC, plantillas, envíos (15, 16, 19, 20)
create policy documento_select on documento for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_ver_documento(entidad, entidad_id, visible_propietario));
create policy documento_insert on documento for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_documento(entidad, entidad_id));
create policy documento_update on documento for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_documento(entidad, entidad_id))
  with check (organizacion_id = (select app.mi_organizacion()) and app.puede_operar_documento(entidad, entidad_id));

create policy indice_ipc_select on indice_ipc for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()));
create policy indice_ipc_insert on indice_ipc for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));
create policy indice_ipc_update on indice_ipc for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()))
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));

create policy plantilla_envio_select on plantilla_envio for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and ((select app.es_admin()) or (select app.es_operador())));
create policy plantilla_envio_insert on plantilla_envio for insert to authenticated
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));
create policy plantilla_envio_update on plantilla_envio for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()))
  with check (organizacion_id = (select app.mi_organizacion()) and (select app.es_admin()));

create policy envio_select on envio for select to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and ((select app.es_admin()) or usuario_id = (select auth.uid())));
create policy envio_insert on envio for insert to authenticated
  with check (
    organizacion_id = (select app.mi_organizacion())
    and ((select app.es_admin()) or (select app.es_operador()))
    and usuario_id = (select auth.uid())
  );
create policy envio_update on envio for update to authenticated
  using (organizacion_id = (select app.mi_organizacion()) and ((select app.es_admin()) or usuario_id = (select auth.uid())))
  with check (organizacion_id = (select app.mi_organizacion()) and ((select app.es_admin()) or usuario_id = (select auth.uid())));

-- ---------------------------------------------------------------- auditoría (17)
-- AUD-01: el administrador ve todo; el operador, solo lo referido a sus bienes.
create policy auditoria_select on auditoria for select to authenticated
  using (
    organizacion_id = (select app.mi_organizacion())
    and ((select app.es_admin()) or (bien_id is not null and app.ve_bien_como_operador(bien_id)))
  );

-- ---------------------------------------------------------------- defensa adicional
-- La aplicación solo trabaja con usuarios que iniciaron sesión (rol `authenticated`). Se le quita
-- al rol anónimo cualquier permiso sobre el esquema público, existente o futuro, de modo que un
-- error en una política no pueda exponer datos sin sesión.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

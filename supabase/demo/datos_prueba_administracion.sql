-- Datos de prueba (solo desarrollo): datos de la cuenta de la administración para el resumen de depósito.
-- Los datos reales se cargan en Configuración (paso 10).
update public.organizacion
   set cuenta_deposito_banco = coalesce(cuenta_deposito_banco, 'Banco de prueba'),
       cuenta_deposito_titular = coalesce(cuenta_deposito_titular, 'Administración de prueba'),
       cuenta_deposito_cbu = coalesce(cuenta_deposito_cbu, '0000000000000000000000'),
       cuenta_deposito_alias = coalesce(cuenta_deposito_alias, 'admin.prueba')
 where id = (select id from public.organizacion limit 1);

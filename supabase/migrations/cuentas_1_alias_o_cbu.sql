-- Cuentas bancarias: se identifican por alias, por CBU/CVU o por ambos (alcanza con uno).
-- El alias de CBU/CVU tiene de 6 a 20 caracteres (letras, números, punto y guion) y se guarda en minúsculas.
alter table public.cuenta_bancaria alter column cbu_cvu drop not null;
alter table public.cuenta_bancaria drop constraint cuenta_bancaria_cbu_ck;
alter table public.cuenta_bancaria add constraint cuenta_bancaria_cbu_ck
  check (cbu_cvu is null or cbu_cvu ~ '^[0-9]{22}$');
alter table public.cuenta_bancaria add constraint cuenta_bancaria_alias_ck
  check (alias is null or alias ~ '^[a-z0-9.-]{6,20}$');
alter table public.cuenta_bancaria add constraint cuenta_bancaria_identificacion_ck
  check (cbu_cvu is not null or alias is not null);

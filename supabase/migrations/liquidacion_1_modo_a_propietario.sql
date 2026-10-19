-- Tercera forma de liquidar un bien: a un propietario elegido entre los titulares.
-- (El valor nuevo se usa recién en liquidacion_2: Postgres no permite usarlo en la misma transacción.)
alter type public.modo_liquidacion add value if not exists 'a_propietario';

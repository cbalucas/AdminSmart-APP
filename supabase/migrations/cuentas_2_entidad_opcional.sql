-- El nombre del banco o de la billetera pasa a ser opcional: la cuenta ya indica si es un banco
-- (caja de ahorro o cuenta corriente) o una billetera, y se identifica por alias o CBU/CVU.
alter table public.cuenta_bancaria alter column banco drop not null;

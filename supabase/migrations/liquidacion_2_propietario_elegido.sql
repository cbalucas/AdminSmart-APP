-- Bien liquidado "a un propietario": se guarda a cuál de los titulares. Solo se usa en ese modo.
alter table public.bien add column propietario_liquidacion_id uuid references public.propietario (id);
alter table public.bien add constraint bien_liquidacion_propietario_ck
  check (
    (modo_liquidacion = 'a_propietario') = (propietario_liquidacion_id is not null)
  );

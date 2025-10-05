-- Extiende el perfil con datos adicionales requeridos por la nueva UI.
alter table public.profiles
  add column if not exists first_name text;

alter table public.profiles
  add column if not exists last_name text;

alter table public.profiles
  add column if not exists nickname text;

alter table public.profiles
  add column if not exists age smallint check (age >= 0 and age <= 120);

alter table public.profiles
  add column if not exists contact_email text;

comment on column public.profiles.first_name is 'Nombre legal utilizado para personalizar la experiencia.';
comment on column public.profiles.last_name is 'Apellido legal utilizado para personalizar la experiencia.';
comment on column public.profiles.nickname is 'Apodo opcional mostrado en la UI.';
comment on column public.profiles.age is 'Edad aproximada para personalizar recomendaciones.';
comment on column public.profiles.contact_email is 'Correo de contacto preferido para notificaciones fuera de banda.';

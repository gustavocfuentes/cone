-- Cache de imagenes generadas, para no volver a pagar el mismo prompt+modelo.
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  prompt_hash text unique not null,
  prompt text not null,
  model text not null,
  image_data text not null,
  created_at timestamptz not null default now()
);

alter table public.generations enable row level security;

-- Contador de generaciones nuevas por dia, para frenar el gasto de creditos.
create table if not exists public.api_usage (
  day date primary key,
  count integer not null default 0
);

alter table public.api_usage enable row level security;

create or replace function public.increment_usage(usage_day date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into public.api_usage (day, count)
  values (usage_day, 1)
  on conflict (day) do update set count = public.api_usage.count + 1
  returning count into new_count;
  return new_count;
end;
$$;

-- Estas tablas solo guardan un cache de imagenes generadas (no datos de
-- usuarios), asi que se permite acceso con la anon/publishable key desde el
-- backend en Cloudflare Functions, sin necesitar la service_role key.
grant select, insert on public.generations to anon;
create policy "anon_select_generations" on public.generations for select to anon using (true);
create policy "anon_insert_generations" on public.generations for insert to anon with check (true);

grant execute on function public.increment_usage(date) to anon;

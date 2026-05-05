create or replace function public.create_pairing_code()
returns table (kid_device_id uuid, pairing_code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_child_id uuid;
  v_code text;
  v_expires timestamptz;
  v_id uuid;
begin
  select f.id into v_family_id from public.families f where f.parent_user_id = auth.uid();
  if v_family_id is null then raise exception 'No family for current user'; end if;

  select c.id into v_child_id from public.children c where c.family_id = v_family_id limit 1;
  if v_child_id is null then raise exception 'No child for current user'; end if;

  v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  v_expires := now() + interval '10 minutes';

  -- reuse latest un-paired row or create new
  select id into v_id from public.kid_devices
    where family_id = v_family_id and child_id = v_child_id and device_token_hash is null
    order by pairing_code_expires_at desc nulls last
    limit 1;

  if v_id is null then
    insert into public.kid_devices (family_id, child_id, pairing_code, pairing_code_expires_at, pairing_attempts)
    values (v_family_id, v_child_id, v_code, v_expires, 0)
    returning id into v_id;
  else
    update public.kid_devices
      set pairing_code = v_code,
          pairing_code_expires_at = v_expires,
          pairing_attempts = 0
      where id = v_id;
  end if;

  return query select v_id, v_code, v_expires;
end;
$$;

revoke all on function public.create_pairing_code() from public;
grant execute on function public.create_pairing_code() to authenticated;

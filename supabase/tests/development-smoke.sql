-- Run in the SQL Editor of a verified development project after migration/seed.
-- No accounts, bookings or fixture data are created. All session changes roll back.
begin;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);

do $$ begin
  if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r' and c.relrowsecurity) <> 12 then
    raise exception 'TEST_RLS_TABLE_COUNT';
  end if;
  if (select count(*) from pg_constraint where conrelid='public.bookings'::regclass and contype='x') <> 2 then
    raise exception 'TEST_EXCLUSION_COUNT';
  end if;
  if (select count(*) from public.areas) <> 3
     or (select count(*) from public.tables) <> 16
     or (select count(*) from public.menu_items) <> 24 then
    raise exception 'TEST_DEMO_COUNTS';
  end if;
end $$;

set local role anon;
do $$ begin
  if (select count(*) from public.menu_items) <> 24 then raise exception 'TEST_ANON_MENU'; end if;
  begin
    perform 1 from public.bookings;
    raise exception 'TEST_ANON_BOOKING_LEAK';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.create_booking(gen_random_uuid(),gen_random_uuid(),now()+interval '2 days',2,'Test','TEST');
    raise exception 'TEST_ANON_RPC_ALLOWED';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
set local role authenticated;
do $$ begin
  if exists(select 1 from public.bookings) then raise exception 'TEST_IDENTITYLESS_BOOKING_LEAK'; end if;
  begin
    perform public.create_booking(gen_random_uuid(),gen_random_uuid(),now()+interval '2 days',2,'Test','TEST');
    raise exception 'TEST_MISSING_IDENTITY_ALLOWED';
  exception when insufficient_privilege then
    if sqlerrm <> 'AUTH_REQUIRED' then raise; end if;
  end;
  begin
    perform public.confirm_booking(gen_random_uuid());
    raise exception 'TEST_CONFIRM_WITHOUT_STAFF';
  exception when insufficient_privilege then
    if sqlerrm <> 'STAFF_REQUIRED' then raise; end if;
  end;
  begin
    update public.profiles set role='admin' where false;
    raise exception 'TEST_ROLE_ESCALATION_ALLOWED';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.audit_logs(entity_id,entity_type,action,details)
      select gen_random_uuid(),'booking','test','{}'::jsonb where false;
    raise exception 'TEST_AUDIT_INSERT_ALLOWED';
  exception when insufficient_privilege then null;
  end;
  begin
    perform private.expire_pending();
    raise exception 'TEST_PRIVATE_HELPER_ALLOWED';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;

select 'PASS' as result,
  '12 RLS tables; 2 exclusions; demo counts; anon reads; privacy; RPC identity; role/audit/helper restrictions' as checks;

-- Opt-in owner operation for the approved Supabase project only.
-- Not a portable migration: plain local PostgreSQL does not bundle pg_cron.
begin;
create extension if not exists pg_cron;
do $$
declare v_job record;
begin
  if (select count(*) from cron.job where jobname='mocvi-expire-pending') > 1 then
    raise exception 'DUPLICATE_MOCVI_EXPIRY_JOB';
  end if;
  select * into v_job from cron.job where jobname='mocvi-expire-pending';
  if found then
    if v_job.schedule <> '* * * * *' or v_job.command <> 'select private.expire_pending();'
      or not v_job.active or v_job.database <> current_database() then
      raise exception 'EXISTING_MOCVI_JOB_REQUIRES_REVIEW';
    end if;
  else
    perform cron.schedule('mocvi-expire-pending','* * * * *','select private.expire_pending();');
  end if;
end;
$$;
commit;

select jobid,jobname,schedule,active from cron.job where jobname='mocvi-expire-pending';

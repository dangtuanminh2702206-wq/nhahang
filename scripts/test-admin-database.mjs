import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Runs only inside the empty-loopback database harness, never against Supabase.
export async function testAdminDatabase({ admin, left, right, actor, check, compete, A, B, S, D, tables, start }) {
  const reason = 'PHASE8 QA';
  const row = async (table, id) => {
    const value = (await admin.query(`select * from public.${table} where id=$1`, [id])).rows[0];
    if (table === 'menu_items') value.price = Number(value.price);
    return value;
  };
  const auditCount = async () => (await admin.query('select count(*)::int n from public.audit_logs')).rows[0].n;
  const invoke = (name, values, user = D, client = left) => actor(client, user, c => c.query(`select * from public.${name}(${values.map((_, i) => `$${i + 1}`).join(',')})`, values));
  const menuArgs = r => [r.id,r.category_id,r.name,r.description,r.price,r.image_path,r.is_available,r.is_active,r.is_featured,r.sort_order,r,reason];
  const tableArgs = r => [r.id,r.area_id,r.capacity,r.status,r.description,r.is_active,r,reason];
  await admin.query('update public.profiles set is_active=true where id=$1', [A]);
  await admin.query('truncate public.notifications,public.booking_history,public.audit_logs,public.bookings cascade');
  const item = (await admin.query('select * from public.menu_items order by code limit 1')).rows[0];
  item.price = Number(item.price);
  await check('Admin RPC denies Guest, Customer, Staff and inactive Admin; private helper/direct writes denied', async () => {
    for (const user of [A, S]) await assert.rejects(invoke('admin_update_menu_item', menuArgs(item), user), /ADMIN_REQUIRED/);
    await assert.rejects(actor(left,null,c=>c.query('select public.admin_update_profile($1,\'customer\',true,$2,$3)',[A,{role:'customer',is_active:true},reason]),'anon'),e=>e.code==='42501');
    await admin.query('update public.profiles set is_active=false where id=$1',[D]);
    try { await assert.rejects(invoke('admin_update_menu_item',menuArgs(item)),/ADMIN_REQUIRED/); }
    finally { await admin.query('update public.profiles set is_active=true where id=$1',[D]); }
    await assert.rejects(actor(left,D,c=>c.query('select private.admin_actor()')),e=>e.code==='42501');
    await assert.rejects(actor(left,D,c=>c.query('update public.menu_items set price=1 where id=$1',[item.id])),e=>e.code==='42501');
  });
  await check('Admin menu changes audited once; identical save produces no duplicate event; stale/partial expected rejected', async () => {
    const n=await auditCount(); const changed={...item,description:`${item.description} QA`};
    const values=menuArgs(changed); values[10]=item;
    await invoke('admin_update_menu_item',values);
    assert.equal(await auditCount(),n+1);
    await invoke('admin_update_menu_item',menuArgs(await row('menu_items',item.id)));
    assert.equal(await auditCount(),n+1);
    await assert.rejects(invoke('admin_update_menu_item',values),/ADMIN_CONFLICT/);
    const incomplete=menuArgs(changed); incomplete[10]={};
    await assert.rejects(invoke('admin_update_menu_item',incomplete),/ADMIN_EXPECTED_REQUIRED/);
    const restore=menuArgs(item); restore[10]=await row('menu_items',item.id); await invoke('admin_update_menu_item',restore);
  });
  await check('Menu image allowlist and null flags enforced in SQL', async () => {
    const values=menuArgs(await row('menu_items',item.id)); values[5]='https://example.com/evil.webp';
    await assert.rejects(invoke('admin_update_menu_item',values),/IMAGE_NOT_IN_CATALOGUE/);
    values[5]=item.image_path; values[6]=null;
    await assert.rejects(invoke('admin_update_menu_item',values),/INVALID_INPUT/);
    values[6]=item.is_available; values[4]='NaN';
    await assert.rejects(invoke('admin_update_menu_item',values),/INVALID_INPUT/);
  });
  await check('Inactive menu/category remains visible only to Admin', async () => {
    const current=await row('menu_items',item.id); const values=menuArgs({...current,is_active:false});values[10]=current;
    await invoke('admin_update_menu_item',values);
    for (const user of [A,S]) assert.equal((await actor(left,user,c=>c.query('select id from public.menu_items where id=$1',[item.id]))).rowCount,0);
    assert.equal((await actor(left,D,c=>c.query('select id from public.menu_items where id=$1',[item.id]))).rowCount,1);
    const restore=menuArgs(current);restore[10]=await row('menu_items',item.id);await invoke('admin_update_menu_item',restore);
    const category=await row('menu_categories',item.category_id);
    await invoke('admin_update_menu_category',[category.id,category.name,category.sort_order,false,category,reason]);
    assert.equal((await actor(left,A,c=>c.query('select id from public.menu_items where id=$1',[item.id]))).rowCount,0);
    const now=await row('menu_categories',category.id);
    await invoke('admin_update_menu_category',[category.id,category.name,category.sort_order,true,now,reason]);
  });
  await check('Concurrent Admin edits have exactly one winner and one audit', async () => {
    const current=await row('menu_items',item.id);const n=await auditCount();
    const one=menuArgs({...current,description:'PHASE8 QA edit A'});one[10]=current;
    const two=menuArgs({...current,description:'PHASE8 QA edit B'});two[10]=current;
    const results=await compete(left,right,()=>invoke('admin_update_menu_item',one,D,left),()=>invoke('admin_update_menu_item',two,D,right));
    assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(await auditCount(),n+1);
    const restore=menuArgs(current);restore[10]=await row('menu_items',item.id);await invoke('admin_update_menu_item',restore);
  });
  await check('Admin audit failure rolls back the mutation', async () => {
    const current=await row('menu_items',item.id);const values=menuArgs({...current,description:'PHASE8 QA rollback'});values[10]=current;
    await admin.query("create function private.admin_test_fail() returns trigger language plpgsql as $$ begin raise exception 'TEST_ADMIN_AUDIT_FAILURE'; end $$; create trigger admin_test_failure before insert on public.audit_logs for each row execute function private.admin_test_fail()");
    try { await assert.rejects(invoke('admin_update_menu_item',values),/TEST_ADMIN_AUDIT_FAILURE/); }
    finally { await admin.query('drop trigger admin_test_failure on public.audit_logs; drop function private.admin_test_fail()'); }
    assert.equal((await row('menu_items',item.id)).description,current.description);
  });
  await check('Admin policy, hours and closures validate and restore without modifying existing bookings', async () => {
    const settings=await row('restaurant_settings',true);
    const keys=['duration_minutes','buffer_minutes','min_notice_minutes','max_advance_days','pending_minutes','cancellation_minutes','early_checkin_minutes','no_show_minutes','max_active_bookings','max_guests'];
    const values=[settings.name,...keys.map(k=>settings[k]),settings,reason];
    await invoke('admin_update_settings',values);values[1]=null;await assert.rejects(invoke('admin_update_settings',values),/INVALID_POLICY/);
    const hour=(await admin.query('select * from public.business_hours limit 1')).rows[0];
    await assert.rejects(invoke('admin_upsert_business_hours',[null,hour.weekday,hour.opens_at,hour.closes_at,null,reason]),/HOURS_OVERLAP/);
    const h=(await invoke('admin_upsert_business_hours',[null,hour.weekday,'00:01','00:02',null,reason])).rows[0];
    await invoke('admin_delete_business_hours',[h.id,h,reason]);
    await invoke('admin_upsert_closure_date',['2099-01-01',reason,null,reason]);
    await assert.rejects(invoke('admin_upsert_closure_date',['2099-01-01','changed','stale',reason]),/ADMIN_CONFLICT/);
    await invoke('admin_delete_closure_date',['2099-01-01',reason,reason]);
  });
  await check('Area hiding and table physical-state bypass are blocked', async () => {
    const t=await row('tables',tables[0].id);const area=await row('areas',t.area_id);
    await assert.rejects(invoke('admin_update_area',[area.id,area.name,false,area,reason]),/AREA_HAS_ACTIVE_TABLES/);
    for(const state of ['occupied','cleaning']) {
      const values=tableArgs({...t,status:state});values[6]=t;
      await assert.rejects(invoke('admin_update_table',values),/TABLE_NOT_READY/);
    }
    const values=tableArgs({...t,status:'out_of_service'});values[6]=t;await invoke('admin_update_table',values);
    const restore=tableArgs(t);restore[6]=await row('tables',t.id);await invoke('admin_update_table',restore);
  });
  await admin.query('truncate public.notifications,public.booking_history,public.audit_logs,public.bookings cascade');
  await check('Capacity and disabling changes cannot invalidate active booking or overstaying checked-in guests', async () => {
    await actor(left,A,c=>c.query('select * from public.create_booking($1,$2,$3,4,$4,$5)',[randomUUID(),tables[2].id,start,'PHASE8 QA','TEST-PHONE']));
    const t=await row('tables',tables[2].id);
    const shrink=tableArgs({...t,capacity:2});shrink[6]=t;await assert.rejects(invoke('admin_update_table',shrink),/CAPACITY_CONFLICT/);
    const disable=tableArgs({...t,is_active:false});disable[6]=t;await assert.rejects(invoke('admin_update_table',disable),/TABLE_HAS_ACTIVE_BOOKINGS/);
    await admin.query("update public.bookings set status='checked_in',checked_in_at=clock_timestamp()-interval '200 minutes',expires_at=null,actual_guest_count=4,starts_at=clock_timestamp()-interval '200 minutes',ends_at=clock_timestamp()-interval '80 minutes',blocked_until=clock_timestamp()-interval '1 minute'");
    await admin.query("update public.tables set status='occupied' where id=$1",[t.id]);
    const occupied=await row('tables',t.id);const smaller=tableArgs({...occupied,capacity:2});smaller[6]=occupied;
    await assert.rejects(invoke('admin_update_table',smaller),/CAPACITY_CONFLICT/);
    await admin.query("update public.tables set status='available' where id=$1",[t.id]);
  });
  await admin.query('truncate public.notifications,public.booking_history,public.audit_logs,public.bookings cascade');
  await check('Admin versus booking serializes on the same lock and cannot leave invalid capacity', async () => {
    const t=await row('tables',tables[2].id);const shrink=tableArgs({...t,capacity:2});shrink[6]=t;
    const results=await compete(left,right,()=>invoke('admin_update_table',shrink,D,left),()=>actor(right,A,c=>c.query('select * from public.create_booking($1,$2,$3,4,$4,$5)',[randomUUID(),t.id,start,'PHASE8 QA','TEST-PHONE'])));
    assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
    const restore=tableArgs(t);restore[6]=await row('tables',t.id);await invoke('admin_update_table',restore);
  });
  await check('Profile access changes use trusted state, protect self and serialize two-Admin race', async () => {
    await assert.rejects(invoke('admin_update_profile',[D,'customer',true,{role:'admin',is_active:true},reason]),/SELF_PROTECTION/);
    await invoke('admin_update_profile',[B,'admin',true,{role:'customer',is_active:true},reason]);
    const results=await compete(left,right,()=>invoke('admin_update_profile',[B,'customer',true,{role:'admin',is_active:true},reason],D,left),()=>invoke('admin_update_profile',[D,'customer',true,{role:'admin',is_active:true},reason],B,right));
    assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
    assert.equal((await admin.query("select count(*)::int n from public.profiles where role='admin' and is_active")).rows[0].n,1);
    await admin.query("update public.profiles set role=case when id=$1 then 'admin'::public.app_role else 'customer'::public.app_role end where id=any($2::uuid[])",[D,[B,D]]);
  });
  await check('Audit logs are Admin-only and access audit excludes contact fields', async () => {
    assert.equal((await actor(left,A,c=>c.query('select * from public.audit_logs'))).rowCount,0);
    const rows=(await actor(left,D,c=>c.query("select details from public.audit_logs where entity_type='profile'"))).rows;
    assert(rows.length>0);
    for(const {details} of rows) for(const v of [details.before,details.after]) assert.deepEqual(Object.keys(v).sort(),['is_active','role']);
  });
}

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

export async function testComboDatabase({admin,left,right,actor,check,compete,A,S,D}) {
  const source=await readFile(new URL('../src/data/restaurant.ts',import.meta.url),'utf8');
  const exports={};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Intl});
  const rows=async()=>(await admin.query('select * from public.menu_combos order by code')).rows;
  const current=async id=>(await admin.query('select * from public.menu_combos where id=$1',[id])).rows[0];
  const count=async()=>(await admin.query("select count(*)::int n from public.audit_logs where entity_type='menu_combo'")).rows[0].n;
  const args=row=>[row.id,row.code,row.name,row.description,row.guest_count,row.price,row.components,row.image_path,row.is_active,row.is_available,row.sort_order,row.version,'FINAL QA combo'];
  const invoke=(values,user=D,client=left)=>actor(client,user,c=>c.query(`select * from public.admin_save_combo(${values.map((_,i)=>`$${i+1}`).join(',')})`,values.map((value,i)=>i===6?JSON.stringify(value):value)));
  const baseline=await rows();
  await check('Combo migration preserves all four canonical names/prices/strings, with no invented quantities',async()=>{
    assert.equal(baseline.length,4);
    for(const [i,row] of baseline.entries()) {
      const canonical=exports.menuCombos[i];
      assert.equal(row.code,canonical.code);assert.equal(row.name,canonical.name);assert.equal(Number(row.price),canonical.price);
      assert.equal(row.guest_count,canonical.guestCount);assert.equal(row.description,canonical.description);
      assert.deepEqual(row.components.map(item=>item.label),Array.from(canonical.items));
      assert.ok(row.components.every(item=>item.quantity===null&&item.menuCode===null));
    }
  });
  const first=baseline[0];
  await check('Combo RPC denies Customer/Staff/inactive Admin; direct writes denied even to Admin',async()=>{
    for(const user of [A,S]) await assert.rejects(invoke(args(first),user),/ADMIN_REQUIRED/);
    await assert.rejects(actor(left,null,c=>c.query('select public.admin_save_combo($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',args(first).map((x,i)=>i===6?JSON.stringify(x):x)),'anon'),e=>e.code==='42501');
    await admin.query('update public.profiles set is_active=false where id=$1',[D]);
    try {await assert.rejects(invoke(args(first)),/ADMIN_REQUIRED/);} finally {await admin.query('update public.profiles set is_active=true where id=$1',[D]);}
    await assert.rejects(actor(left,D,c=>c.query('update public.menu_combos set price=1 where id=$1',[first.id])),e=>e.code==='42501');
    await assert.rejects(actor(left,D,c=>c.query('delete from public.menu_combos where id=$1',[first.id])),e=>e.code==='42501');
  });
  await check('Combo no-op/idempotency, CAS conflict and audit version enforced',async()=>{
    const n=await count();await invoke(args(first));assert.equal(await count(),n);
    const changed=args({...first,name:'FINAL QA combo renamed'});await invoke(changed);
    assert.equal((await current(first.id)).version,2);assert.equal(await count(),n+1);
    await assert.rejects(invoke(changed),/ADMIN_CONFLICT/);
    const now=await current(first.id);await invoke(args(now));assert.equal(await count(),n+1);
    const restore=args({...first,version:now.version});await invoke(restore);
  });
  await check('Combo validates empty/extra/null/fractional components, inactive refs, financial bounds and images',async()=>{
    const now=await current(first.id);
    for(const value of [null,[],[{label:'QA'}],[{label:'QA',quantity:1.5,menuCode:null}],[{label:'QA',quantity:0,menuCode:null}],[{label:'QA',quantity:1,menuCode:null,extra:true}],[{label:'QA',quantity:null,menuCode:'MISSING'}]]) {
      const values=args(now);values[6]=value;await assert.rejects(invoke(values),/INVALID_COMPONENTS|COMPONENT_NOT_ACTIVE/);
    }
    for(const [index,value] of [[5,-1],[8,null],[7,'https://evil.invalid/x.webp'],[12,'']]) {
      const values=args(now);values[index]=value;await assert.rejects(invoke(values),/INVALID_INPUT|IMAGE_NOT_IN_CATALOGUE|REASON_REQUIRED/);
    }
    const noExpected=args(now);noExpected[11]=null;await assert.rejects(invoke(noExpected),/ADMIN_EXPECTED_REQUIRED/);
    const changedCode=args(now);changedCode[1]='MV-CB99';await assert.rejects(invoke(changedCode),/COMBO_CODE_IMMUTABLE/);
  });
  await check('Combo archive is hidden from public but visible to Admin; unavailable stays visible with state',async()=>{
    const now=await current(first.id);await invoke(args({...now,is_active:false}));
    for(const user of [A,S]) assert.equal((await actor(left,user,c=>c.query('select id from public.menu_combos where id=$1',[first.id]))).rowCount,0);
    assert.equal((await actor(left,null,c=>c.query('select id from public.menu_combos where id=$1',[first.id]),'anon')).rowCount,0);
    assert.equal((await actor(left,D,c=>c.query('select id from public.menu_combos where id=$1',[first.id]))).rowCount,1);
    await invoke(args({...now,version:(await current(first.id)).version,is_available:false}));
    assert.equal((await actor(left,null,c=>c.query('select is_available from public.menu_combos where id=$1',[first.id]),'anon')).rows[0].is_available,false);
    await invoke(args({...now,version:(await current(first.id)).version}));
  });
  await check('Concurrent combo edits have exactly one winner and one audit',async()=>{
    const now=await current(first.id);const n=await count();
    const results=await compete(left,right,()=>invoke(args({...now,name:'FINAL QA A'}),D,left),()=>invoke(args({...now,name:'FINAL QA B'}),D,right));
    assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(await count(),n+1);
    await invoke(args({...now,version:(await current(first.id)).version}));
  });
  await check('Combo create, duplicate code denial and rollback when audit fails',async()=>{
    const values=args({...first,id:null,version:null,code:'MV-CB99',name:'FINAL QA new',image_path:null});
    const created=(await invoke(values)).rows[0];assert.ok(created.id);await assert.rejects(invoke(values),e=>e.code==='23505');
    await admin.query("create function private.combo_qa_fail() returns trigger language plpgsql as $$ begin if NEW.entity_type='menu_combo' then raise exception 'QA_AUDIT_FAIL'; end if; return NEW; end; $$; create trigger combo_qa_fail before insert on public.audit_logs for each row execute function private.combo_qa_fail()");
    try {await assert.rejects(invoke(args({...created,name:'FINAL QA should rollback'})),/QA_AUDIT_FAIL/);assert.equal((await current(created.id)).name,created.name);}
    finally {await admin.query('drop trigger combo_qa_fail on public.audit_logs; drop function private.combo_qa_fail()');}
    await invoke(args({...created,is_active:false}));
  });
}

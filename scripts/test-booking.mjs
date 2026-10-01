import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

// Unit/handler contract tests with explicit mocks, NOT JWT/PostgREST integration.
async function load(path, modules = {}, env = {}) {
  const source = await readFile(new URL(`../${path}`, import.meta.url),'utf8');
  const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  vm.runInNewContext(js,{exports,process:{env},URL,Date,Number,JSON,Error,Array,Buffer,
    require(name) { if (!(name in modules)) throw new Error(`Unexpected module ${name}`); return modules[name]; } });
  return exports;
}
const input = await load('src/lib/booking-input.ts');
const payload = { startsAt:'2026-10-03T18:00:00+07:00',guests:2,tableId:'11111111-1111-4111-8111-111111111111',idempotencyKey:'22222222-2222-4222-8222-222222222222',name:'Test guest',phone:'TEST-PHONE',notes:'' };
assert(input.parseBooking(payload));
for (const override of [{startsAt:'2026-02-30T18:00:00+07:00'},{startsAt:'2026-10-03T24:00:00+07:00'},{startsAt:'2026-10-03T18:00:00Z'},{guests:1.2},{guests:0},{tableId:'bad'},{name:' '},{phone:''},{notes:'a'.repeat(1001)},{role:'admin'},{customerId:payload.tableId},{source:'phone'}]) assert.equal(input.parseBooking({...payload,...override}),null);
let configured;
const booking = await load('src/lib/booking.ts',{'server-only':{},'@/lib/supabase/config':{getSupabaseConfig:()=>configured}},{BOOKING_LOCAL_MUTATIONS_ENABLED:'true'});
for (const url of [undefined,'https://project.supabase.co','http://127.0.0.1.evil.test:54321','http://localhost.evil.test']) {
  configured=url?{url,key:'public-test'}:null;
  assert.equal(booking.bookingMutationsEnabled(),false);
}
configured={url:'http://127.0.0.1:54321',key:'public-test'};
assert.equal(booking.bookingMutationsEnabled(),true);
const off = await load('src/lib/booking.ts',{'server-only':{},'@/lib/supabase/config':{getSupabaseConfig:()=>configured}},{});
assert.equal(off.bookingMutationsEnabled(),false);
assert.equal(booking.bookingError({code:'23P01'}).status,409);
assert.equal(booking.bookingError({message:'SECRET SQL contact/token'}).status,503);

class IdentityError extends Error { constructor(status) { super('DENIED'); this.status=status; } }
let enabled=false, denied=null, calls=0, rpcArgs, rpcError=null;
const userId='33333333-3333-4333-8333-333333333333';
const route = await load('src/app/api/bookings/route.server.ts',{
  'next/server':{NextResponse:{json:(body,options)=>({body,...options})}},
  '@/lib/booking':{...booking,bookingMutationsEnabled:()=>enabled},
  '@/lib/booking-input':input,
  '@/lib/identity':{IdentityError,requireRole:async roles=>{assert.deepEqual(Array.from(roles),['customer']); if(denied) throw new IdentityError(denied); return {user:{id:userId,email:'test@example.invalid'}};}},
  '@/lib/supabase/origin':{getApplicationOrigin:()=> 'http://127.0.0.1:3002'},
  '@/lib/supabase/server':{createSupabaseServerClient:async()=>({rpc:async(name,args)=>{
    calls++; assert.equal(name,'create_booking'); rpcArgs=args;
    return {error:rpcError,data:{id:payload.tableId,status:'pending',expires_at:'2026-10-03T10:00:00Z',customer_id:userId,created_by:userId,request_payload:'PRIVATE'}};
  }})},
});
function request(body=payload,origin='http://127.0.0.1:3002',type='application/json') {
  return {headers:new Headers({'origin':origin,'content-type':type}),text:async()=>typeof body==='string'?body:JSON.stringify(body)};
}
assert.equal((await route.POST(request())).status,503); assert.equal(calls,0);
assert.equal((await route.POST(request(payload,'https://attacker.invalid'))).status,403);
assert.equal((await route.POST(request(payload,undefined,'text/plain'))).status,415);
enabled=true;
assert.equal((await route.POST(request('not-json'))).status,400);
assert.equal((await route.POST(request('a'.repeat(8193)))).status,413);
assert.equal((await route.POST(request({...payload,role:'admin'}))).status,400);
for (const status of [401,403,503]) { denied=status; assert.equal((await route.POST(request())).status,status); assert.equal(calls,0); }
denied=null;
const response=await route.POST(request());
assert.equal(response.body.booking.status,'pending');
assert.equal(response.headers['Cache-Control'],'private, no-store');
assert.equal(rpcArgs.p_source,'website'); assert.equal(rpcArgs.p_customer_id,undefined);
assert.equal(rpcArgs.p_idempotency_key,payload.idempotencyKey);
assert(!JSON.stringify(response.body).includes('PRIVATE'));
await route.POST(request()); assert.equal(rpcArgs.p_idempotency_key,payload.idempotencyKey);
rpcError={code:'23P01',message:'PRIVATE SQL'};
assert.equal((await route.POST(request())).status,409);
console.log('PASS transport validation / local-only gate / mocked handler authorization, projection, retry and conflicts. NOT JWT integration.');

const availabilityRoute = await load('src/app/api/availability/route.server.ts',{
  'next/server':{NextResponse:{json:(body,options)=>({body,...options})}},
  '@/lib/booking-input':input,'@/lib/booking':booking,
  '@/lib/supabase/config':{getSupabaseConfig:()=>configured},
  '@/lib/supabase/server':{createSupabaseServerClient:async()=>({rpc:async(name,args)=>{
    assert.equal(name,'find_available_tables'); assert.equal(args.p_guest_count,2);
    return {data:[{table_id:payload.tableId,table_code:'T1-B01',area_code:'floor-1',capacity:2,customer_id:userId,contact_phone:'PRIVATE',booking_id:payload.idempotencyKey}],error:null};
  }})},
});
const projected=await availabilityRoute.GET({nextUrl:new URL(`http://localhost/api/availability?${new URLSearchParams({startsAt:payload.startsAt,guests:'2'})}`)});
assert.deepEqual(Array.from(Object.keys(projected.body.tables[0])).sort(),['area_code','capacity','table_code','table_id']);
assert(!JSON.stringify(projected.body).includes('PRIVATE'));
console.log('PASS mocked availability handler explicit public projection. NOT database HTTP integration.');

const base=process.env.BOOKING_TEST_BASE_URL;
if (base) {
  const origin=new URL(base).origin;
  assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
  const blocked=await fetch(`${origin}/api/bookings`,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(payload)});
  assert.equal(blocked.status,503,'Smoke target must have mutations disabled');
  assert(blocked.headers.get('cache-control').includes('no-store'));
  const csrf=await fetch(`${origin}/api/bookings`,{method:'POST',headers:{origin:'https://attacker.invalid','content-type':'application/json'},body:'{}'});
  assert.equal(csrf.status,403);
  const bad=await fetch(`${origin}/api/availability?startsAt=invalid&guests=2`);
  assert.equal(bad.status,400);
  assert(!JSON.stringify(await bad.json()).includes('customer_id'));
  console.log('PASS real local HTTP: mutations off / CSRF / availability validation (no cloud mutation).');
}

if (process.env.BOOKING_CHECK_PAGES === 'true') {
  const root=new URL('../.next-pages/',import.meta.url);
  async function files(dir) {
    const entries=await readdir(dir,{withFileTypes:true});
    return (await Promise.all(entries.map(e=>e.isDirectory()?files(new URL(`${e.name}/`,dir)):[new URL(e.name,dir)]))).flat();
  }
  const exported=await files(root);
  assert(!exported.some(f=>/\/api\/(availability|bookings)\//.test(f.pathname)));
  const reservation=await readFile(new URL('reservation/index.html',root),'utf8');
  assert(reservation.includes('Xem xác nhận mô phỏng'));
  assert(!reservation.includes('Kiểm tra bàn</button>'));
  let references=0;
  for (const file of exported.filter(f=>f.pathname.endsWith('.html'))) {
    const html=await readFile(file,'utf8');
    for (const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)) {
      const path=match[1]; assert(path.startsWith('/nhahang/'),`Wrong basePath in ${file.pathname}`);
      let target=new URL(path.slice('/nhahang/'.length),root);
      if(target.pathname.endsWith('/')) target=new URL('index.html',target);
      try { await stat(target); } catch { await stat(new URL(`${path.slice('/nhahang/'.length)}/index.html`,root)); }
      references++;
    }
  }
  // Only exported browser assets, not intermediate server compilation files.
  for (const file of exported.filter(f=>f.pathname.includes('/_next/static/')&&f.pathname.endsWith('.js'))) {
    assert(!/https?:\/\/[^\s"']+\.supabase\.co/.test(await readFile(file,'utf8')),'Cloud project URL must not ship in demo browser chunks');
  }
  console.log(`PASS Pages demo / excluded API routes / ${references} basePath link and asset references / no cloud project URL in browser chunks.`);
}

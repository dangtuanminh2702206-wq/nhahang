import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

async function load(file,modules,globals={}) {
  const source=await readFile(new URL(`../${file}`,import.meta.url),'utf8');
  const exports={};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,Error,SyntaxError,JSON,...globals,require:name=>{assert.ok(name in modules,`Unexpected module ${name}`);return modules[name];}});
  return exports;
}
const types=await load('src/lib/combo-types.ts',{});
class IdentityError extends Error {constructor(status){super();this.status=status;}}
let allowed=true, enabled=true, rpcCalls=0, rpcError=null;
const row={id:null,code:'MV-CB99',name:'FINAL QA',description:'QA',guestCount:2,price:499000,components:[{label:'QA',quantity:null,menuCode:null}],imagePath:null,isActive:true,isAvailable:true,sortOrder:0,expectedVersion:null,reason:'FINAL QA'};
const handler=await load('src/app/api/admin/combos/route.server.ts',{
  'next/server':{NextResponse:{json:(body,options)=>({body,status:options.status??200,headers:options.headers})}},
  '@/lib/identity':{IdentityError,requireRole:async roles=>{assert.equal(roles[0],'admin');if(!allowed)throw new IdentityError(403);}},
  '@/lib/supabase/origin':{getApplicationOrigin:()=> 'https://qa.example.invalid'},
  '@/lib/combo-types':types,
  '@/lib/combos.server':{liveCombosEnabled:()=>enabled},
  '@/lib/supabase/server':{createSupabaseServerClient:async()=>({rpc:async(name,args)=>{
    rpcCalls++;assert.equal(name,'admin_save_combo');assert.equal(args.p_expected_version,row.expectedVersion);assert.equal(args.p_reason,'FINAL QA');
    return {data:{id:'qa',version:1},error:rpcError};
  }})},
});
const request=(body=row,origin='https://qa.example.invalid',contentType='application/json')=>({headers:new Map([['origin',origin],['content-type',contentType]]),text:async()=>typeof body==='string'?body:JSON.stringify(body)});
for(const [origin,content,status] of [['https://evil.invalid','application/json',403],['https://qa.example.invalid','application/jsonp',415],['https://qa.example.invalid','text/plain',415]])assert.equal((await handler.POST(request(row,origin,content))).status,status);
assert.equal(rpcCalls,0);
allowed=false;assert.equal((await handler.POST(request())).status,403);allowed=true;
enabled=false;assert.equal((await handler.POST(request())).status,503);enabled=true;
assert.equal((await handler.POST(request('x'.repeat(24001)))).status,413);
assert.equal((await handler.POST(request('{bad'))).status,400);
for(const invalid of [{...row,unexpected:true},{...row,price:-1},{...row,price:1.5},{...row,isActive:null},{...row,components:[]},{...row,imagePath:'https://evil.invalid/execute.svg'},{...row,components:[{label:'QA',quantity:0,menuCode:null}]},{...row,expectedVersion:1},{...row,id:'wrong'}])assert.equal((await handler.POST(request(invalid))).status,400);
const ok=await handler.POST(request());assert.equal(ok.status,200);assert.equal(ok.headers['Cache-Control'],'private, no-store');assert.equal(rpcCalls,1);
rpcError={code:'42501',message:'PRIVATE'};assert.equal((await handler.POST(request())).status,403);
rpcError={code:'P0001',message:'PRIVATE'};const conflict=await handler.POST(request());assert.equal(conflict.status,409);assert.equal(JSON.stringify(conflict).includes('PRIVATE'),false);
console.log('PASS combo API contracts: role, feature gate, origin/JSON whitelist, input bounds, quantity/image validation, no-store and sanitized conflicts.');

const canonical=await load('src/data/restaurant.ts',{}, {Intl});
let dbError=false;
const combo={code:'MV-CB01',name:'Live renamed',description:'Live',guest_count:2,price:'500000',image_path:'/images/menu/combos/moc-duyen.webp',is_available:false,components:[{label:'QA confirmed',quantity:2,menuCode:null},{label:'QA descriptive',quantity:null,menuCode:null}]};
const query={select:()=>query,eq:(key,value)=>{assert.equal(key,'is_active');assert.equal(value,true);return query;},order:()=>query,limit:async()=>({data:dbError?null:[combo],error:dbError?{}:null})};
const environment={NEXT_PUBLIC_STATIC_DEMO:'false',COMBO_CATALOGUE_ENABLED:'true'};
const live=await load('src/lib/combos.server.ts',{'server-only':{},'@/data/restaurant':canonical,'@/lib/supabase/server':{createSupabaseServerClient:async()=>({from:table=>{assert.equal(table,'menu_combos');return query;}})}},{process:{env:environment}});
let result=await live.getLiveCombos();assert.equal(result.mode,'live');assert.equal(result.items[0].name,'Live renamed');assert.equal(result.items[0].price,500000);assert.equal(result.items[0].available,false);assert.equal(result.items[0].items.join('|'),'2 QA confirmed|QA descriptive');
dbError=true;result=await live.getLiveCombos();assert.equal(result.mode,'error');assert.equal(result.items.length,0);
environment.NEXT_PUBLIC_STATIC_DEMO='true';result=await live.getLiveCombos();assert.equal(result.mode,'snapshot');assert.equal(result.items.length,4);
console.log('PASS combo live mapping: active filter, quantity display, available state, fail-closed error and Pages snapshot.');

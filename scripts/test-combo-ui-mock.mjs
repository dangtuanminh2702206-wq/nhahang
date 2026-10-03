import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

// UI-only fixture provider. Bind loopback; never use for cloud or JWT acceptance.
const source=await readFile(new URL('../src/data/restaurant.ts',import.meta.url),'utf8');
const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Intl});
const names=['moc-duyen','moc-gia','moc-tinh','moc-thuong'];
let combos=exports.menuCombos.map((item,i)=>({id:`00000000-0000-4000-8000-${String(i+10).padStart(12,'0')}`,code:item.code,name:item.name,description:item.description,guest_count:item.guestCount,price:item.price,
  components:item.items.map(label=>({label,quantity:null,menuCode:null})),image_path:`/images/menu/combos/${names[i]}.webp`,is_active:true,is_available:true,sort_order:i,version:1}));
const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'admin@qa.example.invalid',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{},identities:[]};
const expiry=Math.floor(Date.now()/1000)+3600;
const token=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:user.id,aud:'authenticated',exp:expiry,iat:Math.floor(Date.now()/1000)})).toString('base64url')}.synthetic-only`;
function reply(response,value,status=200){response.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});response.end(JSON.stringify(value));}
const server=createServer(async(request,response)=>{
  try {
    const url=new URL(request.url,'http://127.0.0.1');
    if(url.pathname==='/auth/v1/token') {
      const parts=[];for await(const chunk of request)parts.push(chunk);
      const body=JSON.parse(Buffer.concat(parts).toString());
      if(body.email!=='admin@qa.example.invalid'||body.password!=='LOCAL-QA-ONLY') return reply(response,{code:'invalid_credentials'},401);
      return reply(response,{access_token:token,refresh_token:'synthetic-only',expires_in:3600,token_type:'bearer',user});
    }
    if(url.pathname==='/auth/v1/user')return reply(response,user);
    if(url.pathname==='/auth/v1/logout')return reply(response,{});
    if(url.pathname==='/rest/v1/profiles') return reply(response,{id:user.id,role:'admin',full_name:'LOCAL UI QA',phone:null,is_active:true});
    if(url.pathname==='/rest/v1/menu_combos')return reply(response,url.searchParams.get('is_active')==='eq.true'?combos.filter(row=>row.is_active):combos);
    if(url.pathname==='/rest/v1/menu_items')return reply(response,exports.restaurantMenu.map((row,i)=>({id:`item-${i}`,code:row.code,name:row.name,description:row.description,price:row.price,image_path:null,is_available:true,is_featured:row.featured,category_id:row.category})));
    if(url.pathname==='/rest/v1/menu_categories')return reply(response,exports.menuCategories.map((row,i)=>({id:row.id,code:row.id,name:row.label,sort_order:i})));
    if(url.pathname==='/rest/v1/rpc/admin_save_combo') {
      const parts=[];for await(const chunk of request)parts.push(chunk);const p=JSON.parse(Buffer.concat(parts).toString());
      const old=combos.find(row=>row.id===p.p_id);
      if(old&&old.version!==p.p_expected_version)return reply(response,{code:'P0001',message:'ADMIN_CONFLICT'},409);
      const next={id:old?.id??'00000000-0000-4000-8000-000000000099',code:p.p_code,name:p.p_name,description:p.p_description,guest_count:p.p_guest_count,price:p.p_price,components:p.p_components,image_path:p.p_image_path,is_active:p.p_is_active,is_available:p.p_is_available,sort_order:p.p_sort_order,version:(old?.version??0)+1};
      combos=old?combos.map(row=>row.id===old.id?next:row):[...combos,next];return reply(response,next);
    }
    return reply(response,{message:'UI fixture does not support this endpoint'},404);
  }catch{return reply(response,{message:'UI fixture failed'},500);}
});
server.listen(54321,'127.0.0.1',()=>console.log('LOCAL UI QA provider on loopback 54321; synthetic Auth/catalogue, no cloud writes.'));
const shutdown=()=>server.close(()=>process.exit(0));process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);

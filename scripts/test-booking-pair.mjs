import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID, randomBytes } from 'node:crypto';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';

// Operator-approved production QA: two existing Customers, no signup or role changes.
// Credentials/JWTs/cookies exist only in memory. Pending test rows are retained.
process.loadEnvFile('.env.local');
const site = 'https://moc-vi-restaurant.vercel.app';
const project = 'https://unhybmmbgumyhzaftlli.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert(key && !key.startsWith('sb_secret_'));
if (!key.startsWith('sb_publishable_')) assert.equal(JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role, 'anon');
const port = 3010;
const origin = `http://127.0.0.1:${port}`;
const csrf = randomBytes(24).toString('hex');
let busy = false;
let results = ['READY: nhập hai tài khoản Customer hiện có; không tạo user hoặc đổi quyền.'];
async function call(path, body, cookie = '') {
  return fetch(site + path, { method: body === undefined ? 'GET' : 'POST', headers: { origin: site, cookie, ...(body === undefined ? {} : {'content-type':'application/json'}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000) });
}
async function run(logins) {
  const sessions = [];
  results = [];
  const pass = label => results.push(`PASS: ${label}`);
  try {
    for (const login of logins) {
      const response = await call('/auth/session', {action:'login', ...login});
      login.password = '';
      assert.equal(response.status, 200, 'Existing Customer login');
      const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
      assert(cookie);
      const client = createServerClient(project, key, {cookies:{getAll:()=>parseCookieHeader(cookie).filter(item=>typeof item.value==='string'),setAll:()=>{}}});
      const session = {cookie, client}; sessions.push(session);
      const {data, error} = await client.auth.getUser(); assert.equal(error,null); session.id=data.user.id;
      const profile = await client.from('profiles').select('role,is_active').eq('id',session.id).single();
      assert.equal(profile.error,null); assert.equal(profile.data.role,'customer'); assert(profile.data.is_active);
    }
    assert.notEqual(sessions[0].id,sessions[1].id,'Two distinct verified Customers required');
    pass('two different real JWT Customers / active trusted profiles');
    const day = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+4*86400000));
    const startsAt=`${day}T18:00:00+07:00`;
    const query='/api/availability?'+new URLSearchParams({startsAt,guests:'2'});
    const lookup=await call(query); assert.equal(lookup.status,200); const tables=(await lookup.json()).tables; assert(tables.length>=2);
    const payload={startsAt,guests:2,tableId:tables[0].table_id,idempotencyKey:randomUUID(),name:'Phase 5 pair QA',phone:'0900000000',notes:'TEST ONLY — approved pair race QA; not a real visit.'};
    const requests=[payload,{...payload,idempotencyKey:randomUUID()}];
    const races=await Promise.all(sessions.map((session,index)=>call('/api/bookings',requests[index],session.cookie)));
    assert.deepEqual(races.map(response=>response.status).sort(),[200,409],'Exactly one winner and one conflict');
    const bodies=await Promise.all(races.map(response=>response.json()));
    const winner=races.findIndex(response=>response.status===200); const loser=1-winner;
    assert.equal(bodies[winner].booking.status,'pending');
    assert(!JSON.stringify(bodies[loser]).includes(sessions[winner].id));
    pass('two-Customer concurrent same-table race: one pending, one safe 409');
    const loserRequest={...requests[loser],startsAt:`${day}T14:00:00+07:00`,idempotencyKey:randomUUID()};
    const second=await call('/api/bookings',loserRequest,sessions[loser].cookie); assert.equal(second.status,200);
    const ownBookings=[]; ownBookings[winner]=bodies[winner].booking; ownBookings[loser]=(await second.json()).booking;
    for (let index=0;index<2;index++) {
      const session=sessions[index]; const ownId=ownBookings[index].id; const otherId=ownBookings[1-index].id;
      const own=await session.client.from('bookings').select('id,customer_id,created_by,source,status,guest_count,table_id,starts_at,expires_at').eq('id',ownId).single();
      assert.equal(own.error,null); assert.equal(own.data.customer_id,session.id); assert.equal(own.data.created_by,session.id); assert.equal(own.data.source,'website'); assert.equal(own.data.status,'pending'); assert.equal(own.data.guest_count,2); assert.equal(own.data.table_id,payload.tableId); assert(own.data.expires_at);
      for (const [relation,field] of [['bookings','id'],['booking_history','booking_id']]) {
        const other=await session.client.from(relation).select('id').eq(field,otherId);
        assert.equal(other.error,null); assert.equal(other.data.length,0,`${relation} cross-Customer isolation`);
      }
      const historyBefore=await session.client.from('booking_history').select('id').eq('booking_id',ownId);
      assert.equal(historyBefore.error,null); assert(historyBefore.data.length>0);
      const historyIds=historyBefore.data.map(item=>item.id);
      const otherHistory=await sessions[1-index].client.from('booking_history').select('id').eq('booking_id',otherId);
      assert.equal(otherHistory.error,null); assert(otherHistory.data.length>0);
      const otherNotifications=await session.client.from('notifications').select('id').in('history_id',otherHistory.data.map(item=>item.id));
      assert.equal(otherNotifications.error,null); assert.equal(otherNotifications.data.length,0);
      const notificationBefore=await session.client.from('notifications').select('id').in('history_id',historyIds);
      assert.equal(historyBefore.error,null); assert.equal(notificationBefore.error,null); assert(historyBefore.data.length>0); assert(notificationBefore.data.length>0);
      const retried=await call('/api/bookings',index===winner?requests[index]:loserRequest,session.cookie);
      assert.equal(retried.status,200); assert.equal((await retried.json()).booking.id,ownId);
      const historyAfter=await session.client.from('booking_history').select('id').eq('booking_id',ownId);
      const notificationAfter=await session.client.from('notifications').select('id').in('history_id',historyIds);
      assert.equal(historyAfter.error,null); assert.equal(notificationAfter.error,null);
      assert.equal(historyAfter.data.length,historyBefore.data.length); assert.equal(notificationAfter.data.length,notificationBefore.data.length);
      const rpc={p_idempotency_key:randomUUID(),p_table_id:payload.tableId,p_starts_at:startsAt,p_guest_count:2,p_contact_name:payload.name,p_contact_phone:payload.phone,p_source:'website'};
      const spoofed=await session.client.rpc('create_booking',{...rpc,p_customer_id:sessions[1-index].id}); assert.equal(spoofed.error?.code,'42501');
      for (const source of ['phone','walk_in']) { const denied=await session.client.rpc('create_booking',{...rpc,p_source:source}); assert.equal(denied.error?.code,'42501'); }
    }
    pass('bidirectional booking/history/notification RLS / correct server ownership and source');
    pass('HTTP retry same ID, no duplicate history or notifications');
    pass('direct RPC rejects other customer ID and phone/walk_in source forgery');
    const guest=createServerClient(project,key,{cookies:{getAll:()=>[],setAll:()=>{}}});
    const guestRead=await guest.from('bookings').select('id').eq('id',ownBookings[0].id);
    assert(guestRead.error || guestRead.data.length===0);
    const remaining=await call(query); assert.equal(remaining.status,200); assert(!(await remaining.json()).tables.some(table=>table.table_id===payload.tableId));
    pass('Guest cannot read booking; held table excluded from public lookup');
    results.push('COMPLETE: pair booking JWT/API/RPC/RLS checks PASS; two pending test bookings retained.');
  } catch(error) {
    results.push(`FAIL: ${error instanceof assert.AssertionError ? error.message : 'transport/configuration failure; sensitive details suppressed'}`);
  } finally {
    for(const login of logins) login.password='';
    for(const session of sessions) { try { await call('/auth/session',{action:'logout'},session.cookie); } catch { results.push('WARNING: logout transport failed; session discarded'); } session.cookie=''; }
  }
}
const server=createServer(async(req,res)=>{
  const reply=(status,type,body)=>{res.writeHead(status,{'content-type':type,'cache-control':'no-store','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",'referrer-policy':'no-referrer'});res.end(body);};
  if(req.method==='GET'&&req.url==='/status') return reply(200,'application/json',JSON.stringify({busy,results}));
  if(req.method==='GET'&&req.url==='/') return reply(200,'text/html; charset=utf-8',`<!doctype html><html lang="vi"><meta charset="utf-8"><title>Booking pair QA</title><h1>Kiểm thử hai Customer — production</h1><p>Tài khoản hiện có. Mật khẩu/JWT không lưu vào file hoặc log. Tạo tối đa hai booking test pending, không xóa dữ liệu.</p><form method="post" action="/run" autocomplete="off"><input type="hidden" name="csrf" value="${csrf}">${[1,2].map(index=>`<fieldset><legend>Customer ${index}</legend><label>Email <input name="email${index}" type="email" required></label><label>Mật khẩu <input name="password${index}" type="password" required autocomplete="off"></label></fieldset>`).join('')}<button>Chạy kiểm thử hai Customer</button></form><p>Kết quả: <a href="/status">Xem trạng thái</a></p></html>`);
  if(req.method!=='POST'||req.url!=='/run'||req.headers.origin!==origin) return reply(403,'text/plain','Denied');
  if(busy) return reply(409,'text/plain','Test already running');
  let body='';
  for await(const chunk of req) { body+=chunk; if(body.length>4096) return reply(413,'text/plain','Too large'); }
  const fields=new URLSearchParams(body); body='';
  if(fields.get('csrf')!==csrf) return reply(403,'text/plain','Denied');
  const logins=[1,2].map(index=>({email:fields.get(`email${index}`)?.trim(),password:fields.get(`password${index}`)}));
  if(logins.some(login=>!login.email||!login.password||login.password.length<8)) return reply(400,'text/plain','Two existing accounts required');
  busy=true;
  try { await run(logins); return reply(200,'application/json',JSON.stringify({results})); }
  finally { busy=false; for(const login of logins) login.password=''; }
});
server.listen(port,'127.0.0.1',()=>console.log(`Booking QA ready at ${origin}; credentials/results contain no tokens.`));

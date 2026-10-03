import assert from 'node:assert/strict';
import { createServerClient } from '@supabase/ssr';

// Real installed SSR SDK, synthetic provider responses only. No cloud credentials/email.
const jar = new Map();
let tokenRequests = 0;
const expires = Math.floor(Date.now()/1000)+3600;
const jwt = `${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:'synthetic-recovery',exp:expires})).toString('base64url')}.synthetic-signature`;
const fetchMock = async (url, init) => {
  const target = new URL(url);
  if (target.pathname.endsWith('/recover')) {
    const body = JSON.parse(init.body);
    assert.equal(body.email,'qa@example.invalid');
    assert.equal(body.code_challenge_method,'s256');
    assert.ok(body.code_challenge);
    return Response.json({});
  }
  if (target.pathname.endsWith('/token')) {
    tokenRequests++;
    const body = JSON.parse(init.body);
    assert.equal(body.auth_code,'synthetic-code');
    assert.ok(body.code_verifier);
    return Response.json({access_token:jwt,refresh_token:'synthetic-refresh',token_type:'bearer',expires_in:3600,user:{id:'synthetic-recovery',email_confirmed_at:new Date().toISOString()}});
  }
  throw new Error('Unexpected SDK request');
};
function client(store) {
  return createServerClient('https://qa.example.invalid','synthetic-public-key',{
    cookieOptions:{httpOnly:true,secure:true,sameSite:'lax'},
    global:{fetch:fetchMock},
    cookies:{
      getAll:()=> [...store].map(([name,value])=>({name,value})),
      setAll(values) { for(const {name,value,options} of values) {
        assert.equal(options.httpOnly,true);assert.equal(options.secure,true);assert.equal(options.sameSite,'lax');
        if(options.maxAge===0) store.delete(name); else store.set(name,value);
      } },
    },
  });
}
assert.equal((await client(jar).auth.resetPasswordForEmail('qa@example.invalid',{redirectTo:'https://qa.example.invalid/auth/recovery'})).error,null);
assert.ok([...jar.keys()].some(name=>name.endsWith('-code-verifier')),'Recovery request must persist the PKCE verifier cookie');
const success = await client(jar).auth.exchangeCodeForSession('synthetic-code');
assert.equal(success.error,null);assert.equal(success.data.user.id,'synthetic-recovery');assert.equal(tokenRequests,1);
const missing = await client(new Map()).auth.exchangeCodeForSession('synthetic-code');
assert.equal(missing.error?.code,'pkce_code_verifier_not_found');assert.equal(tokenRequests,1,'Missing verifier must fail before network exchange');
console.log('PASS actual SSR SDK recovery storage: verifier saved, same-browser exchange, HttpOnly/Secure/Lax cookies, missing-cookie denial. Synthetic provider only; not production recovery PASS.');

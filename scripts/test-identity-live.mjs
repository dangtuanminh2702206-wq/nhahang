import assert from 'node:assert/strict';
import { createInterface } from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';

// Interactive, real Customer JWT checks. Never save or print credentials/tokens.
const browserMode = process.argv.includes('--browser');
if (!browserMode && (!process.stdin.isTTY || !process.stdout.isTTY)) {
  throw new Error('Run interactively in a terminal; credentials must not be piped or logged.');
}
process.loadEnvFile('.env.local');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert.equal(new URL(url).origin, 'https://unhybmmbgumyhzaftlli.supabase.co', 'Approved development project only');
assert.ok(key && !key.startsWith('sb_secret_'), 'Public key required');
if (!key.startsWith('sb_publishable_')) {
  const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
  assert.equal(claims.role, 'anon', 'Never use a service-role key');
}

async function credentials(label) {
  const input = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const email = (await input.question(`${label} email: `)).trim();
    input.close();
    process.stdout.write(`${label} password (hidden): `);
    const password = await new Promise((resolve, reject) => {
      let value = '';
      const wasRaw = process.stdin.isRaw;
      const cleanup = () => {
        process.stdin.off('data', onData);
        process.stdin.setRawMode(wasRaw);
        process.stdin.pause();
        process.stdout.write('\n');
      };
      const onData = chunk => {
        for (const character of chunk.toString()) {
          if (character === '\u0003') {
            cleanup();
            reject(new Error('Cancelled'));
            return;
          }
          if (character === '\r' || character === '\n') {
            cleanup();
            resolve(value);
            return;
          }
          if (character === '\u007f' || character === '\b') value = value.slice(0, -1);
          else if (character >= ' ') value += character;
        }
      };
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', onData);
    });
    assert.ok(email && password, 'Email/password required');
    return { email, password };
  } finally { input.close(); }
}

async function readOwn(client, id) {
  const { data, error } = await client.from('profiles').select('id,role,is_active,full_name,phone').eq('id', id).single();
  assert.equal(error, null, 'Own profile readable');
  return data;
}

async function run(logins) {
const clients = [];
const results = [];
let transportFailed = false;
let stage = 'credentials';
const pass = label => results.push(`PASS: ${label}`);
try {
  for (let index = 0; index < logins.length; index++) {
    const label = `Customer ${index + 1}`;
    const login = logins[index];
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: async (input, options) => {
        try { return await fetch(input, { ...options, signal: AbortSignal.timeout(20000) }); }
        catch {
          transportFailed = true;
          // A failed transport must fail the test, never simulate a successful Auth response.
          return new Response('{"message":"QA transport unavailable"}', { status: 503, headers: { 'Content-Type': 'application/json' } });
        }
      } },
    });
    clients.push(client);
    stage = `${label}: login`;
    const { error } = await client.auth.signInWithPassword(login);
    login.password = '';
    assert.equal(error, null, 'Login must succeed');
    const verified = await client.auth.getUser();
    assert.equal(verified.error, null);
    assert.ok(verified.data.user?.email_confirmed_at, 'Confirmed account required');
    pass(`${label}: real login and verified confirmed user`);
  }
  const users = await Promise.all(clients.map(async client => (await client.auth.getUser()).data.user));
  if (users.length === 2) assert.notEqual(users[0].id, users[1].id, 'Two distinct accounts required');
  const originals = await Promise.all(clients.map((client, index) => readOwn(client, users[index].id)));
  for (let index = 0; index < clients.length; index++) {
    const client = clients[index];
    const own = originals[index];
    const other = originals[1 - index];
    stage = `Customer ${index + 1}: JWT/RLS`;
    assert.equal(own.role, 'customer');
    assert.equal(own.is_active, true);
    // No-op writes prove column grants without elevating/deactivating any account.
    for (const payload of [{ role: 'customer' }, { is_active: true }]) {
      const result = await client.from('profiles').update(payload).eq('id', own.id).select('id');
      assert.equal(result.error?.code, '42501', 'Protected column must be denied');
    }
    pass(`${stage}: role/is_active column writes denied`);
    if (other) {
    const read = await client.from('profiles').select('id').eq('id', other.id);
    assert.equal(read.error, null);
    assert.equal(read.data.length, 0, 'Other Customer profile must be invisible');
    // Use the owner's existing value: even a broken policy cannot change their data.
    const update = await client.from('profiles').update({ full_name: other.full_name }).eq('id', other.id).select('id');
    assert.equal(update.error, null);
    assert.equal(update.data.length, 0, 'Other Customer update must affect zero rows');
    assert.deepEqual(await readOwn(clients[1 - index], other.id), other);
    pass(`${stage}: known other account read/update isolated`);
    }
    const ownUpdate = await client.from('profiles').update({ full_name: own.full_name, phone: own.phone }).eq('id', own.id).select('id');
    assert.equal(ownUpdate.error, null);
    assert.equal(ownUpdate.data.length, 1);
    assert.deepEqual(await readOwn(client, own.id), own);
    pass(`${stage}: own allowed columns update/read`);
    stage = `Customer ${index + 1}: explicit refresh`;
    const refresh = await client.auth.refreshSession();
    assert.equal(refresh.error, null);
    assert.ok(refresh.data.session);
    assert.equal((await client.auth.getUser()).data.user?.id, own.id);
    pass(stage);
  }
  if (users.length === 1) results.push('NOT RUN: cross-user; second distinct Customer credentials required.');
  results.push('NOT RUN: signup callback, forged signup metadata, expired-cookie Proxy refresh, inactive and Staff/Admin accounts.');
} catch {
  results.push(`${transportFailed ? 'BLOCKED' : 'FAIL'}: ${stage}; ${transportFailed ? 'development transport unavailable or timed out' : 'assertion failed'}; no credentials logged.`);
} finally {
  for (const client of clients) {
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) {
      results.push('FAIL: local test-session logout');
    }
  }
}
return results;
}

if (!browserMode) {
  const logins = [];
  try {
    for (const label of ['Customer A', 'Customer B']) logins.push(await credentials(label));
    const results = await run(logins);
    console.log(results.join('\n'));
    if (results.some(result => /^(FAIL|BLOCKED):/.test(result))) process.exitCode = 1;
  } finally { for (const login of logins) login.password = ''; }
} else {
  // Local QA only: not part of Next.js, never deploy or expose on the network.
  const origin = 'http://127.0.0.1:3004';
  const csrf = randomBytes(24).toString('hex');
  let busy = false;
  const form = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Identity QA local</title><main><h1>Kiểm thử Identity — chỉ local</h1><p>Chỉ dùng Customer development đã xác nhận email. Mật khẩu/JWT không lưu vào file hoặc log. Không tạo tài khoản, nâng quyền hay khóa tài khoản.</p><form method="post" action="/run" autocomplete="off"><input type="hidden" name="csrf" value="${csrf}"><fieldset><legend>Customer 1 (bắt buộc)</legend><label>Email <input type="email" name="email1" required></label><label>Mật khẩu <input type="password" name="password1" required autocomplete="off"></label></fieldset><fieldset><legend>Customer 2 (tùy chọn, cần cho A/B)</legend><label>Email <input type="email" name="email2"></label><label>Mật khẩu <input type="password" name="password2" autocomplete="off"></label></fieldset><button>Chạy kiểm thử JWT</button></form><pre role="status" aria-live="polite"></pre></main><script nonce="${csrf}">
const form = document.querySelector('form');
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button');
  const status = document.querySelector('pre');
  const body = new URLSearchParams(new FormData(form));
  form.querySelectorAll('input[type=password]').forEach(input => { input.value = ''; });
  button.disabled = true;
  status.textContent = 'Đang kiểm thử, không bấm lại…';
  try {
    const response = await fetch('/run', { method: 'POST', body, credentials: 'omit' });
    status.textContent = await response.text();
  } catch { status.textContent = 'BLOCKED: local QA connection failed.'; }
  finally { button.disabled = false; }
});
</script></html>`;
  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', `default-src 'none'; connect-src 'self'; script-src 'nonce-${csrf}'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`);
    const reply = (status, text, type = 'text/plain; charset=utf-8') => {
      response.writeHead(status, { 'Content-Type': type }); response.end(text);
    };
    if (request.headers.host !== '127.0.0.1:3004') return reply(403, 'Forbidden');
    if (request.method === 'GET' && request.url === '/') return reply(200, form, 'text/html; charset=utf-8');
    if (request.method !== 'POST' || request.url !== '/run') return reply(404, 'Not found');
    if (request.headers.origin !== origin || !request.headers['content-type']?.startsWith('application/x-www-form-urlencoded')) return reply(403, 'Forbidden');
    if (busy) return reply(409, 'A test is already running. Do not retry.');
    let body = '';
    const logins = [];
    try {
      for await (const chunk of request) {
        body += chunk.toString();
        if (body.length > 4096) return reply(413, 'Payload too large');
      }
      const fields = new URLSearchParams(body);
      body = '';
      if (fields.get('csrf') !== csrf) return reply(403, 'Forbidden');
      for (const index of [1, 2]) {
        const email = fields.get(`email${index}`)?.trim() || '';
        const password = fields.get(`password${index}`) || '';
        if (!email && !password && index === 2) continue;
        if (!email || password.length < 8 || password.length > 128) return reply(400, 'Valid account credentials required');
        logins.push({ email, password });
      }
      busy = true;
      console.log('RUN: Customer JWT checks (no credentials logged)');
      const results = await run(logins);
      console.log(results.join('\n'));
      reply(200, results.join('\n'));
    } catch { reply(500, 'Test runner failed; no credentials logged.'); }
    finally { body = ''; for (const login of logins) login.password = ''; busy = false; }
  });
  server.listen(3004, '127.0.0.1', () => console.log(`Local-only Identity QA: ${origin}`));
}

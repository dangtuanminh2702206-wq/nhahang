import { createServer } from 'node:http';
import pg from 'pg';

// Isolated UI bridge: synthetic Auth, real PostgreSQL RLS/RPC. Never a cloud provider.
const connection = new URL(process.env.TEST_DATABASE_URL || '');
if (!['postgres:', 'postgresql:'].includes(connection.protocol)
  || !['127.0.0.1', 'localhost', '[::1]'].includes(connection.hostname)
  || !/^\/mocvi_test_[a-z0-9_]+$/.test(connection.pathname) || connection.search) {
  throw new Error('Requires loopback mocvi_test_* database');
}
const pool = new pg.Pool({ connectionString: connection.href, max: 5, statement_timeout: 15000 });
const schema = await pool.query("select column_name from information_schema.columns where table_schema='auth' and table_name='users'");
if (schema.rows.length !== 1 || schema.rows[0].column_name !== 'id') {
  throw new Error('Requires the minimal synthetic Auth schema from test:db');
}
const identities = ['admin-a', 'admin-b', 'customer', 'staff'].map((name, index) => ({
  id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  email: `${name}@qa.example.invalid`, name: `ROLE UI QA ${name}`,
  role: name.startsWith('admin') ? 'admin' : name,
}));
// Establish a controlled local baseline; do not modify existing fixture identities.
for (const identity of identities) {
  await pool.query('insert into auth.users(id) values($1) on conflict do nothing', [identity.id]);
  await pool.query('update public.profiles set full_name=$2,role=$3,is_active=true where id=$1', [identity.id, identity.name, identity.role]);
}
function user(identity) {
  return { id: identity.id, email: identity.email, aud: 'authenticated', role: 'authenticated',
    email_confirmed_at: '2026-10-04T00:00:00Z', app_metadata: { provider: 'email' }, user_metadata: {}, identities: [] };
}
const tokens = new Map(identities.map(identity => {
  const now = Math.floor(Date.now() / 1000);
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: identity.id, aud: 'authenticated', role: 'authenticated', iat: now, exp: now + 7200 })).toString('base64url')}.synthetic-only`;
  return [token, identity];
}));
function reply(response, value, status = 200) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}
async function body(request) {
  const chunks = []; let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 8192) throw new Error('BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}
async function asActor(identity, operation) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(`set local role ${identity ? 'authenticated' : 'anon'}`);
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [identity?.id || '']);
    const result = await operation(client);
    await client.query('commit'); return result;
  } catch (error) { await client.query('rollback'); throw error; }
  finally { client.release(); }
}
const tables = new Set(['profiles', 'restaurant_settings', 'business_hours', 'closure_dates', 'areas', 'tables', 'menu_categories', 'menu_items', 'audit_logs', 'bookings']);
const outcomes = [];
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1:54322');
    const identity = tokens.get((request.headers.authorization || '').replace(/^Bearer /i, ''));
    if (url.pathname === '/auth/v1/token' && request.method === 'POST') {
      const input = await body(request);
      const entry = [...tokens].find(([, item]) => item.email === input.email);
      if (!entry || input.password !== 'LOCAL-QA-ONLY') return reply(response, { code: 'invalid_credentials' }, 401);
      return reply(response, { access_token: entry[0], refresh_token: 'synthetic-only', expires_in: 7200, token_type: 'bearer', user: user(entry[1]) });
    }
    if (url.pathname === '/auth/v1/user') return reply(response, identity ? user(identity) : { code: 'invalid_token' }, identity ? 200 : 401);
    if (url.pathname === '/auth/v1/logout') return reply(response, {});
    if (url.pathname === '/qa/status' && request.method === 'GET') {
      const state = await pool.query("select full_name,role,is_active from public.profiles where id = any($1::uuid[]) order by full_name", [identities.map(item => item.id)]);
      const audits = await pool.query("select count(*)::int as count from public.audit_logs where entity_type='profile' and entity_id = any($1::uuid[])", [identities.map(item => item.id)]);
      return reply(response, { syntheticAuth: true, database: 'isolated', profiles: state.rows, audits: audits.rows[0].count, outcomes });
    }
    if (url.pathname === '/rest/v1/rpc/admin_update_profile' && request.method === 'POST') {
      const input = await body(request);
      if (!identities.some(item => item.id === input.p_id)) return reply(response, { message: 'Only ROLE UI QA targets are allowed' }, 403);
      try {
        const result = await asActor(identity, client => client.query('select * from public.admin_update_profile($1,$2,$3,$4,$5)', [input.p_id, input.p_role, input.p_is_active, input.p_expected, input.p_reason]));
        outcomes.push({ operation: 'update_access', result: 'PASS' });
        return reply(response, result.rows[0]);
      } catch (error) {
        outcomes.push({ operation: 'update_access', result: error.message });
        return reply(response, { code: error.code, message: error.message }, error.code === '42501' ? 403 : 409);
      }
    }
    const table = url.pathname.replace('/rest/v1/', '');
    if (request.method === 'GET' && tables.has(table)) {
      const rows = await asActor(identity, async client => {
        const result = await client.query(`select * from public.${table}`);
        let filtered = result.rows;
        for (const [column, expression] of url.searchParams) {
          if (!/^[a-z_]+$/.test(column) || ['select', 'order', 'limit', 'offset'].includes(column)) continue;
          if (expression.startsWith('eq.')) filtered = filtered.filter(row => String(row[column]) === expression.slice(3));
          if (expression.startsWith('gte.')) filtered = filtered.filter(row => new Date(row[column]) >= new Date(expression.slice(4)));
          if (expression.startsWith('lt.')) filtered = filtered.filter(row => new Date(row[column]) < new Date(expression.slice(3)));
        }
        const offset = Number(url.searchParams.get('offset') || 0);
        return filtered.slice(offset, offset + Number(url.searchParams.get('limit') || 500));
      });
      const single = request.headers.accept?.includes('vnd.pgrst.object') || (table === 'profiles' && url.searchParams.has('id'));
      return reply(response, single ? rows[0] || null : rows);
    }
    return reply(response, { message: 'Isolated role UI bridge does not support this endpoint' }, 404);
  } catch { return reply(response, { message: 'Isolated bridge request failed' }, 500); }
});
server.listen(54322, '127.0.0.1', () => console.log('Role UI bridge: loopback 54322; synthetic Auth, isolated SQL RLS/RPC.'));
const shutdown = () => server.close(async () => { await pool.end(); process.exit(0); });
process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);

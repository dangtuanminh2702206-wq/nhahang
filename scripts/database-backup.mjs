import assert from 'node:assert/strict';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { readFile, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const magic = Buffer.from('MOCVI-BACKUP-1\n');
const maxBytes = 256 * 1024 * 1024;
const repo = fileURLToPath(new URL('..', import.meta.url));

export function keyBytes(value) {
  assert(typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value), 'Set a separate 32-byte hex DATABASE_BACKUP_KEY');
  return Buffer.from(value, 'hex');
}

export function encryptBackup(data, key) {
  assert(data.length > 0 && data.length <= maxBytes, 'Backup size is outside the supported bounds');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(magic);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([magic, iv, cipher.getAuthTag(), encrypted]);
}

export function decryptBackup(data, key) {
  assert(data.length > magic.length + 28 && data.length <= maxBytes + 100, 'Invalid backup size');
  assert(data.subarray(0, magic.length).equals(magic), 'Invalid backup format');
  const iv = data.subarray(magic.length, magic.length + 12);
  const tag = data.subarray(magic.length + 12, magic.length + 28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(magic);
  decipher.setAuthTag(tag);
  // Authentication must finish before any restore process is started.
  return Buffer.concat([decipher.update(data.subarray(magic.length + 28)), decipher.final()]);
}

export function connection(value, restore = false) {
  assert(value, 'Database connection is not configured');
  const url = new URL(value);
  assert(['postgres:', 'postgresql:'].includes(url.protocol), 'Use a PostgreSQL connection');
  assert(!url.search && !url.hash, 'Connection overrides are not allowed');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (restore) {
    assert(local && /^\/mocvi_test_[a-z0-9_]+$/.test(url.pathname), 'Restore accepts only loopback mocvi_test_* databases');
  } else if (!local) {
    assert(url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.com'), 'Backup accepts verified Supabase or loopback hosts only');
    assert(url.port !== '6543', 'Use a direct connection or session pooler, not transaction pooling');
    const ref = process.env.DATABASE_BACKUP_PROJECT_REF;
    assert(ref && (url.hostname === `db.${ref}.supabase.co` || decodeURIComponent(url.username) === `postgres.${ref}`), 'Backup connection does not match the configured project ref');
  }
  return {
    host: url.hostname.replace(/^\[|\]$/g, ''), port: Number(url.port || 5432),
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)), ssl: local ? false : { rejectUnauthorized: true },
    connectionTimeoutMillis: 15000, query_timeout: 15000,
  };
}

async function externalPath(filename, creating) {
  assert(path.isAbsolute(filename), 'Use an absolute backup path outside Git');
  const resolved = creating
    ? path.join(await realpath(path.dirname(filename)), path.basename(filename))
    : await realpath(filename);
  const relative = path.relative(await realpath(repo), resolved);
  assert(relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative), 'Backup files must stay outside the repository');
  for (let folder = path.dirname(resolved);;) {
    let tracked = false;
    try { await stat(path.join(folder, '.git')); tracked = true; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    assert(!tracked, 'Backup files must stay outside all Git worktrees');
    const parent = path.dirname(folder);
    if (parent === folder) break;
    folder = parent;
  }
  assert(resolved.endsWith('.mocvi.enc'), 'Use the .mocvi.enc extension');
  return resolved;
}

async function runTool(name, config, args, input) {
  assert(process.env.PG_TOOLS_DIR && path.isAbsolute(process.env.PG_TOOLS_DIR), 'Configure PG_TOOLS_DIR with trusted PostgreSQL client binaries');
  const executable = path.join(process.env.PG_TOOLS_DIR, `${name}${process.platform === 'win32' ? '.exe' : ''}`);
  assert((await stat(executable)).isFile(), 'PostgreSQL client executable is missing');
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PGHOST: config.host, PGPORT: String(config.port), PGUSER: config.user,
        PGPASSWORD: config.password, PGDATABASE: config.database, PGSSLMODE: config.ssl ? 'verify-full' : 'disable',
        PGCONNECT_TIMEOUT: '15', PGOPTIONS: '-c statement_timeout=120000' },
    });
    const chunks = []; let size = 0; let failed = false;
    const timeout = setTimeout(() => { failed = true; child.kill(); }, 180000);
    child.stdout.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) { failed = true; child.kill(); } else chunks.push(chunk);
    });
    // Provider output may contain sensitive row values or connection details.
    child.stderr.resume();
    child.stdin.on('error', () => {});
    child.on('error', () => { clearTimeout(timeout); reject(new Error('PostgreSQL client could not start')); });
    child.on('close', code => {
      clearTimeout(timeout);
      if (failed || code !== 0) reject(new Error('PostgreSQL client failed, exceeded size bounds or timed out; no success is recorded'));
      else resolve(Buffer.concat(chunks));
    });
    child.stdin.end(input);
  });
}

async function main() {
  const [mode, filename] = process.argv.slice(2);
  assert(['export', 'restore-local'].includes(mode) && filename, 'Usage: database-backup.mjs export|restore-local ABSOLUTE_FILE.mocvi.enc');
  const key = keyBytes(process.env.DATABASE_BACKUP_KEY);
  if (mode === 'export') {
    const output = await externalPath(filename, true);
    const config = connection(process.env.DATABASE_BACKUP_URL);
    const client = new pg.Client(config);
    let version;
    try { await client.connect(); version = (await client.query('show server_version_num')).rows[0].server_version_num; }
    finally { await client.end(); }
    const dump = await runTool('pg_dump', config, ['--format=custom', '--no-password']);
    assert(dump.subarray(0, 5).toString() === 'PGDMP', 'Expected a PostgreSQL custom archive');
    await writeFile(output, encryptBackup(dump, key), { flag: 'wx', mode: 0o600 });
    dump.fill(0);
    console.log(JSON.stringify({ status: 'EXPORTED', serverVersion: version, scope: 'database only; Storage files and cloud settings excluded' }));
  } else {
    const config = connection(process.env.TEST_DATABASE_URL, true);
    const input = await externalPath(filename, false);
    assert((await stat(input)).size <= maxBytes + 100, 'Encrypted archive exceeds supported size');
    const dump = decryptBackup(await readFile(input), key);
    assert(dump.subarray(0, 5).toString() === 'PGDMP', 'Expected a PostgreSQL custom archive');
    const client = new pg.Client(config);
    try {
      await client.connect();
      const result = await client.query("select count(*)::int n from pg_namespace where nspname !~ '^pg_' and nspname not in ('public','information_schema')");
      assert(result.rows[0].n === 0, 'Restore target must be an empty plain PostgreSQL database');
      assert((await client.query("select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'")).rows[0].n === 0, 'Restore target public schema must be empty');
    } finally { await client.end(); }
    try { await runTool('pg_restore', config, ['--no-password', '--no-owner', '--exit-on-error', '--single-transaction', '--dbname', config.database], dump); }
    finally { dump.fill(0); }
    console.log('RESTORED LOCAL: compare schema, grants, row counts and business invariants separately; this is not Supabase platform recovery acceptance');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('BACKUP/RESTORE NOT COMPLETED: verify protected configuration, tool versions, connection and empty isolated target. Sensitive diagnostics are suppressed.'); process.exitCode = 1; });
}

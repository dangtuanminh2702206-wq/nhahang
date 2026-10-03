import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import { readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encryptBackup, decryptBackup } from './database-backup.mjs';

const magic = Buffer.from('MOCVI-RECOVERY-KEY-1\n');
function derive(passphrase,salt) {
  assert(typeof passphrase === 'string' && passphrase.length >= 16 && passphrase.length <= 1024,'Use a separate strong recovery passphrase');
  return scryptSync(passphrase,salt,32,{N:32768,r:8,p:1,maxmem:64*1024*1024});
}
export function wrapKey(key,passphrase) {
  assert(Buffer.isBuffer(key) && key.length===32);
  const salt=randomBytes(16), derived=derive(passphrase,salt);
  try { return Buffer.concat([magic,salt,encryptBackup(key,derived)]); }
  finally { derived.fill(0); }
}
export function unwrapKey(envelope,passphrase) {
  assert(envelope.length<1024 && envelope.subarray(0,magic.length).equals(magic));
  const derived=derive(passphrase,envelope.subarray(magic.length,magic.length+16));
  try { const key=decryptBackup(envelope.subarray(magic.length+16),derived); assert(key.length===32); return key; }
  finally { derived.fill(0); }
}
async function main() {
  const target=process.argv[2];
  assert(target && path.isAbsolute(target));
  let dir=await realpath(path.dirname(target));
  for (;;) {
    let git=false;
    try { await realpath(path.join(dir,'.git')); git=true; } catch(error) { if(error.code!=='ENOENT') throw error; }
    assert(!git,'Recovery key must stay outside Git');
    const parent=path.dirname(dir); if(parent===dir) break; dir=parent;
  }
  let input='';
  for await (const chunk of process.stdin) { input+=chunk; assert(input.length<8192); }
  const value=JSON.parse(input), key=Buffer.from(value.key,'hex');
  const envelope=wrapKey(key,value.passphrase);
  const checked=unwrapKey(envelope,value.passphrase);
  assert(checked.equals(key)); checked.fill(0); key.fill(0);
  await writeFile(target,envelope,{flag:'wx',mode:0o600});
  assert((await readFile(target)).equals(envelope));
  console.log('Portable recovery key encrypted, round-trip verified. Keep the passphrase separate from OneDrive.');
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main().catch(()=>{console.error('Recovery key export failed; sensitive diagnostics suppressed');process.exitCode=1;});
}

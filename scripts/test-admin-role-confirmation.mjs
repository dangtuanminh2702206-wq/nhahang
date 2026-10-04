import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

// Event-level component regression; browser + isolated SQL evidence is separate.
const states = []; let cursor = 0; let requests = 0; let refreshes = 0; let failure = false;
class Trigger { focus() { this.focused = true; } }
class FixtureFormData {
  constructor(form) { this.values = { ...form.values }; }
  entries() { return Object.entries(this.values); }
  get(key) { return this.values[key] ?? null; }
}
const source = await readFile(new URL('../src/components/admin-console.tsx', import.meta.url), 'utf8');
const exports = {};
const jsx = (type, props) => ({ type, props });
const modules = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react': { useState: initial => {
    const slot = cursor++;
    if (!(slot in states)) states[slot] = initial;
    return [states[slot], value => { states[slot] = value; }];
  } },
  'next/link': { default: 'a' },
  'next/navigation': { useRouter: () => ({ refresh: () => { refreshes++; } }) },
};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
} }).outputText, { exports, FormData: FixtureFormData, HTMLElement: Trigger, Intl,
  requestAnimationFrame: callback => callback(),
  window: { confirm: () => { throw new Error('Profile confirmation must not use native dialog'); } },
  fetch: async (path, options) => {
    requests++; assert.equal(path, '/api/admin');
    const payload = JSON.parse(options.body);
    assert.equal(payload.action, 'profile'); assert.equal(payload.role, 'staff');
    assert.equal(payload.isActive, false); assert.equal(payload.reason, 'ROLE UI QA');
    assert.deepEqual(payload.expected, { role: 'customer', is_active: true });
    return { ok: !failure, json: async () => ({ message: 'Conflict: reload before retry' }) };
  },
  require: name => { assert.ok(name in modules, `Unexpected module ${name}`); return modules[name]; },
});
const snapshot = { settings: { name: 'QA', timezone: 'Asia/Ho_Chi_Minh' }, hours: [], closures: [], areas: [], tables: [], categories: [], menuItems: [], audits: [], bookings: [], profiles: [{ id: 'qa', full_name: 'ROLE UI QA', role: 'customer', is_active: true }] };
function render() { cursor = 0; return exports.AdminConsole({ snapshot, range: { from: '2026-10-04', to: '2026-10-04' } }); }
function elements(node) {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  if (typeof node !== 'object' || !node.props) return [];
  return [node, ...elements(node.props.children)];
}
function button(tree, label) { return elements(tree).find(node => node.type === 'button' && node.props.children === label); }
const trigger = new Trigger();
const form = { values: { id: 'qa', role: 'staff', reason: 'ROLE UI QA' } };
const event = { preventDefault() {}, currentTarget: form, nativeEvent: { submitter: trigger } };
let tree = render();
const submit = elements(tree).find(node => node.type === 'form' && node.props.id === 'profile-qa').props.onSubmit;
await submit(event);
assert.equal(requests, 0, 'Preparing confirmation must not mutate');
tree = render();
assert.ok(elements(tree).find(node => node.props.role === 'group' && node.props['aria-label'] === 'Xác nhận quyền ROLE UI QA'));
button(tree, 'Hủy thay đổi').props.onClick();
assert.equal(requests, 0); assert.equal(trigger.focused, true);
tree = render();
await elements(tree).find(node => node.type === 'form' && node.props.id === 'profile-qa').props.onSubmit(event);
tree = render();
form.values.role = 'admin'; // Confirm the captured payload, not subsequently changed fields.
await button(tree, 'Xác nhận cập nhật quyền').props.onClick();
assert.equal(requests, 1); assert.equal(refreshes, 1);
assert.equal(button(render(), 'Xác nhận cập nhật quyền'), undefined);
failure = true; form.values.role = 'staff';
tree = render();
await elements(tree).find(node => node.type === 'form' && node.props.id === 'profile-qa').props.onSubmit(event);
await button(render(), 'Xác nhận cập nhật quyền').props.onClick();
assert.equal(requests, 2); assert.equal(refreshes, 1);
assert.ok(elements(render()).some(node => node.props.role === 'alert' && node.props.children === 'Conflict: reload before retry'));
console.log('PASS Admin role confirmation: explicit confirm/cancel, immutable payload, no pre-confirm request, focus return, refresh and conflict feedback. Synthetic component events; not browser/JWT evidence.');

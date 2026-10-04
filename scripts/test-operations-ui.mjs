import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

// Presentation contract only; does not certify Auth, RLS or browser layout.
const source = await readFile(new URL('../src/components/operations-nav.tsx', import.meta.url), 'utf8');
let pathname = '/staff';
const exports = {};
const jsx = (type, props) => ({ type, props });
const modules = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'next/link': { default: 'a' },
  'next/navigation': { usePathname: () => pathname },
};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText, { exports, require: name => {
  assert.ok(name in modules, `Unexpected navigation dependency: ${name}`);
  return modules[name];
} });
function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node?.props) return [];
  return [node, ...nodes(node.props.children)];
}
for (const [area, route, active] of [
  ['staff', '/staff', '/staff'],
  ['staff', '/staff/bookings/fixture', '/staff'],
  ['admin', '/admin', '/admin'],
  ['admin', '/admin/combos', '/admin/combos'],
]) {
  pathname = route;
  const tree = exports.OperationsNav({ area });
  assert.equal(tree.type, 'nav');
  assert.ok(tree.props['aria-label']);
  const links = nodes(tree).filter(node => node.type === 'a');
  const current = links.filter(node => node.props['aria-current'] === 'page');
  assert.equal(current.length, 1);
  assert.equal(current[0].props.href, active);
  assert.ok(links.every(node => node.props.children && node.props.href.startsWith('/')));
  if (area === 'staff') assert.ok(links.every(node => !node.props.href.startsWith('/admin')));
}
const admin = await readFile(new URL('../src/components/admin-console.tsx', import.meta.url), 'utf8');
assert.match(admin, /aria-label="Nhóm chức năng quản trị"/);
assert.match(admin, /className="admin-table-wrap" tabIndex=\{0\} role="region"/);
const css = await readFile(new URL('../src/components/operations-shell.module.css', import.meta.url), 'utf8');
assert.match(css, /\.workspace :global\(/);
assert.ok(!css.includes(':global(body)') && !css.includes(':global(html)'));
const account = await readFile(new URL('../src/components/account-control.tsx', import.meta.url), 'utf8');
assert.match(account, /<details className="account-menu" key=\{pathname\}>/);
assert.match(account, /nav aria-label="Tài khoản của tôi"/);
console.log('PASS operations presentation: labelled links, current route, Staff navigation, scrollable table focus, scoped styles and native account disclosure. Not JWT/SQL evidence.');

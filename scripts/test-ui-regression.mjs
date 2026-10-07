import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const jsx = (type, props, key) => ({ type, props, key });
async function load(file, modules = {}, globals = {}) {
  const exports = {};
  const source = await readFile(new URL('../' + file, import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, Intl, process, ...globals, require(name) { assert(name in modules, name); return modules[name]; } });
  return exports;
}
function harness() {
  let cursor = 0; const states = [];
  return { reset() { cursor = 0; }, unmount() { states.length = 0; cursor = 0; }, modules: {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: { Suspense: 'Suspense', useCallback: fn => fn,
      useState(initial) { const slot = cursor++; if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial;
        return [states[slot], next => { states[slot] = typeof next === 'function' ? next(states[slot]) : next; }]; },
      useRef(initial) { const slot = cursor++; if (!(slot in states)) states[slot] = { current: initial }; return states[slot]; } },
    'next/link': { default: 'a' }, 'next/navigation': { useRouter: () => ({ refresh() {} }) },
  } };
}
function nodes(n) { if (Array.isArray(n)) return n.flatMap(nodes); return n?.props ? [n, ...nodes(n.props.children)] : []; }
const data = await load('src/data/restaurant.ts');
const label = await load('src/lib/floor-label.ts');
assert.equal(label.floorLabel(1, 'Mộc Gia'), 'Tầng 1 · Mộc Gia');
assert.equal(label.floorLabel(1, 'Tầng 1 · Mộc Gia'), 'Tầng 1 · Mộc Gia');
assert.equal(label.floorLabel(2, 'Khu họp mặt'), 'Tầng 2 · Khu họp mặt');

const staff = harness();
const board = await load('src/components/staff-table-board.tsx', { ...staff.modules, '@/components/floor-plan': { FloorPlan: 'FloorPlan' }, '@/data/restaurant': data });
const live = [{ id: 'fixture', code: 'T1-B01', capacity: 3, description: 'Live description', status: 'available', is_active: true },
  { id: 'hidden', code: 'T1-B02', capacity: 2, description: 'Hidden', status: 'available', is_active: false }];
const floor = nodes(board.StaffTableBoard({ initialTables: live })).find(n => n.type === 'FloorPlan').props.floor;
assert.equal(floor.tables.length, 1); assert.equal(floor.tables[0].capacity, 3); assert.equal(floor.tables[0].position, 'Live description');
assert.equal(floor.tables[0].planX, data.restaurantFloors[0].tables[0].planX);
staff.reset();
assert.equal(nodes(board.StaffTableBoard({ initialTables: [] })).find(n => n.type === 'FloorPlan').props.floor.tables.length, 0);

const h = harness(); let payload;
const panel = await load('src/components/customer-order-panel.tsx', { ...h.modules, '@/lib/order-shared': { orderStatusLabel: s => s } },
  { crypto: { randomUUID: () => 'fixture-key' }, fetch: async (_url, options) => { payload = JSON.parse(options.body); return { ok: true, json: async () => ({ order: { status: 'pending' } }) }; } });
const snapshot = (version, quantity) => ({ id: 'order', version, status: 'pending', total_amount: quantity * 89000, history: [],
  items: [{ id: 'line', item_type: 'dish', item_code: 'MV-KV01', item_name: 'Fixture', quantity, unit_price: 89000, line_total: quantity * 89000 }] });
const props = { bookingId: 'booking', bookingStatus: 'confirmed', enabled: true, catalogue: [{ kind: 'dish', code: 'MV-KV01', name: 'Fixture', price: 89000, available: true }] };
const v1 = panel.CustomerOrderPanel({ ...props, initialOrder: snapshot(1, 1) });
let tree = v1.type(v1.props);
nodes(tree).find(n => n.type === 'input').props.onChange({ target: { value: '3' } });
h.reset(); tree = v1.type(v1.props);
assert.equal(nodes(tree).find(n => n.type === 'input').props.value, 3, 'Unchanged version retains edits');
const v2 = panel.CustomerOrderPanel({ ...props, initialOrder: snapshot(2, 2) });
assert.notEqual(v1.key, v2.key, 'New server version must remount the draft');
h.unmount(); tree = v2.type(v2.props);
assert.equal(nodes(tree).find(n => n.type === 'input').props.value, 2);
await nodes(tree).find(n => n.type === 'button' && n.props.children === 'Cập nhật đơn món').props.onClick();
assert.equal(payload.expectedVersion, 2); assert.equal(payload.items[0].quantity, 2);
const newBooking = panel.CustomerOrderPanel({ ...props, bookingId: 'other-booking', initialOrder: null });
assert.notEqual(v2.key, newBooking.key);

const reservation = harness();
const preview = await load('src/components/reservation-preview.tsx', { ...reservation.modules, '@/components/floor-plan': { FloorPlan: 'FloorPlan' },
  '@/components/reservation-query-selection': { ReservationQuerySelection: 'QuerySelection' }, '@/data/restaurant': data, '@/lib/floor-label': label });
const liveFloors = data.restaurantFloors.map(f => ({ ...f, name: `Tầng ${f.level} · ${f.name}` }));
const liveTree = preview.ReservationPreview({ demo: false, mutationsEnabled: true, floors: liveFloors });
assert(!JSON.stringify(liveTree).includes('Dữ liệu thử')); assert(!JSON.stringify(liveTree).includes('Khách demo'));
assert.equal(nodes(liveTree).find(n => n.type === 'input' && n.props.name === 'name').props.placeholder, 'Họ và tên của bạn');
assert.equal(nodes(liveTree).find(n => n.type === 'option' && n.props.value === 'floor-1').props.children, 'Tầng 1 · Mộc Gia');
reservation.unmount();
assert(JSON.stringify(preview.ReservationPreview({ demo: true })).includes('Dữ liệu thử'), 'Pages must retain demo distinction');
console.log('PASS synthetic UI regressions: Staff live capacity/description/active/empty; version-keyed order draft; live/demo copy and floor labels. NOT browser/JWT/SQL integration.');

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

async function loadData(name) {
  const source = await readFile(new URL(`../src/data/${name}.ts`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, Intl, Error });
  return exports;
}
const { tablePlanImages } = await loadData('table-plans');
const { restaurantFloors } = await loadData('restaurant');
const sharp = createRequire(import.meta.resolve('next'))('sharp');
let count = 0;
for (const floor of restaurantFloors) {
  const plan = tablePlanImages[floor.slug];
  assert.ok(plan);
  assert.deepEqual(Object.keys(plan.hotspots).sort(), Array.from(floor.tables, table => table.code).sort());
  const image = sharp(`public${plan.path}`);
  const metadata = await image.metadata();
  assert.equal(metadata.width, plan.width);
  assert.equal(metadata.height, plan.height);
  await image.raw().toBuffer();
  for (const [x, y] of Object.values(plan.hotspots)) {
    assert.ok(x >= 6 && x <= 94 && y >= 7.5 && y <= 92.5, 'Entire hotspot fits image');
    count++;
  }
}
assert.equal(count, 22);
console.log('PASS: 3 decoded table-plan images; 22 unique canonical hotspots; dimensions and bounds. Browser interaction tested separately.');

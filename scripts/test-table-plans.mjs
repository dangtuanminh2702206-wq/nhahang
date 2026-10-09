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
const { getImageProps } = createRequire(import.meta.resolve('next'))('next/image');
const source = await readFile(new URL('../src/components/floor-plan.tsx', import.meta.url), 'utf8');
const component = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
  exports: component, process, require(name) {
    const jsx = (type, props) => ({ type, props });
    return { react: { useState: value => [value, () => {}] }, 'react/jsx-runtime': { jsx, jsxs: jsx },
      'next/image': { default: 'image' }, 'next/link': { default: 'link' }, '@/data/table-plans': { tablePlanImages } }[name];
  },
});
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n?.props ? [n, ...nodes(n.props.children)] : []; }
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
  const wrapper = component.FloorPlan({ floor });
  const tree = wrapper.type(wrapper.props);
  const rendered = nodes(tree);
  const img = rendered.find(n => n.type === 'image').props;
  assert.equal(img.unoptimized, true, 'Keep original lossless plan pixels');
  const { props } = getImageProps(img);
  assert.equal(props.src, `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${plan.path}`);
  assert.equal(props.srcSet, undefined, 'No resized/lossy optimization candidates');
  const canvas = rendered.find(n => n.props.className === 'floor-plan-canvas floor-plan-image');
  assert.equal(canvas.props.style.maxWidth, metadata.width, 'Do not stretch beyond native width');
  for (const [x, y] of Object.values(plan.hotspots)) {
    assert.ok(x >= 6 && x <= 94 && y >= 7.5 && y <= 92.5, 'Entire hotspot fits image');
    count++;
  }
}
assert.equal(count, 22);
console.log('PASS: 3 decoded original-resolution plans without lossy optimization/upscaling; 22 canonical hotspots; dimensions and bounds. Browser interaction tested separately.');

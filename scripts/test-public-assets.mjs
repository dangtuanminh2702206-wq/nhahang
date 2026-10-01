import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';

// Read the same TypeScript catalogue as the UI; never maintain a second menu.
async function loadData(filename) {
  const source = await readFile(new URL(`../src/data/${filename}.ts`, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, Intl, Error });
  return exports;
}
const { restaurantFloors, restaurantMenu, menuCombos } = await loadData('restaurant');
const { restaurantMedia, getMenuImage, floorScenes } = await loadData('media');
const sharp = createRequire(import.meta.resolve('next'))('sharp');
const restaurantAssets = Object.values(restaurantMedia);
const dishes = restaurantMenu.map(item => getMenuImage(item.code, item.name));
const combos = menuCombos.map(item => getMenuImage(item.code, item.name, 'combo'));
const assets = [...restaurantAssets, ...dishes, ...combos];
const placements = [restaurantMedia.hero, restaurantMedia.exterior,
  ...restaurantFloors.map(floor => restaurantMedia[floor.slug]),
  ...restaurantFloors.map(floor => restaurantMedia[`isometric-${floor.slug}`]),
  ...Object.values(floorScenes).flatMap(scenes => scenes.map(scene => scene.asset))];
assert.equal(new Set(placements.map(asset => asset.path)).size, 16, 'All restaurant assets have existing placements');
assert.equal(restaurantAssets.length, 16);
assert.equal(dishes.length, 30);
assert.equal(combos.length, 4);
assert.equal(new Set(assets.map(asset => asset.path)).size, 50, 'Unique canonical paths');
const files = (await readdir('public/images', { recursive: true })).filter(file => file.endsWith('.webp'));
assert.equal(files.length, 50, 'No extra or missing canonical WebP');
assert.deepEqual(files.map(file => `/images/${file.replaceAll('\\', '/')}`).sort(), assets.map(asset => asset.path).sort());
for (const asset of assets) {
  const filename = path.join('public', asset.path);
  assert.ok((await stat(filename)).size > 0, asset.path);
  assert.ok(asset.alt.trim(), 'Meaningful image alt');
  const metadata = await sharp(filename).metadata();
  assert.equal(metadata.format, 'webp');
  assert.ok(metadata.width && metadata.height, 'Image dimensions');
  await sharp(filename).stats(); // Decode pixels, not just a filename/header check.
  if (process.env.PHASE3_ASSET_SOURCE_DIR) {
    const source = path.join(process.env.PHASE3_ASSET_SOURCE_DIR, asset.path.replace(/^\/images\//, ''));
    const hash = bytes => createHash('sha256').update(bytes).digest('hex');
    assert.equal(hash(await readFile(filename)), hash(await readFile(source)), 'Exact final-pack bytes');
  }
}
const expectedPositions = [
  [[18,22],[43,27],[69,22],[21,50],[49,47],[75,48],[30,73],[71,73]],
  [[20,75],[36,22],[72,23],[23,48],[49,47],[74,48],[40,73],[69,75]],
  [[18,22],[47,22],[76,23],[27,53],[58,52],[78,72]],
];
const expectedCapacities = [[2,2,4,4,4,4,6,6],[2,2,4,4,4,4,6,8],[2,2,4,4,6,8]];
const expectedDescriptions = [
  ['Gần cửa kính · Phù hợp cặp đôi','Khu trung tâm gần kính','Khu gia đình','Gần cây xanh','Giữa sảnh','Gần cầu thang · Không gian thoáng','Khu gia đình lớn','Gần cầu thang'],
  ['Góc yên tĩnh','Gần cửa kính','Khu nhóm bạn','Khu nhóm bạn','Giữa tầng','Bán riêng tư · Gần lõi thang','Khu họp mặt nhỏ','Khu nhóm lớn / công ty'],
  ['Ban công · Phù hợp cặp đôi','Khu rooftop','View thoáng','Khu ngoài trời · Gần vườn','Khu rooftop','Khu VIP · Riêng tư nhất'],
];
assert.equal(restaurantFloors.length, 3);
let seats = 0;
for (const [index, floor] of restaurantFloors.entries()) {
  assert.equal(floor.slug, `floor-${index + 1}`);
  assert.equal(floor.areaCode, floor.slug);
  assert.equal(floor.tables.length, expectedPositions[index].length);
  assert.equal(floor.tables.reduce((sum, table) => sum + table.capacity, 0), [32,34,26][index]);
  for (const [tableIndex, table] of floor.tables.entries()) {
    assert.equal(table.code, `T${index + 1}-B${String(tableIndex + 1).padStart(2, '0')}`);
    assert.equal(table.capacity, expectedCapacities[index][tableIndex]);
    assert.equal(table.planX, expectedPositions[index][tableIndex][0]);
    assert.equal(table.planY, expectedPositions[index][tableIndex][1]);
    assert.equal([table.position, table.note].filter(Boolean).join(' · '), expectedDescriptions[index][tableIndex]);
    assert.ok(table.nearbyLandmarks.every(label => floor.planLandmarks.some(landmark => landmark.label === label)));
    seats += table.capacity;
  }
  assert.ok(floorScenes[floor.slug].every(scene => restaurantAssets.some(asset => asset.path === scene.asset.path)));
}
assert.equal(restaurantFloors.flatMap(floor => floor.tables).length, 22);
assert.equal(seats, 92);
const floor1 = restaurantFloors[0].tables;
const anchor = floor1[4];
assert.ok(floor1[1].planY < anchor.planY && floor1[3].planX < anchor.planX && floor1[5].planX > anchor.planX);
assert.ok(floor1[6].planX < anchor.planX && floor1[6].planY > anchor.planY);
assert.ok(floor1[7].planX > anchor.planX && floor1[7].planY > anchor.planY);
console.log('PASS: 50 decoded WebP; 16 restaurant / 30 dishes / 4 combos; unique mappings; 3 floors / 22 tables / 92 seats; spatial spec and landmark metadata');

if (process.env.PUBLIC_CHECK_PAGES === 'true') {
  for (const asset of assets) assert.ok((await stat(path.join('.next-pages', asset.path))).size > 0, 'Exported asset exists');
  for (const route of ['', 'menu', 'spaces', 'spaces/floor-1', 'spaces/floor-2', 'spaces/floor-3', 'contact', 'reservation']) {
    const html = await readFile(path.join('.next-pages', route, 'index.html'), 'utf8');
    assert.ok(!/data-asset-status="(?:pending|error)"/.test(html), 'No canonical placeholder in export');
    for (const match of html.matchAll(/(?:src|href)="([^"<>]+)"/g)) {
      if (match[1].startsWith('/')) assert.ok(match[1].startsWith('/nhahang/'), 'Pages basePath');
    }
  }
  console.log('PASS: all 50 exported assets, 8 public Pages routes, canonical placeholders absent, /nhahang basePath');
}
if (process.env.PUBLIC_SMOKE_URL) {
  const origin = new URL(process.env.PUBLIC_SMOKE_URL);
  assert.ok(['127.0.0.1', 'localhost'].includes(origin.hostname), 'Local QA only');
  for (const route of ['/', '/menu', '/spaces', '/spaces/floor-1', '/spaces/floor-2', '/spaces/floor-3', '/contact', '/reservation', ...assets.map(asset => asset.path)]) {
    const response = await fetch(new URL(route, origin), { signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, route);
    if (route.endsWith('.webp')) assert.match(response.headers.get('content-type'), /image\/webp/);
  }
  console.log('PASS: 8 public routes and 50 local asset responses, no 404');
}

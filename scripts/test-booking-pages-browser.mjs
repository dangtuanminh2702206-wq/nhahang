import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';

if (typeof WebSocket === 'undefined') throw new Error('Browser smoke requires Node 22+ native WebSocket.');

const exportRoot = resolve('.next-pages');
await stat(join(exportRoot, 'reservation', 'index.html'));

function findBrowser() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  const candidates = process.platform === 'win32'
    ? ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe']
    : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return candidates.find(existsSync);
}

const executable = findBrowser();
if (!executable) throw new Error('Google Chrome/Chromium is required for the Pages hydration smoke.');

const mimeTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2',
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (!pathname.startsWith('/nhahang/')) { response.writeHead(404).end(); return; }
    let relative = pathname.slice('/nhahang/'.length);
    const routePayload = basename(relative).match(/^__next\.(.+)\.__PAGE__\.txt$/);
    if (routePayload) {
      const segments = routePayload[1].split('.');
      relative = join(dirname(relative), `__next.${segments.shift()}`, ...segments, '__PAGE__.txt');
    }
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    else if (!extname(relative)) relative += '/index.html';
    const file = resolve(exportRoot, relative);
    if (!file.startsWith(`${exportRoot}${sep}`)) { response.writeHead(404).end(); return; }
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': mimeTypes[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    response.writeHead(404).end();
  }
});

const tempProfile = await mkdtemp(join(tmpdir(), 'mocvi-pages-chrome-'));
let chrome;
let socket;
let nextId = 0;
const pending = new Map();
const requests = [];
const sameOriginFailures = [];
const runtimeErrors = [];

try {
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  const siteOrigin = `http://127.0.0.1:${address.port}`;
  let debugOutput = '';
  chrome = spawn(executable, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${tempProfile}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  chrome.stderr.setEncoding('utf8');
  chrome.stderr.on('data', chunk => { debugOutput += chunk; });
  const endpointDeadline = Date.now() + 15000;
  let debuggerPort;
  while (Date.now() < endpointDeadline && !debuggerPort) {
    debuggerPort = debugOutput.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//)?.[1];
    if (!debuggerPort) await new Promise(resolveWait => setTimeout(resolveWait, 100));
  }
  assert.ok(debuggerPort, `Chrome did not expose a local DevTools endpoint: ${debugOutput.slice(-500)}`);

  const debugOrigin = `http://127.0.0.1:${debuggerPort}`;
  const created = await fetch(`${debugOrigin}/json/new?about%3Ablank`, { method: 'PUT' });
  assert.equal(created.status, 200, 'Create an isolated headless page');
  const target = await created.json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener('open', resolveOpen, { once: true });
    socket.addEventListener('error', rejectOpen, { once: true });
  });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const callbacks = pending.get(message.id);
      if (callbacks) {
        clearTimeout(callbacks.timer);
        pending.delete(message.id);
        if (message.error) callbacks.reject(new Error(message.error.message));
        else callbacks.resolve(message.result);
      }
    }
    if (message.method === 'Network.requestWillBeSent') requests.push({ url: message.params.request.url, method: message.params.request.method });
    if (message.method === 'Network.responseReceived' && message.params.response.status >= 400 && message.params.response.url.startsWith(siteOrigin)) {
      sameOriginFailures.push({ status: message.params.response.status, url: message.params.response.url });
    }
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.text);
  });

  function send(method, params = {}) {
    const id = ++nextId;
    return new Promise((resolveCommand, rejectCommand) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        rejectCommand(new Error(`DevTools command timed out: ${method}`));
      }, 15000);
      pending.set(id, { resolve: resolveCommand, reject: rejectCommand, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  }
  async function waitFor(expression, message, timeoutMs = 12000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const value = await evaluate(expression);
      if (value) return value;
      await new Promise(resolveWait => setTimeout(resolveWait, 100));
    }
    throw new Error(`Timed out waiting for ${message}`);
  }
  async function navigate(path) {
    const url = `${siteOrigin}${path}`;
    await send('Page.navigate', { url });
    await waitFor(`location.href === ${JSON.stringify(url)} && document.readyState === "complete"`, `document load: ${path}`);
  }
  async function setViewport(width) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width <= 704 });
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  const floorBaselines = [
    { path: 'floor-1', tables: 8, seats: 32, anchor: 'T1-B05' },
    { path: 'floor-2', tables: 8, seats: 34, anchor: 'T2-B05' },
    { path: 'floor-3', tables: 6, seats: 26, anchor: 'T3-B05' },
  ];
  for (const floor of floorBaselines) {
    await navigate(`/nhahang/spaces/${floor.path}/`);
    await evaluate('document.querySelector(".floor-plan-section")?.scrollIntoView({ block: "center" })');
    await waitFor('(() => { const image = document.querySelector(".floor-plan-image img"); return image?.complete && image.naturalWidth > 0; })()', `${floor.path} table-plan image`);
    const baseline = await evaluate(`(() => ({
      heading: document.querySelector(".floor-hero .eyebrow")?.textContent ?? "",
      count: document.querySelectorAll(".table-image-hotspot").length,
      codes: [...document.querySelectorAll(".table-image-hotspot")].map(button => button.textContent.trim().replace(/\\s+/g, " ")),
      buttons: [...document.querySelectorAll(".table-image-hotspot")].every(button => button.tagName === "BUTTON" && button.hasAttribute("aria-label") && button.hasAttribute("aria-pressed")),
      imageWidth: document.querySelector(".floor-plan-image img")?.naturalWidth ?? 0,
    }))()`);
    assert.match(baseline.heading, new RegExp(`${floor.tables} bàn`));
    assert.equal(baseline.count, floor.tables);
    assert.ok(baseline.codes.some(label => label.includes(floor.anchor)));
    assert.ok(baseline.buttons, 'Hotspots remain semantic keyboard-operable buttons with names and selection state');
    assert.ok(baseline.imageWidth > 0);

    for (const width of [320, 704, 1024, 1600]) {
      await setViewport(width);
      const responsive = await evaluate(`(() => {
        const canvas = document.querySelector(".floor-plan-canvas");
        const buttons = [...document.querySelectorAll(".table-image-hotspot")];
        const bounds = canvas?.getBoundingClientRect();
        return {
          viewport: window.innerWidth,
          pageWidth: document.documentElement.scrollWidth,
          imageWidth: canvas?.querySelector("img")?.naturalWidth ?? 0,
          markersInside: !!bounds && buttons.every(button => {
            const rect = button.getBoundingClientRect();
            return rect.left >= bounds.left - 1 && rect.top >= bounds.top - 1 && rect.right <= bounds.right + 1 && rect.bottom <= bounds.bottom + 1;
          }),
          scrollRegion: getComputedStyle(document.querySelector(".floor-plan-scroll")).overflowX,
        };
      })()`);
      assert.equal(responsive.viewport, width);
      assert.ok(responsive.pageWidth <= width, `${floor.path} horizontal overflow at ${width}px`);
      assert.ok(responsive.imageWidth > 0 && responsive.markersInside, `${floor.path} image/hotspot bounds at ${width}px`);
      assert.match(responsive.scrollRegion, /auto|scroll/);
    }
  }

  await navigate('/nhahang/reservation/?floor=floor-3&table=T3-B06');
  await waitFor('document.querySelector("#preview-floor")?.value === "floor-3" && document.querySelector("#preview-table")?.value === "T3-B06"', 'hydrated deep-link selection');
  assert.ok(await evaluate('!!document.querySelector("form.reservation-form")'), 'Static form hydrates in browser');
  assert.equal(await evaluate('document.querySelector(".table-image-hotspot[aria-pressed=true]")?.textContent.includes("T3-B06")'), true);

  await navigate('/nhahang/reservation/?floor=floor-2&table=NOT-A-TABLE');
  await waitFor('document.querySelector("#preview-floor")?.value === "floor-2" && document.querySelector("#preview-table")?.value === "T2-B01"', 'safe fallback for unknown table');
  await navigate('/nhahang/reservation/?floor=NOT-A-FLOOR&table=T2-B07');
  await waitFor('document.querySelector("#preview-floor")?.value === "floor-1" && document.querySelector("#preview-table")?.value === "T1-B01"', 'safe fallback for unknown floor');

  await navigate('/nhahang/reservation/?floor=floor-2&table=T2-B01');
  await waitFor('document.querySelector("#preview-table")?.value === "T2-B01"', 'form initialization');
  await evaluate(`[...document.querySelectorAll(".table-image-hotspot")].find(button => button.textContent.includes("T2-B07"))?.click()`);
  await waitFor('document.querySelector("#preview-table")?.value === "T2-B07" && document.querySelector(".table-image-hotspot[aria-pressed=true]")?.textContent.includes("T2-B07")', 'image selection updates table select');

  await evaluate(`(() => {
    const select = document.querySelector("#preview-table");
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    setter.call(select, "T2-B06");
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await waitFor('document.querySelector(".table-image-hotspot[aria-pressed=true]")?.textContent.includes("T2-B06")', 'table select updates image selection');
  await evaluate('[...document.querySelectorAll(".table-image-hotspot")].find(button => button.textContent.includes("T2-B08"))?.focus()');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await waitFor('document.querySelector("#preview-table")?.value === "T2-B08"', 'keyboard Enter selection');

  await evaluate(`(() => {
    const set = (element, value, prototype) => {
      const setter = Object.getOwnPropertyDescriptor(prototype, "value").set;
      setter.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    };
    set(document.querySelector("#preview-date"), "2030-01-01", HTMLInputElement.prototype);
    set(document.querySelector("#preview-name"), "Khach QA UI", HTMLInputElement.prototype);
    set(document.querySelector("#preview-phone"), "0900000000", HTMLInputElement.prototype);
    [...document.querySelectorAll("button")].find(button => button.textContent.includes("Xem xác nhận mô phỏng"))?.click();
  })()`);
  await waitFor('document.querySelector(".preview-confirmation")?.textContent.includes("Tóm tắt lựa chọn")', 'demo confirmation interaction');
  await new Promise(resolveWait => setTimeout(resolveWait, 250));
  assert.equal(requests.some(request => request.method === 'POST' || request.url.includes('/api/bookings')), false, 'Demo interactions must not send booking requests');
  assert.deepEqual(sameOriginFailures, [], 'No exported route/image/runtime resource returned HTTP errors');
  assert.deepEqual(runtimeErrors, [], 'No uncaught browser runtime errors');
  console.log('PASS Pages browser smoke: 3 floor images, 22 canonical hotspots, 4 responsive widths, query and safe fallback, two-way selection, keyboard, hydrated demo confirmation, no booking request or browser errors.');
} finally {
  socket?.close();
  for (const callback of pending.values()) clearTimeout(callback.timer);
  if (chrome && chrome.exitCode === null) {
    await new Promise(resolveExit => {
      chrome.once('exit', resolveExit);
      chrome.kill('SIGTERM');
      setTimeout(resolveExit, 5000).unref();
    });
  }
  await new Promise(resolveClose => server.close(resolveClose));
  assert.ok(tempProfile.startsWith(join(tmpdir(), 'mocvi-pages-chrome-')), 'Cleanup only the generated isolated profile');
  await rm(tempProfile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}

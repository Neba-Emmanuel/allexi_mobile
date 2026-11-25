// Run against the isolated Chrome test session (debugging port 9222) and Expo web (8084).
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const target = targets.find((t) => t.type === "page");
assert.ok(target, "Open an isolated Chrome test session first");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => (socket.onopen = resolve));
let serial = 0;
const pending = new Map(),
  errors = [];
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown")
    errors.push(message.params.exceptionDetails.text);
  if (message.id) {
    pending.get(message.id)?.(message);
    pending.delete(message.id);
  }
};
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++serial;
    const timeout = setTimeout(
      () => reject(new Error(`Timeout: ${method}`)),
      15000,
    );
    pending.set(id, (message) => {
      clearTimeout(timeout);
      message.error
        ? reject(new Error(message.error.message))
        : resolve(message.result);
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function wait(expression) {
  for (let i = 0; i < 150; i++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  throw new Error(`UI did not become ready: ${expression}`);
}
async function screenshot(name) {
  const { data } = await call("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(`allexi_mobile/artifacts/${name}.png`, Buffer.from(data, "base64"));
}
const splash = `document.querySelector('[data-testid="animated-splash"]')`;
const wordmark = `document.querySelector('[data-testid="splash-wordmark"]')`;
const page = `document.querySelector('[data-testid="splash-left-page"]')`;

try {
  await mkdir("allexi_mobile/artifacts", { recursive: true });
  await call("Runtime.enable");
  await call("Page.enable");
  await call("Emulation.setDefaultBackgroundColorOverride", {
    color: { r: 255, g: 255, b: 255, a: 1 },
  });
  await call("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  await call("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await call("Page.navigate", {
    url: "http://localhost:8084/?splash-review=normal",
  });
  await wait(splash);
  const opening = await evaluate(`getComputedStyle(${page}).transform`);
  await wait(
    `${wordmark} && Number(getComputedStyle(${wordmark}).opacity) > 0.98`,
  );
  const opened = await evaluate(`getComputedStyle(${page}).transform`);
  assert.notEqual(opening, opened, "Book pages should animate open");
  await screenshot("splash-mobile");
  await wait(`!${splash}`);
  assert.ok(
    await evaluate(
      `document.body.innerText.includes('Enter the Scriptures') || document.body.innerText.includes('A quiet place for the Word.')`,
    ),
  );
  console.log(
    "Book opening, wordmark reveal and transition into the app passed.",
  );

  await call("Emulation.setDeviceMetricsOverride", {
    width: 320,
    height: 568,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await call("Page.navigate", {
    url: "http://localhost:8084/?splash-review=compact",
  });
  await wait(splash);
  await wait(
    `${wordmark} && Number(getComputedStyle(${wordmark}).opacity) > 0.98`,
  );
  assert.ok(
    await evaluate(`document.documentElement.scrollWidth <= 320`),
    "No compact-screen horizontal overflow",
  );
  await screenshot("splash-compact");
  await wait(`!${splash}`);
  console.log("Compact phone layout passed.");

  await call("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await call("Page.navigate", {
    url: "http://localhost:8084/?splash-review=reduced",
  });
  await wait(
    `location.search.includes('reduced') && document.readyState === 'complete'`,
  );
  assert.ok(
    await evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`),
  );
  const start = Date.now();
  await wait(
    `!${splash} && (document.body.innerText.includes('Enter the Scriptures') || document.body.innerText.includes('A quiet place for the Word.'))`,
  );
  assert.ok(
    Date.now() - start < 1800,
    "Reduced motion should skip the timed intro",
  );
  console.log("Reduce Motion skips the timed animation.");
  assert.deepEqual(errors, [], "No uncaught startup exceptions");
} finally {
  await call("Emulation.setEmulatedMedia", { features: [] });
  socket.close();
}

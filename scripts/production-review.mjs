// Run after admin-review.mjs against a fresh isolated fixture. Never targets real accounts.
// End-to-end acceptance against scripts/preview-admin.ts and the isolated Expo
// preview on 8091. These accounts and edits exist only in the temporary fixture.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const target =
  targets.find(
    (t) => t.type === "page" && t.url.startsWith("http://localhost:8091"),
  ) ?? targets.find((t) => t.type === "page");
assert.ok(target);
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (socket.onopen = r));
let serial = 0;
const pending = new Map(),
  exceptions = [];
socket.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.method === "Runtime.exceptionThrown")
    exceptions.push(
      m.params.exceptionDetails.exception?.description ??
        m.params.exceptionDetails.text,
    );
  if (m.id) {
    pending.get(m.id)?.(m);
    pending.delete(m.id);
  }
};
const call = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++serial,
      timeout = setTimeout(
        () => reject(new Error(`Timeout: ${method}`)),
        20000,
      );
    pending.set(id, (m) => {
      clearTimeout(timeout);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
async function evaluate(expression) {
  const result = await call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text,
    );
  return result.result.value;
}
const has = (text) =>
  `document.body.innerText.includes(${JSON.stringify(text)})`;
async function wait(expression) {
  for (let i = 0; i < 200; i++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((r) => setTimeout(r, 60));
  }
  throw new Error(`UI not ready: ${expression}`);
}
async function click(label) {
  const q = JSON.stringify(label);
  const count = await evaluate(
    `(()=>{const rows=[...document.querySelectorAll('[role="button"],[role="tab"],[role="switch"]')].filter(e=>e.getAttribute('aria-label')===${q}||e.innerText.replace(/[\uE000-\uF8FF]/g,'').trim()===${q});if(rows.length===1)rows[0].click();return rows.length})()`,
  );
  assert.equal(count, 1, `Unique target: ${label}`);
}
async function type(label, value) {
  await evaluate(
    `(()=>{const e=document.querySelector('[aria-label='+${JSON.stringify(JSON.stringify(label))}+']');if(!e)throw Error('Missing input');const proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`,
  );
}
async function screenshot(name) {
  const { data } = await call("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(`allexi_mobile/artifacts/${name}.png`, Buffer.from(data, "base64"));
}

try {
  await call("Runtime.enable");
  await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  if (
    await evaluate(
      `Boolean(document.querySelector('[aria-label="Exit admin workspace"]'))`,
    )
  )
    await click("Exit admin workspace");
  if (await evaluate(has("Recover your account")))
    await click("Back to settings");
  await wait(has("Settings & About"));
  await click("Sign out");
  await wait(has("Sign in & sync"));
  await click("Forgot password?");
  await wait(has("Recover your account"));
  await type("Recovery email", "editor@allexi.test");
  await click("Send recovery code");
  await wait(
    has("If this email has an account, a recovery code has been sent."),
  );
  await type("Recovery code", "123456");
  await type("New password", "fixture-password");
  await click("Set new password");
  await wait(has("Password updated. You are signed in."));
  await screenshot("production-recovery-mobile");
  await click("Back to settings");
  await wait(has("editor@allexi.test"));
  await click("Delete my account");
  await wait(has("Delete your account permanently?"));
  await type("Confirm deletion password", "incorrect-password");
  await click("Permanently delete my account");
  await wait(has("Your current password could not be verified."));
  await type("Confirm deletion password", "fixture-password");
  await evaluate(`document.querySelector('[aria-label="Confirm deletion password"]').scrollIntoView({block:"center"})`);
  await screenshot("production-delete-mobile");
  await click("Permanently delete my account");
  await wait(has("Your account and synced study data have been deleted."));
  await wait(has("Sign in & sync"));
  assert.deepEqual(exceptions, [], "No uncaught browser exceptions");
  console.log(
    "Production account recovery, wrong-password protection, deletion and sign-out UI passed using synthetic fixture accounts.",
  );
} finally {
  socket.close();
}

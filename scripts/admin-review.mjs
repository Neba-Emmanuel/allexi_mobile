// End-to-end acceptance against scripts/preview-admin.ts and the isolated Expo
// preview on 8091. These accounts and edits exist only in the temporary fixture.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const target = targets.find((t) => t.type === "page" && t.url.startsWith("http://localhost:8091")) ?? targets.find((t) => t.type === "page");
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
  await wait(`!document.querySelector('[aria-label="Close dialog"]')`);
  const { data } = await call("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(`allexi_mobile/artifacts/${name}.png`, Buffer.from(data, "base64"));
}
const textValue = `document.querySelector('[aria-label="Verse text"]')?.value`;
const fixtureText = "Editorial acceptance fixture for Genesis 1:1.";

try {
  await mkdir("allexi_mobile/artifacts", { recursive: true });
  await call("Runtime.enable");
  await call("Page.enable");
  await call("Page.navigate", { url: "about:blank" });
  await call("Storage.clearDataForOrigin", {
    origin: "http://localhost:8091",
    storageTypes: "all",
  });
  await call("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await call("Page.navigate", { url: "http://localhost:8091" });
  await wait(
    `${has("Enter the Scriptures")}||${has("A quiet place for the Word.")}`,
  );
  await wait(`!document.querySelector('[data-testid="animated-splash"]')`);
  if (await evaluate(has("Enter the Scriptures")))
    await click("Enter the Scriptures");
  await wait(has("A quiet place for the Word."));
  await click("Settings");
  await wait(`document.querySelector('[aria-label="Email address"]')`);
  await type("Email address", "editor@allexi.test");
  await type("Password", "fixture-password");
  await click("Sign in & sync");
  await wait(has("editor@allexi.test"));
  await click("Admin workspace");
  await wait(has("Every word, considered."));
  await wait(`${textValue}!==undefined`);
  assert.equal(await evaluate(textValue), "");
  await type("Verse text", fixtureText);
  await click("Mark verse updated");
  await click("Save changes");
  await wait(has("1 verse saved"));
  assert.ok(await evaluate(has("1 of 31 verses updated")));
  const draftSnapshot = await (
    await fetch("http://127.0.0.1:3101/v1/content")
  ).json();
  assert.equal(draftSnapshot.verses.length, 0);
  console.log(
    "Admin sign-in, Allexi editing, review tracking and private draft save passed.",
  );
  await click("Publish updated (1)");
  await wait(has("Publish reviewed verses?"));
  await click("Continue");
  await wait(has("1 reviewed verse is now published."));
  const published = await (
    await fetch("http://127.0.0.1:3101/v1/content")
  ).json();
  assert.equal(published.verses[0].text, fixtureText);
  await screenshot("admin-desktop");
  await click("Show verse history");
  await wait(has("PUBLISHED · REVISION 1"));
  assert.ok(await evaluate(has("MARKED UPDATED · REVISION 1")));
  await click("King James Version");
  await wait(`${textValue}?.includes('In the beginning God created')`);
  await click("Allexi Bible");
  await wait(`${textValue}===${JSON.stringify(fixtureText)}`);
  console.log(
    "Publishing, saved history and independent KJV/Allexi editing passed.",
  );
  await type("Verse text", fixtureText + " Unsaved change.");
  await click("King James Version");
  await wait(has("Discard unsaved edits?"));
  await click("Cancel");
  assert.equal(await evaluate(textValue), fixtureText + " Unsaved change.");
  await click("King James Version");
  await wait(has("Discard unsaved edits?"));
  await click("Continue");
  await wait(`${textValue}?.includes('In the beginning God created')`);
  await click("Allexi Bible");
  await wait(`${textValue}===${JSON.stringify(fixtureText)}`);
  console.log("Unsaved-change protection passed.");
  await click("Make ALLEXI the default");
  await wait(has("Change the reader’s default?"));
  await click("Continue");
  await wait(has("Allexi Bible is now the reader’s default edition."));
  await click("Exit admin workspace");
  await wait(`document.querySelector('[aria-label="Admin workspace"]')`);
  await click("Close");
  await wait(`!document.querySelector('[aria-label="Admin workspace"]')`);
  await click("Bible");
  await click("Choose book and chapter");
  await wait(has("Find your passage"));
  await click("New Testament");
  await click("John");
  await click("John chapter 3");
  await wait(`!document.querySelector('[aria-label="Close dialog"]')`);
  await wait(has("This chapter is being prepared."));
  assert.ok(!(await evaluate(has("For God so loved the world"))));
  await click("Choose book and chapter");
  await wait(has("Find your passage"));
  await click("Old Testament");
  await click("Genesis chapter 1");
  await wait(has(fixtureText));
  await wait(has("1 of 31 verses published"));
  await wait(`!document.querySelector('[aria-label="Close dialog"]')`);
  assert.ok(!(await evaluate(has("In the beginning God created"))));
  await click("Choose reading edition");
  await wait(has("Reading edition"));
  await click("Standard edition");
  await wait(has("In the beginning God created"));
  await wait(`!document.querySelector('[aria-label="Close dialog"]')`);
  await click("Choose reading edition");
  await wait(has("Reading edition"));
  await click("Follow app default");
  await wait(has(fixtureText));
  await wait(`!document.querySelector('[aria-label="Close dialog"]')`);
  await click("Search");
  await type("Search scripture", "Editorial acceptance");
  await wait(has("1 PASSAGE FOUND"));
  assert.ok(await evaluate(has(fixtureText)));
  console.log(
    "Default edition, unpublished chapter handling, reader switch and published-text search passed.",
  );
  await call("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await click("Settings");
  await wait(has("Settings & About"));
  await click("Admin workspace");
  await wait(has("Every word, considered."));
  await wait(`${textValue}!==undefined`);
  assert.ok(
    await evaluate("document.documentElement.scrollWidth<=390"),
    "Admin should not overflow on a phone",
  );
  await screenshot("admin-mobile");
  await click("Genesis · Chapter 1 · Choose passage");
  await wait(has("Choose a chapter"));
  await click("Edit Exodus");
  await wait(has("Exodus · 1"));
  await wait(`${textValue}!==undefined`);
  console.log("Mobile admin navigation passed.");
  assert.deepEqual(exceptions, [], "No uncaught browser exceptions");
  console.log(
    "Admin acceptance passed against real PostgreSQL functions and the Node API.",
  );
} finally {
  socket.close();
}

// Optional local UI acceptance check. Start Expo on 8084 and an isolated Chrome
// with --remote-debugging-port=9222 before running this script.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const target = targets.find(
  (t) => t.type === "page" && t.url.includes("localhost:8084"),
);
assert.ok(
  target,
  "Open http://localhost:8084 in the test Chrome session first",
);
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => (socket.onopen = resolve));
let counter = 0;
const requests = new Map(),
  exceptions = [];
socket.onmessage = (e) => {
  const data = JSON.parse(e.data);
  if (data.method === "Runtime.exceptionThrown")
    exceptions.push(data.params.exceptionDetails.text);
  if (data.id) {
    requests.get(data.id)?.(data);
    requests.delete(data.id);
  }
};
const call = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++counter;
    const timeout = setTimeout(() => {
      requests.delete(id);
      reject(new Error(`Timeout: ${method}`));
    }, 15000);
    requests.set(id, (data) => {
      clearTimeout(timeout);
      data.error ? reject(new Error(data.error.message)) : resolve(data.result);
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
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
};
const wait = async (expression) => {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`UI did not become ready: ${expression}`);
};
const click = async (text) => {
  const literal = JSON.stringify(text);
  assert.equal(
    await evaluate(
      `(()=>{const matches=[...document.querySelectorAll('[role="button"],[role="tab"]')].filter(e=>e.getAttribute('aria-label')===${literal}||e.innerText.replace(/[\uE000-\uF8FF]/g,'').trim()===${literal});if(matches.length!==1)return matches.length;matches[0].click();return 1;})()`,
    ),
    1,
    `Unique click target: ${text}`,
  );
};
const type = async (label, value) => {
  await evaluate(
    `(()=>{const e=document.querySelector('[aria-label='+${JSON.stringify(JSON.stringify(label))}+']');if(!e)throw new Error('Missing input');const proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`,
  );
};
const has = (text) =>
  `document.body.innerText.includes(${JSON.stringify(text)})`;
async function screenshot(name) {
  const { data } = await call("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(`allexi_mobile/artifacts/${name}.png`, Buffer.from(data, "base64"));
}
async function assertEditorialCopy() {
  const text = await evaluate("document.body.innerText");
  assert.doesNotMatch(
    text,
    /(?:stored|saved|bundled) on (?:your|this) device|offline ready|offline sanctuary|books available offline|available offline|notes save automatically on your device/i,
  );
}

try {
  await call("Runtime.enable");
  await call("Page.enable");
  await call("Page.reload");
  await call("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1050,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await mkdir("allexi_mobile/artifacts", { recursive: true });
  await wait(
    `${has("Enter the Scriptures")} || ${has("A quiet place for the Word.")}`,
  );
  await wait(`!document.querySelector('[data-testid="animated-splash"]')`);
  if (await evaluate(has("Enter the Scriptures")))
    await click("Enter the Scriptures");
  await wait(has("A quiet place for the Word."));
  await wait(`!document.querySelector('[data-testid="animated-splash"]')`);
  // Normalize the test passage and theme so this check can be repeated.
  await click("Bible");
  await click("Choose reading edition");
  await wait(has("Reading edition"));
  await click("Standard edition");
  await wait(`!document.querySelector('[aria-label="Close dialog"]')`);
  await click("Reading appearance");
  await click("Warm ivory");
  await click("Close");
  await wait(`!${has("Make yourself at home")}`);
  await click("Choose book and chapter");
  await click("New Testament");
  await click("John");
  await click("John chapter 3");
  await wait(`!${has("Find your passage")}`);
  await click("Home");
  await screenshot("home-desktop");
  await assertEditorialCopy();
  await click("Continue reading");
  await wait(has("Chapter 3"));
  console.log("Reader opens at saved chapter");
  const verse = await evaluate(
    `document.querySelector('[aria-label^="Verse 16:"]').getAttribute('aria-label')`,
  );
  await click(verse);
  await wait(has("YOUR REFLECTION"));
  await click("gold highlight");
  if (!(await evaluate(has("Bookmarked")))) await click("Bookmark");
  await type(
    "Your reflection",
    `A reflection saved during the offline acceptance check. ${Date.now()}`,
  );
  await wait(has("Saved"));
  await click("Close");
  await click("Saved");
  await wait(has("A reflection saved during the offline acceptance check."));
  assert.ok(await evaluate(has("JOHN 3:16 · HIGHLIGHT")));
  assert.ok(await evaluate(has("JOHN 3:16 · BOOKMARK")));
  console.log("Highlight, bookmark and autosaved note appear in Saved");
  await assertEditorialCopy();
  await click("Read note for John 3:16");
  await wait(has("Chapter 3"));
  await click("Saved");
  await wait(has("JOHN 3:16 · NOTE"));
  await call("Page.reload");
  await wait(has("A quiet place for the Word."));
  await wait(`!document.querySelector('[data-testid="animated-splash"]')`);
  await click("Saved");
  await wait(has("A reflection saved during the offline acceptance check."));
  console.log("Saved library survives reload");
  await click("Search");
  await type("Search scripture", "John 3:16");
  await wait(has("1 PASSAGE FOUND"));
  assert.ok(await evaluate(has("For God so loved the world")));
  await assertEditorialCopy();
  await call("Network.enable");
  await call("Network.emulateNetworkConditions", {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });
  await type("Search scripture", "born again");
  await wait(has("PASSAGES FOUND"));
  assert.ok(await evaluate(has("Except a man be born again")));
  console.log("Reference and phrase search work with network disabled");
  await call("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await click("Home");
  await call("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await wait(has("A quiet place for the Word."));
  await wait(`!document.querySelector('[data-testid="animated-splash"]')`);
  await screenshot("home-mobile");
  assert.ok(
    await evaluate(`document.documentElement.scrollWidth<=390`),
    "No mobile horizontal overflow",
  );
  await click("Bible");
  await wait(has("Chapter 3"));
  await screenshot("reader-mobile");
  await click("Reading appearance");
  await wait(has("Make yourself at home"));
  await click("Sanctuary");
  await click("Close");
  await wait(`!${has("Make yourself at home")}`);
  await screenshot("reader-dark-mobile");
  await click("Choose book and chapter");
  await wait(has("Find your passage"));
  await click("Old Testament");
  await click("Genesis chapter 1");
  await wait(has("Chapter 1"));
  assert.ok(await evaluate(has("In the beginning God created")));
  console.log("Mobile layout, dark theme and chapter picker work");
  await click("Settings");
  await wait(has("Settings & About"));
  await assertEditorialCopy();
  await click("About Allexi Bible");
  await wait(has("OUR PURPOSE & PERSPECTIVE"));
  assert.ok(await evaluate(has("The Extended Explicit Allexi Bible")));
  assert.ok(await evaluate(has("inerrant and infallible Word of the Lord")));
  assert.ok(await evaluate(has("contradictions, lies, or errors")));
  assert.ok(await evaluate(has("The testimony is correct")));
  await assertEditorialCopy();
  await wait(
    `document.querySelector('[data-testid="about-content"]').getBoundingClientRect().top < 300`,
  );
  await screenshot("about-mobile");
  await evaluate(
    `document.querySelector('[data-testid="about-statement"]').scrollIntoView({block:'center'})`,
  );
  await screenshot("about-statement-mobile");
  await click("Back to settings");
  await wait(has("Settings & About"));
  await click("Close");
  console.log(
    "About content, settings navigation and editorial copy checks passed.",
  );
  assert.deepEqual(exceptions, [], "No uncaught browser exceptions");
  console.log("Browser acceptance passed; screenshots saved to artifacts/");
} finally {
  socket.close();
}

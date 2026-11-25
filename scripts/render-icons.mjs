// Rasterize the editable SVG icon sources with an isolated Chrome instance
// started with --remote-debugging-port=9222. No graphics packages are required.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import pngjs from "pngjs";

const { PNG } = pngjs;
const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const target = targets.find((t) => t.type === "page");
assert.ok(target, "Start an isolated Chrome debugging session first");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => (socket.onopen = resolve));
let serial = 0;
const pending = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
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
      10000,
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
try {
  await call("Emulation.setDefaultBackgroundColorOverride", {
    color: { r: 0, g: 0, b: 0, a: 0 },
  });
  const tree = await call("Page.getFrameTree");
  for (const [source, output, size, opaque] of [
    ["icon", "icon", 1024, true],
    ["adaptive-icon", "adaptive-icon", 1024, false],
    ["monochrome-icon", "monochrome-icon", 1024, false],
    ["icon", "favicon", 64, true],
  ]) {
    await call("Emulation.setDeviceMetricsOverride", {
      width: size,
      height: size,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const svg = (
      await readFile(`allexi_mobile/assets/${source}.svg`, "utf8")
    ).replace('width="1024" height="1024"', `width="${size}" height="${size}"`);
    await call("Page.setDocumentContent", {
      frameId: tree.frameTree.frame.id,
      html: `<html><body style="margin:0;background:transparent">${svg}</body></html>`,
    });
    const { data } = await call("Page.captureScreenshot", { format: "png" });
    const image = PNG.sync.read(Buffer.from(data, "base64"));
    assert.equal(image.width, size);
    assert.equal(image.height, size);
    if (opaque)
      for (let i = 3; i < image.data.length; i += 4)
        assert.equal(image.data[i], 255, "App icon must be fully opaque");
    else
      assert.equal(
        image.data[3],
        0,
        "Adaptive foreground must have transparent corners",
      );
    await writeFile(
      `allexi_mobile/assets/${output}.png`,
      PNG.sync.write(image, { colorType: opaque ? 2 : 6 }),
    );
    console.log(
      `${output}.png: ${size}×${size}, ${opaque ? "RGB, no alpha channel" : "transparent foreground"}`,
    );
  }
} finally {
  socket.close();
}

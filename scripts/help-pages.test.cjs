const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { publicPageRedirect } = require("../src/lib/publicPageRoutes.ts");
const { buildHelpPages } = require("./build-help-pages.cjs");

test("slashless public-page routes redirect without losing query strings or anchors", () => {
  for (const page of ["support", "privacy", "terms"]) {
    assert.equal(publicPageRedirect(`/${page}`), `/${page}/`);
    assert.equal(publicPageRedirect(`/${page}`, "?source=store", "#contact"), `/${page}/?source=store#contact`);
    assert.equal(publicPageRedirect(`/${page}/`), null);
  }
  for (const route of ["/", "/reader", "/supporting", "/privacy/index.html", "//other.example/support"])
    assert.equal(publicPageRedirect(route), null);
});

test("all public pages export directory and flat aliases with working legal navigation", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "allexi-help-pages-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "src/data"), { recursive: true });
  fs.copyFileSync(path.join(__dirname, "../src/data/help.json"), path.join(root, "src/data/help.json"));
  buildHelpPages(root);
  for (const page of ["support", "privacy", "terms"]) {
    const directory = fs.readFileSync(path.join(root, "public", page, "index.html"), "utf8");
    assert.equal(fs.readFileSync(path.join(root, "public", `${page}.html`), "utf8"), directory);
    for (const destination of ["support", "privacy", "terms"])
      assert.ok(directory.includes(`href="/${destination}/"`));
    assert.ok(directory.includes('href="/help.css"'));
    assert.ok(directory.includes('href="/"'));
    assert.ok(directory.includes("Allexhairdrick@icloud.com"));
  }
  const terms = fs.readFileSync(path.join(root, "public/terms/index.html"), "utf8");
  assert.match(terms, /<title>Terms of Service · Allexi Bible<\/title>/);
  assert.ok(terms.includes("28 November 2026"));
  assert.ok(terms.includes("Administrator accounts"));
});

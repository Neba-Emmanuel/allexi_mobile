// Generate public pages from the same copy used by the native app.
const fs = require("node:fs");
const path = require("node:path");
const escape = (value) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const titles = { support: "Support", privacy: "Privacy policy", terms: "Terms of Service" };
function buildHelpPages(root = path.resolve(__dirname, "..")) {
const help = JSON.parse(fs.readFileSync(path.join(root, "src/data/help.json"), "utf8"));
for (const page of Object.keys(titles)) {
  const content = help[page];
  const title = titles[page];
  const links = Object.keys(titles).map((destination) => `<a href="/${destination}/"${page === destination ? ' aria-current="page"' : ""}>${titles[destination]}</a>`).join("");
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="${escape(content.intro)}"><meta name="color-scheme" content="light dark">
<title>${title} · Allexi Bible</title><link rel="stylesheet" href="/help.css"></head>
<body><header><a class="brand" href="/">Allexi Bible<span>THE WORD, WITH YOU.</span></a>
<nav aria-label="Help pages">${links}</nav></header>
<main id="main"><p class="eyebrow">${title}</p><h1>${escape(content.title)}</h1><p class="intro">${escape(content.intro)}</p>
${content.updated ? `<p class="updated">Last updated ${escape(content.updated)}</p>` : ""}
${content.sections.map((section) => `<section><h2>${escape(section.title)}</h2><p>${escape(section.body)}</p></section>`).join("\n")}
<aside aria-label="Contact support"><h2>Let’s talk.</h2><p><a href="mailto:${help.email}">${help.email}</a></p><p>Please do not send passwords, recovery codes or private study notes.</p>
<div class="actions"><a class="button" href="mailto:${help.email}?subject=Allexi%20Bible%20${page === "privacy" ? "privacy%20question" : "support"}">Email support</a>
<a href="mailto:${help.email}?subject=Account%20deletion">Request account deletion</a></div></aside></main>
<footer><span>Extended Explicit Allexi Bible</span><nav aria-label="Legal pages">${links}</nav></footer></body></html>\n`;
  const directory = path.join(root, "public", page);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "index.html"), html);
  fs.writeFileSync(path.join(root, "public", `${page}.html`), html);
}
}
if (require.main === module) buildHelpPages();
module.exports = { buildHelpPages };

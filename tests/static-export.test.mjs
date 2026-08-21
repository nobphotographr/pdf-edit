import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("exports a subpath-safe static site for tools.iruagaru.com", async () => {
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");

  assert.match(html, /<title>PDFのページを、整える。｜iruagaru<\/title>/);
  assert.match(html, /https:\/\/tools\.iruagaru\.com\/pdf-edit\/og\.png/);
  assert.match(html, /rel="canonical" href="https:\/\/tools\.iruagaru\.com\/pdf-edit\/"/);
  assert.match(html, /\/pdf-edit\/assets\//);

  await Promise.all([
    access(new URL("../out/pdf.worker.min.js", import.meta.url)),
    access(new URL("../out/licenses/pdf-lib-MIT.txt", import.meta.url)),
    access(new URL("../out/licenses/pdfjs-Apache-2.0.txt", import.meta.url)),
    access(new URL("../out/og.png", import.meta.url)),
    access(new URL("../out/favicon.png", import.meta.url)),
  ]);
});

test("uses a JavaScript worker URL that works below the public subpath", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /import\.meta\.env\.BASE_URL/);
  assert.match(page, /pdf\.worker\.min\.js/);
  assert.match(page, /await loadingTask\.destroy\(\)/);
  assert.doesNotMatch(page, /pdf\.worker\.min\.mjs/);
  assert.doesNotMatch(page, /pdfDocument\.destroy\(\)/);
});

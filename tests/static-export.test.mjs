import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("exports a subpath-safe static site for xpreview", async () => {
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");

  assert.match(html, /<title>PDFのページを、整える。｜iruagaru<\/title>/);
  assert.match(html, /https:\/\/xpreview\.iruagaru\.com\/pdf-edit\/og\.png/);
  assert.match(html, /\/pdf-edit\/assets\//);

  await Promise.all([
    access(new URL("../out/licenses/pdf-lib-MIT.txt", import.meta.url)),
    access(new URL("../out/licenses/pdfjs-Apache-2.0.txt", import.meta.url)),
    access(new URL("../out/og.png", import.meta.url)),
    access(new URL("../out/favicon.png", import.meta.url)),
  ]);
});

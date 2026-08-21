import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

test("destroys the PDF.js loading task after reading a document", async () => {
  const source = await PDFDocument.create();
  source.addPage([200, 200]);
  const bytes = await source.save();
  const loadingTask = pdfjs.getDocument({ data: bytes });
  const document = await loadingTask.promise;

  assert.equal(document.numPages, 1);
  assert.equal(typeof document.destroy, "undefined");
  assert.equal(typeof loadingTask.destroy, "function");

  await loadingTask.destroy();
  assert.equal(loadingTask.destroyed, true);
});

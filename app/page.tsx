"use client";

import type { PDFDocument as PDFDocumentType } from "pdf-lib";
import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";

type SourcePdf = {
  id: string;
  name: string;
  bytes: Uint8Array;
  pageCount: number;
  size: number;
};

type PageItem = {
  id: string;
  sourceId: string;
  sourceName: string;
  sourcePageIndex: number;
  pageNumber: number;
  rotation: number;
  thumbnailUrl: string;
  width: number;
  height: number;
};

function displayBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (from === to || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

async function canvasToObjectUrl(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("サムネイルを作成できませんでした。")), "image/jpeg", 0.78);
  });
  return URL.createObjectURL(blob);
}

export default function Home() {
  const [sources, setSources] = useState<SourcePdf[]>([]);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isReading, setIsReading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("merged-document.pdf");
  const dragIndexRef = useRef<number | null>(null);

  const totalBytes = useMemo(() => sources.reduce((sum, source) => sum + source.size, 0), [sources]);

  async function addFiles(files: FileList | File[]) {
    const pdfFiles = Array.from(files).filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    if (!pdfFiles.length) {
      setError("PDFファイルを選択してください。");
      return;
    }

    setIsReading(true);
    setError("");

    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        `${import.meta.env.BASE_URL}pdf.worker.min.js`,
        window.location.origin,
      ).toString();

      const nextSources: SourcePdf[] = [];
      const nextPages: PageItem[] = [];

      for (let fileIndex = 0; fileIndex < pdfFiles.length; fileIndex += 1) {
        const file = pdfFiles[fileIndex];
        const sourceId = crypto.randomUUID();
        const bytes = new Uint8Array(await file.arrayBuffer());
        setProgress(`${file.name} を読み込んでいます (${fileIndex + 1} / ${pdfFiles.length})`);

        const loadingTask = pdfjs.getDocument({ data: bytes.slice() });
        const pdfDocument = await loadingTask.promise;
        try {
          nextSources.push({ id: sourceId, name: file.name, bytes, pageCount: pdfDocument.numPages, size: file.size });

          for (let pageIndex = 0; pageIndex < pdfDocument.numPages; pageIndex += 1) {
            setProgress(`${file.name} / ${pageIndex + 1}ページ目を準備しています`);
            const page = await pdfDocument.getPage(pageIndex + 1);
            const originalViewport = page.getViewport({ scale: 1 });
            const scale = Math.min(1, 220 / originalViewport.width);
            const viewport = page.getViewport({ scale });
            const canvas = window.document.createElement("canvas");
            const context = canvas.getContext("2d", { alpha: false });
            if (!context) throw new Error("PDFのプレビューを作成できませんでした。");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvas, canvasContext: context, viewport }).promise;
            const thumbnailUrl = await canvasToObjectUrl(canvas);
            page.cleanup();

            nextPages.push({
              id: crypto.randomUUID(),
              sourceId,
              sourceName: file.name,
              sourcePageIndex: pageIndex,
              pageNumber: pageIndex + 1,
              rotation: 0,
              thumbnailUrl,
              width: originalViewport.width,
              height: originalViewport.height,
            });
          }
        } finally {
          await loadingTask.destroy();
        }
      }

      setSources((current) => [...current, ...nextSources]);
      setPages((current) => [...current, ...nextPages]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "PDFを読み込めませんでした。暗号化されたPDFには対応していません。");
    } finally {
      setIsReading(false);
      setProgress("");
    }
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void addFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    void addFiles(event.dataTransfer.files);
  }

  function removePage(id: string) {
    setPages((current) => {
      const target = current.find((page) => page.id === id);
      if (target) URL.revokeObjectURL(target.thumbnailUrl);
      return current.filter((page) => page.id !== id);
    });
  }

  function rotatePage(id: string) {
    setPages((current) => current.map((page) => page.id === id ? { ...page, rotation: (page.rotation + 90) % 360 } : page));
  }

  function clearAll() {
    pages.forEach((page) => URL.revokeObjectURL(page.thumbnailUrl));
    setPages([]);
    setSources([]);
    setError("");
  }

  function handlePageDrop(targetIndex: number) {
    const fromIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    if (fromIndex == null) return;
    setPages((current) => moveItem(current, fromIndex, targetIndex));
  }

  async function exportPdf() {
    if (!pages.length) return;
    setIsExporting(true);
    setError("");
    setProgress("PDFを結合しています");

    try {
      const { PDFDocument, degrees } = await import("pdf-lib");
      const output = await PDFDocument.create();
      const sourceDocuments = new Map<string, PDFDocumentType>();

      for (const source of sources) {
        if (pages.some((page) => page.sourceId === source.id)) {
          sourceDocuments.set(source.id, await PDFDocument.load(source.bytes));
        }
      }

      for (let index = 0; index < pages.length; index += 1) {
        const item = pages[index];
        setProgress(`${index + 1} / ${pages.length}ページを結合しています`);
        const sourceDocument = sourceDocuments.get(item.sourceId);
        if (!sourceDocument) continue;
        const [copiedPage] = await output.copyPages(sourceDocument, [item.sourcePageIndex]);
        if (item.rotation) copiedPage.setRotation(degrees((copiedPage.getRotation().angle + item.rotation) % 360));
        output.addPage(copiedPage);
      }

      output.setTitle(fileName.replace(/\.pdf$/i, ""));
      output.setProducer("iruagaru / PDF Edit");
      const bytes = await output.save({ useObjectStreams: true });
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName.trim().toLowerCase().endsWith(".pdf") ? fileName.trim() : `${fileName.trim() || "merged-document"}.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "PDFを書き出せませんでした。");
    } finally {
      setIsExporting(false);
      setProgress("");
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="https://iruagaru.com/">IRUAGARU / PDF TOOLS</a>
        <span className="local-badge"><i /> LOCAL PROCESSING</span>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">EDIT / BEFORE SHARING</p>
        <h1 id="page-title">PDFのページを、<br />整える。</h1>
        <div className="hero-copy">
          <p>複数のPDFをひとつにまとめ、ページを見ながら並べ替えます。</p>
          <p className="privacy"><i />選択したPDFは外部へ送信しません。</p>
        </div>
      </section>

      <section className="editor" aria-labelledby="editor-title">
        <div className="editor-heading">
          <div><p className="section-label">EDIT / 01</p><h2 id="editor-title">ページを整える</h2></div>
          <p>結合したいPDFをまとめて選択してください。ページ単位で順番を変更し、不要なページを除いて保存できます。</p>
        </div>

        {!pages.length ? (
          <label className={`drop-zone ${isReading ? "is-reading" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
            <input type="file" accept="application/pdf,.pdf" multiple onChange={handleInput} disabled={isReading} />
            <span>DROP PDF FILES HERE</span>
            <strong>{isReading ? "読み込み中" : "PDFを選ぶ"}</strong>
            <b aria-hidden="true">{isReading ? "···" : "↗"}</b>
            <small>MULTIPLE FILES / LOCAL ONLY</small>
          </label>
        ) : (
          <>
            <div className="summary-bar">
              <div><span>{sources.length}</span><small>FILES</small></div>
              <div><span>{pages.length}</span><small>PAGES</small></div>
              <div><span>{displayBytes(totalBytes)}</span><small>INPUT SIZE</small></div>
              <label className="add-more"><input type="file" accept="application/pdf,.pdf" multiple onChange={handleInput} disabled={isReading} /><span>PDFを追加 ＋</span></label>
            </div>

            <div className="export-bar">
              <label><span>FILE NAME</span><input value={fileName} onChange={(event) => setFileName(event.target.value)} aria-label="保存するPDFのファイル名" /></label>
              <button className="text-button" type="button" onClick={clearAll}>すべて消去</button>
              <button className="primary-button" type="button" onClick={() => void exportPdf()} disabled={isExporting || !pages.length}>
                <span>{isExporting ? "作成しています" : "PDFを保存"}</span><span aria-hidden="true">{isExporting ? "···" : "↓"}</span>
              </button>
            </div>

            <div className="source-strip" aria-label="読み込んだPDF">
              {sources.map((source, index) => <span key={source.id}>{String(index + 1).padStart(2, "0")} / {source.name} / {source.pageCount}P</span>)}
            </div>

            <div className="page-grid" aria-label="PDFページ一覧">
              {pages.map((page, index) => (
                <article
                  className="page-card"
                  key={page.id}
                  draggable
                  onDragStart={() => { dragIndexRef.current = index; }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handlePageDrop(index)}
                >
                  <div className="page-card-head"><span>{String(index + 1).padStart(2, "0")}</span><span>{page.sourceName} / P.{page.pageNumber}</span></div>
                  <div className="page-preview">
                    {/* Blob thumbnails cannot use Next image optimization. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={page.thumbnailUrl} alt={`${page.sourceName} ${page.pageNumber}ページ目`} style={{ transform: `rotate(${page.rotation}deg)` }} />
                  </div>
                  <div className="page-actions">
                    <button type="button" onClick={() => setPages((current) => moveItem(current, index, index - 1))} disabled={index === 0} aria-label={`${index + 1}ページ目を前へ移動`}>←</button>
                    <button type="button" onClick={() => setPages((current) => moveItem(current, index, index + 1))} disabled={index === pages.length - 1} aria-label={`${index + 1}ページ目を後ろへ移動`}>→</button>
                    <button type="button" onClick={() => rotatePage(page.id)} aria-label={`${index + 1}ページ目を右へ回転`}>↻</button>
                    <button type="button" onClick={() => removePage(page.id)} aria-label={`${index + 1}ページ目を削除`}>×</button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {(progress || error) && <div className={`message ${error ? "is-error" : ""}`} role="status">{error || progress}</div>}
        <p className="editor-note">DRAG TO REORDER / USE ARROWS ON TOUCH DEVICES / ENCRYPTED PDFS ARE NOT SUPPORTED</p>
      </section>

      <section className="about" aria-labelledby="about-title">
        <div className="about-intro">
          <div><p className="section-label">ABOUT / 02</p><h2 id="about-title">必要なページを、<br />必要な順番に。</h2></div>
          <p>結合、並べ替え、90度回転、削除。日常的なPDF整理に必要な操作だけを、迷わず使える形にまとめました。</p>
        </div>
        <div className="feature-cards">
          <article><span>01 / MERGE</span><h3>まとめる</h3><p>複数のPDFを同時に読み込み、ひとつのファイルへ結合します。</p></article>
          <article><span>02 / REORDER</span><h3>並べ替える</h3><p>サムネイルをドラッグするか矢印を使い、ページの順番を変更できます。</p></article>
          <article><span>03 / CLEAN</span><h3>整えて保存</h3><p>不要ページの削除と回転を反映し、新しいPDFとして端末へ保存します。</p></article>
        </div>
        <details className="credits">
          <summary>このツールとオープンソースについて</summary>
          <div>
            <p>PDFの作成・編集にはMIT Licenseの <a href="https://github.com/Hopding/pdf-lib" target="_blank" rel="noreferrer">pdf-lib</a>、プレビューにはApache License 2.0の <a href="https://github.com/mozilla/pdf.js" target="_blank" rel="noreferrer">PDF.js</a> を使用しています。</p>
            <p><a href="licenses/pdf-lib-MIT.txt" target="_blank" rel="noreferrer">pdf-libのライセンス</a> / <a href="licenses/pdfjs-Apache-2.0.txt" target="_blank" rel="noreferrer">PDF.jsのライセンス</a></p>
          </div>
        </details>
      </section>

      <footer><p>PDF EDIT / IRUAGARU</p><p>LOCAL PROCESSING / 2026</p></footer>
    </main>
  );
}

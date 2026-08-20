# PDF Edit guidance

## Product intent

This is a browser-only PDF page organizer for merging PDFs, reordering pages,
rotating pages, deleting pages, and exporting a new document.

## Important decisions

- Keep all PDF reading and editing local in the browser.
- Never upload selected PDF bytes or page thumbnails.
- Preserve merge, drag reorder, touch-friendly arrow controls, rotation, deletion,
  and export.
- Treat file names as untrusted text and render them through React text output.
- Keep the quiet iruagaru visual language and the public `/pdf-edit/` subpath.
- Preserve bundled license notices for pdf-lib and PDF.js.

## Required checks

Run these before committing functional changes:

```bash
npm test
npm run lint
```

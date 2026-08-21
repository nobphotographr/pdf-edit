# PDF Edit

複数のPDFをブラウザ内で結合し、ページの並べ替え・回転・削除をして保存する、iruagaruのPDF編集ツールです。

## 公開URL

- 本番: https://tools.iruagaru.com/pdf-edit/
- 旧URL: https://iruagaru.com/pdf-edit/（本番公開後に301転送）

## できること

- 複数PDFの結合
- サムネイルを見ながらドラッグでページを並べ替え
- タッチ端末向けの矢印操作
- ページ単位の90度回転と削除
- 編集後のPDFを任意のファイル名で保存

PDFはサーバーへアップロードせず、読み込みから書き出しまでブラウザ内で処理します。暗号化されたPDFには対応していません。

## 開発

Node.js 22.13以上が必要です。

```bash
npm install
npm run dev
```

## 検証

```bash
npm test
npm run lint
```

`npm test` はSites向けビルド、`/pdf-edit/`向け静的ビルド、出力内容の検査を実行します。

## 公開

```bash
./scripts/deploy-tools.sh
```

## 使用しているOSS

- [pdf-lib](https://github.com/Hopding/pdf-lib) — MIT License
- [PDF.js](https://github.com/mozilla/pdf.js) — Apache License 2.0

ライセンス原文は `public/licenses/` に収録しています。

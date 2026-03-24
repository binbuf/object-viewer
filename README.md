# 🔍 Object Viewer

**Decode & explore data formats — right in your browser.**

[![Deploy to GitHub Pages](https://github.com/binbuf/object-viewer/actions/workflows/deploy.yml/badge.svg)](https://github.com/binbuf/object-viewer/actions/workflows/deploy.yml)
[![License](https://img.shields.io/github/license/binbuf/object-viewer)](LICENSE)

> 🔒 **Privacy-first** — all parsing happens client-side. Your data never leaves your browser.

## 🚀 Try It Now

👉 **[object-viewer on GitHub Pages](https://binbuf.github.io/object-viewer/)**

Paste data, drop a file, and start exploring.

## 📦 Supported Formats

| Format | Features |
|--------|----------|
| JSON / JSON5 | Auto-detection, syntax highlighting |
| JWT | Header/payload decoding, expiration status |
| XML | Namespace display, root element info |
| YAML | Multi-document support |
| MessagePack | Binary decode + tree view |
| CBOR | Binary decode + tree view |
| Protobuf | Raw wire-format decoding |

## ✨ Features

- 🌳 **Interactive tree view** — expand, collapse, and navigate nested structures
- 🔄 **Format conversion** — convert between JSON, YAML, and XML
- 🔗 **Source ↔ tree sync** — click source to highlight the tree node and vice versa
- 🔎 **Search** — find keys and values across deeply nested data
- 📂 **Drag & drop** — drop files directly into the app
- 🕐 **Timestamp decoding** — epoch/datetime conversion with configurable timezone
- 🌙 **Dark / Light mode**
- 📑 **Multi-document** — handles multiple objects separated by `---`

## 🏗️ Run Locally

```bash
git clone https://github.com/binbuf/object-viewer.git
cd object-viewer
npm ci
npm run dev
```

Open [http://localhost:5173/object-viewer/](http://localhost:5173/object-viewer/) and you're in.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests |
| `npm run lint` | Lint with ESLint |

## 🛠️ Tech Stack

React 19 · TypeScript · Vite · Tailwind CSS

## 📄 License

[MIT](LICENSE)

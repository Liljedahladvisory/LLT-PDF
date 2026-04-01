# LLT PDF

**Merge, reorder, mask, and annotate PDF documents — all in one lightweight desktop app.**

Built by [Liljedahl Legal Tech](https://www.liljedahladvisory.se) for legal professionals and anyone who needs fast, private PDF manipulation without cloud services or subscriptions.

---

## Features

- **Merge PDFs** — Drag and drop multiple PDF files to combine them into one
- **Reorder pages** — Drag and drop page thumbnails to rearrange the page order
- **Mask content** — Draw black rectangles to redact sensitive information
- **Add text** — Click anywhere on a page to insert text annotations
- **Export** — Save the final result as a new PDF with full "Save As" dialog
- **Offline & private** — All processing happens locally on your machine. No files are uploaded anywhere.

---

## Installation

### macOS (Apple Silicon)

1. Download `LLT PDF.dmg` from [Releases](https://github.com/Liljedahladvisory/LLT-PDF/releases)
2. Open the DMG and drag **LLT PDF** to **Applications**
3. Launch the app and register with your email

### Build from source

Requires: Node.js, Rust, and Cargo.

```bash
git clone https://github.com/Liljedahladvisory/LLT-PDF.git
cd LLT-PDF
npm install
npm run tauri build
```

The built app will be in `src-tauri/target/release/bundle/`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | [Tauri v2](https://tauri.app) (Rust) |
| Frontend | React 18 + TypeScript |
| PDF manipulation | [pdf-lib](https://pdf-lib.js.org) |
| PDF rendering | [pdf.js](https://mozilla.github.io/pdf.js/) |
| Drag & drop | [dnd-kit](https://dndkit.com) |
| Build tool | Vite |

---

## Licensing

LLT PDF uses an HMAC-SHA256 signed license system. Upon registration, users receive a 12-month license. The license is bound to the machine and verified locally at each app launch.

### Admin tools

```bash
# Generate a license key
cd admin
python generate_license.py "Company AB" "customer@example.com"

# Generate with custom duration
python generate_license.py "Company AB" "customer@example.com" --months 24

# List all generated licenses
python generate_license.py --list

# Revoke a license
python revoke_license.py add "customer@example.com"

# Unrevoke
python revoke_license.py remove "customer@example.com"
```

Requires `admin/license_secret.py` (never committed to git).

---

## Project Structure

```
LLT-PDF/
├── src/                        # React/TypeScript frontend
│   ├── App.tsx                 # Main PDF workspace
│   ├── LicenseGate.tsx         # License check wrapper
│   ├── lib/
│   │   ├── pdfEngine.ts        # PDF merge, mask, text engine
│   │   ├── license.ts          # License API (webhook, revocation)
│   │   └── i18n.ts             # Swedish/English translations
│   └── components/
│       ├── Dropzone.tsx         # File drag & drop zone
│       ├── PageThumbnail.tsx    # Sortable page thumbnails
│       ├── PdfViewer.tsx        # Main page viewer with tools
│       ├── Toolbar.tsx          # Tool selection bar
│       ├── RegistrationScreen.tsx
│       ├── ActivationScreen.tsx
│       ├── ExpiredScreen.tsx
│       └── LanguageDialog.tsx
├── src-tauri/                  # Rust backend
│   ├── src/lib.rs              # License verification, machine ID
│   └── tauri.conf.json         # App configuration
├── admin/                      # Admin tools
│   ├── gas-script.js           # Google Apps Script for email verification
│   ├── generate_license.py     # License key generator
│   └── revoke_license.py       # License revocation tool
└── revoked.json                # Revoked license list
```

---

## Language Support

LLT PDF supports Swedish and English. The language is selected on first launch after registration and can be changed by clearing the app data.

---

*Powered by Liljedahl Legal Tech*

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface PdfModification {
  type: "mask" | "text";
  pageIndex: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  size?: number;
  color?: { r: number; g: number; b: number };
}

export interface PageInfo {
  id: string;
  sourceFileIndex: number;
  sourcePageIndex: number;
  label: string;
  width: number;
  height: number;
}

/**
 * Ladda en PDF och returnera info om varje sida.
 */
export async function extractPageInfos(
  fileBuffer: ArrayBuffer,
  fileIndex: number,
  fileName: string
): Promise<PageInfo[]> {
  const pdfDoc = await PDFDocument.load(fileBuffer);
  const pageCount = pdfDoc.getPageCount();
  const pages: PageInfo[] = [];

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    pages.push({
      id: `file${fileIndex}-page${i}`,
      sourceFileIndex: fileIndex,
      sourcePageIndex: i,
      label: `${fileName} — Sida ${i + 1}`,
      width,
      height,
    });
  }

  return pages;
}

/**
 * Kompilera den slutgiltiga PDF:en baserat på sidordning och modifieringar.
 */
export async function compileNewPdf(
  sourceFiles: ArrayBuffer[],
  pageInfos: PageInfo[],
  modifications: PdfModification[]
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  const font = await mergedPdf.embedFont(StandardFonts.Helvetica);

  // Ladda alla källdokument
  const loadedDocs: PDFDocument[] = [];
  for (const fileBuffer of sourceFiles) {
    loadedDocs.push(await PDFDocument.load(fileBuffer));
  }

  // Kopiera sidor i angiven ordning
  for (const info of pageInfos) {
    const srcDoc = loadedDocs[info.sourceFileIndex];
    const [copiedPage] = await mergedPdf.copyPages(srcDoc, [
      info.sourcePageIndex,
    ]);
    mergedPdf.addPage(copiedPage);
  }

  // Applicera modifieringar
  const finalPages = mergedPdf.getPages();

  for (const mod of modifications) {
    if (mod.pageIndex < 0 || mod.pageIndex >= finalPages.length) continue;
    const targetPage = finalPages[mod.pageIndex];

    if (mod.type === "mask" && mod.width && mod.height) {
      const c = mod.color ?? { r: 0, g: 0, b: 0 };
      targetPage.drawRectangle({
        x: mod.x,
        y: mod.y,
        width: mod.width,
        height: mod.height,
        color: rgb(c.r, c.g, c.b),
      });
    } else if (mod.type === "text" && mod.text) {
      const c = mod.color ?? { r: 0, g: 0, b: 0 };
      targetPage.drawText(mod.text, {
        x: mod.x,
        y: mod.y,
        size: mod.size || 12,
        font,
        color: rgb(c.r, c.g, c.b),
      });
    }
  }

  return await mergedPdf.save();
}

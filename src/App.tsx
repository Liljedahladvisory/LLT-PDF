import React, { useState, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import * as pdfjsLib from "pdfjs-dist";
import Dropzone from "./components/Dropzone";
import PageThumbnail from "./components/PageThumbnail";
import PdfViewer from "./components/PdfViewer";
import Toolbar from "./components/Toolbar";
import {
  extractPageInfos,
  compileNewPdf,
  PageInfo,
  PdfModification,
} from "./lib/pdfEngine";

// Konfigurera pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

export default function App() {
  const [sourceFiles, setSourceFiles] = useState<ArrayBuffer[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [modifications, setModifications] = useState<PdfModification[]>([]);
  const [activeTool, setActiveTool] = useState<"select" | "mask" | "text">(
    "select"
  );
  const [exporting, setExporting] = useState(false);

  // Cache för pdf.js dokument
  const pdfDocsCache = useRef<Map<number, pdfjsLib.PDFDocumentProxy>>(
    new Map()
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Lägg till PDF-filer
  const handleFilesAdded = useCallback(
    async (files: File[]) => {
      const newBuffers: ArrayBuffer[] = [];
      const newNames: string[] = [];

      for (const file of files) {
        const buffer = await file.arrayBuffer();
        newBuffers.push(buffer);
        newNames.push(file.name);
      }

      const startIndex = sourceFiles.length;
      const allNewPages: PageInfo[] = [];

      for (let i = 0; i < newBuffers.length; i++) {
        const infos = await extractPageInfos(
          newBuffers[i],
          startIndex + i,
          newNames[i]
        );
        allNewPages.push(...infos);

        // Cache pdf.js-dokument for rendering
        const doc = await pdfjsLib.getDocument({
          data: newBuffers[i].slice(0),
        }).promise;
        pdfDocsCache.current.set(startIndex + i, doc);
      }

      setSourceFiles((prev) => [...prev, ...newBuffers]);
      setFileNames((prev) => [...prev, ...newNames]);
      setPages((prev) => [...prev, ...allNewPages]);

      if (selectedIndex === -1 && allNewPages.length > 0) {
        setSelectedIndex(0);
      }
    },
    [sourceFiles.length, selectedIndex]
  );

  // Drag & drop ordningsändring
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setPages((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  // Rendera en PDF-sida till canvas via pdf.js
  const renderPage = useCallback(
    async (
      canvas: HTMLCanvasElement,
      fileIndex: number,
      pageIndex: number,
      scale = 0.3
    ) => {
      const doc = pdfDocsCache.current.get(fileIndex);
      if (!doc) return;

      const pdfPage = await doc.getPage(pageIndex + 1); // pdf.js är 1-indexed
      const viewport = pdfPage.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      await pdfPage.render({ canvasContext: ctx, viewport }).promise;
    },
    []
  );

  const handleRemovePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
    if (selectedIndex === index) {
      setSelectedIndex(-1);
    } else if (selectedIndex > index) {
      setSelectedIndex((prev) => prev - 1);
    }
  };

  const handleAddModification = (mod: PdfModification) => {
    setModifications((prev) => [...prev, mod]);
  };

  const handleUndo = () => {
    setModifications((prev) => prev.slice(0, -1));
  };

  const handleExport = async () => {
    if (pages.length === 0) return;
    setExporting(true);

    try {
      const pdfBytes = await compileNewPdf(sourceFiles, pages, modifications);

      // I webbläsarläge: ladda ner via blob
      // I Tauri-läge: använd dialog + fs (detekteras automatiskt)
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "LLT-PDF-export.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export misslyckades:", err);
      alert("Kunde inte exportera PDF. Se konsolen for detaljer.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onExport={handleExport}
        canExport={pages.length > 0 && !exporting}
        onUndo={handleUndo}
        canUndo={modifications.length > 0}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidpanel */}
        <div
          style={{
            width: "220px",
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            padding: "12px",
            gap: "8px",
            overflowY: "auto",
          }}
        >
          <Dropzone onFilesAdded={handleFilesAdded} />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={pages.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {pages.map((page, idx) => (
                <PageThumbnail
                  key={page.id}
                  page={page}
                  index={idx}
                  isSelected={idx === selectedIndex}
                  onSelect={setSelectedIndex}
                  onRemove={handleRemovePage}
                  renderPage={renderPage}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Huvudvy */}
        <PdfViewer
          page={selectedIndex >= 0 ? pages[selectedIndex] : null}
          pageIndex={selectedIndex}
          modifications={modifications}
          renderPage={renderPage}
          activeTool={activeTool}
          onAddModification={handleAddModification}
        />
      </div>
    </>
  );
}

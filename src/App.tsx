import React, { useState, useCallback, useRef, useEffect } from "react";
import { T } from "./lib/i18n";
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
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile, readFile } from "@tauri-apps/plugin-fs";
import Dropzone from "./components/Dropzone";
import PageThumbnail from "./components/PageThumbnail";
import PdfViewer from "./components/PdfViewer";
import Toolbar from "./components/Toolbar";
import UpdateBanner from "./components/UpdateBanner";
import {
  extractPageInfos,
  compileNewPdf,
  PageInfo,
  PdfModification,
} from "./lib/pdfEngine";
import {
  checkForUpdates,
  shouldCheckVersion,
  UpdateInfo,
} from "./lib/versionCheck";

// Konfigurera pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

const OFFICE_EXTENSIONS = [".docx", ".doc", ".xlsx", ".xls"];
const PDF_EXTENSION = ".pdf";

function isOfficeFile(path: string): boolean {
  const lower = path.toLowerCase();
  return OFFICE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function isPdfFile(path: string): boolean {
  return path.toLowerCase().endsWith(PDF_EXTENSION);
}

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
  const [isDragOver, setIsDragOver] = useState(false);
  const [convertingFiles, setConvertingFiles] = useState<string[]>([]);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  // Cache för pdf.js dokument
  const pdfDocsCache = useRef<Map<number, pdfjsLib.PDFDocumentProxy>>(
    new Map()
  );

  // Versionskontroll mot GitHub Releases (var 24:e timme)
  useEffect(() => {
    if (shouldCheckVersion()) {
      checkForUpdates().then((result) => {
        if (result.updateAvailable && result.updateInfo) {
          setUpdateInfo(result.updateInfo);
          setShowUpdateBanner(true);
        }
      });
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Lägg till PDF-buffers i appen
  const addPdfBuffers = useCallback(
    async (newBuffers: ArrayBuffer[], newNames: string[]) => {
      const startIndex = sourceFiles.length;
      const allNewPages: PageInfo[] = [];

      for (let i = 0; i < newBuffers.length; i++) {
        const infos = await extractPageInfos(
          newBuffers[i],
          startIndex + i,
          newNames[i]
        );
        allNewPages.push(...infos);

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

  // Konvertera ett Office-dokument till PDF och lägg till i appen
  const convertAndAdd = useCallback(
    async (filePath: string) => {
      const fileName = filePath.split(/[/\\]/).pop() || filePath;
      setConvertingFiles((prev) => [...prev, fileName]);
      try {
        const pdfPath = await invoke<string>("convert_to_pdf", { filePath });
        const bytes = await readFile(pdfPath);
        const pdfName = fileName.replace(/\.(docx?|xlsx?)$/i, ".pdf");
        await addPdfBuffers([bytes.buffer as ArrayBuffer], [pdfName]);
      } catch (err) {
        alert(`${T("convert_error")}: ${fileName}\n\n${err}`);
      } finally {
        setConvertingFiles((prev) => prev.filter((n) => n !== fileName));
      }
    },
    [addPdfBuffers]
  );

  // Hantera filer från sökvägar (drag-drop och filväljare)
  const addFilesFromPaths = useCallback(
    async (paths: string[]) => {
      const pdfPaths = paths.filter(isPdfFile);
      const officePaths = paths.filter(isOfficeFile);

      // PDF-filer: läs direkt
      if (pdfPaths.length > 0) {
        const buffers: ArrayBuffer[] = [];
        const names: string[] = [];
        for (const p of pdfPaths) {
          const bytes = await readFile(p);
          buffers.push(bytes.buffer as ArrayBuffer);
          names.push(p.split(/[/\\]/).pop() || p);
        }
        await addPdfBuffers(buffers, names);
      }

      // Office-filer: konvertera en i taget
      for (const p of officePaths) {
        await convertAndAdd(p);
      }
    },
    [addPdfBuffers, convertAndAdd]
  );

  // Lyssna på Tauris OS-nivå drag & drop
  useEffect(() => {
    const appWindow = getCurrentWebviewWindow();
    const unlisten = appWindow.onDragDropEvent(async (event) => {
      const payload = event.payload as Record<string, unknown>;
      const eventType = (payload.type as string) ?? "";

      if (
        eventType.includes("enter") ||
        eventType.includes("over") ||
        eventType.includes("dragged")
      ) {
        setIsDragOver(true);
      } else if (
        eventType.includes("leave") ||
        eventType.includes("cancelled")
      ) {
        setIsDragOver(false);
      }

      const paths = (payload.paths as string[]) ?? [];
      if (
        paths.length > 0 &&
        (eventType.includes("drop") || eventType === "")
      ) {
        setIsDragOver(false);
        const supported = paths.filter(
          (p) => isPdfFile(p) || isOfficeFile(p)
        );
        if (supported.length > 0) {
          addFilesFromPaths(supported);
        }
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [addFilesFromPaths]);

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

      const pdfPage = await doc.getPage(pageIndex + 1);
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

  const handleClear = () => {
    if (!confirm(T("clear_confirm"))) return;
    setSourceFiles([]);
    setFileNames([]);
    setPages([]);
    setSelectedIndex(-1);
    setModifications([]);
    setActiveTool("select");
    pdfDocsCache.current.clear();
  };

  const handleExport = async () => {
    if (pages.length === 0) return;
    setExporting(true);

    try {
      const pdfBytes = await compileNewPdf(sourceFiles, pages, modifications);

      const filePath = await save({
        defaultPath: "LLT-PDF-export.pdf",
        filters: [{ name: T("pdf_document"), extensions: ["pdf"] }],
      });

      if (filePath) {
        await writeFile(filePath, pdfBytes);
        alert(T("pdf_saved"));
      }
    } catch (err) {
      console.error("Export misslyckades:", err);
      alert(T("export_failed"));
    } finally {
      setExporting(false);
    }
  };

  const isConverting = convertingFiles.length > 0;

  return (
    <>
      {showUpdateBanner && updateInfo && (
        <UpdateBanner
          newVersion={updateInfo.newVersion}
          downloadUrl={updateInfo.downloadUrl}
          onDismiss={() => setShowUpdateBanner(false)}
        />
      )}

      {/* Drop-overlay med pulsande kant */}
      {isDragOver && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            pointerEvents: "none",
            border: "3px solid var(--accent)",
            borderRadius: "8px",
            background: "rgba(91, 141, 239, 0.08)",
            animation: "dropPulse 1s ease-in-out infinite",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "var(--surface)",
              padding: "16px 32px",
              borderRadius: "var(--radius)",
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--accent)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            }}
          >
            {T("drop_files_here")}
          </div>
        </div>
      )}

      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onExport={handleExport}
        canExport={pages.length > 0 && !exporting && !isConverting}
        onUndo={handleUndo}
        canUndo={modifications.length > 0}
        onClear={handleClear}
        canClear={pages.length > 0 && !isConverting}
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
          <Dropzone onPathsAdded={addFilesFromPaths} isDragOver={isDragOver} />

          {/* Konverteringsstatus */}
          {isConverting && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "10px 12px",
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom:
                    convertingFiles.length > 0 ? "6px" : "0",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    border: "2px solid var(--accent)",
                    borderTopColor: "transparent",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <span>{T("converting")}...</span>
              </div>
              {convertingFiles.map((name) => (
                <div
                  key={name}
                  style={{
                    fontSize: "11px",
                    opacity: 0.7,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {name}
                </div>
              ))}
            </div>
          )}

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

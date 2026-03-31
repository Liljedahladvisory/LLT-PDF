import React, { useEffect, useRef, useState, useCallback } from "react";
import type { PageInfo, PdfModification } from "../lib/pdfEngine";

interface PdfViewerProps {
  page: PageInfo | null;
  pageIndex: number;
  modifications: PdfModification[];
  renderPage: (
    canvas: HTMLCanvasElement,
    fileIndex: number,
    pageIndex: number,
    scale?: number
  ) => void;
  activeTool: "select" | "mask" | "text";
  onAddModification: (mod: PdfModification) => void;
}

export default function PdfViewer({
  page,
  pageIndex,
  modifications,
  renderPage,
  activeTool,
  onAddModification,
}: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const scale = 1.5;

  // Rendera PDF-sidan
  useEffect(() => {
    if (canvasRef.current && page) {
      renderPage(
        canvasRef.current,
        page.sourceFileIndex,
        page.sourcePageIndex,
        scale
      );
    }
  }, [page, renderPage, scale]);

  // Rendera modifieringar som overlay
  useEffect(() => {
    const overlay = overlayRef.current;
    const pdfCanvas = canvasRef.current;
    if (!overlay || !pdfCanvas || !page) return;

    overlay.width = pdfCanvas.width;
    overlay.height = pdfCanvas.height;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const pageMods = modifications.filter((m) => m.pageIndex === pageIndex);
    for (const mod of pageMods) {
      if (mod.type === "mask" && mod.width && mod.height) {
        const c = mod.color ?? { r: 0, g: 0, b: 0 };
        ctx.fillStyle = `rgb(${c.r * 255},${c.g * 255},${c.b * 255})`;
        // PDF y-koordinat konverteras (PDF:0=botten, canvas:0=toppen)
        const canvasY = page.height * scale - mod.y - mod.height;
        ctx.fillRect(
          mod.x * scale,
          canvasY * scale,
          mod.width * scale,
          mod.height * scale
        );
      } else if (mod.type === "text" && mod.text) {
        ctx.fillStyle = "#000";
        ctx.font = `${(mod.size || 12) * scale}px Helvetica, sans-serif`;
        const canvasY = page.height * scale - mod.y;
        ctx.fillText(mod.text, mod.x * scale, canvasY * scale);
      }
    }
  }, [modifications, page, pageIndex, scale]);

  const getRelativePos = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale,
      };
    },
    [scale]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === "select" || !page) return;
    const pos = getRelativePos(e);
    setStartPos(pos);
    setCurrentPos(pos);
    setDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    setCurrentPos(getRelativePos(e));
  };

  const handleMouseUp = () => {
    if (!drawing || !page) return;
    setDrawing(false);

    if (activeTool === "mask") {
      const x = Math.min(startPos.x, currentPos.x);
      const canvasY = Math.min(startPos.y, currentPos.y);
      const w = Math.abs(currentPos.x - startPos.x);
      const h = Math.abs(currentPos.y - startPos.y);

      if (w > 2 && h > 2) {
        // Konvertera canvas-Y till PDF-Y
        const pdfY = page.height - canvasY - h;
        onAddModification({
          type: "mask",
          pageIndex,
          x,
          y: pdfY,
          width: w,
          height: h,
        });
      }
    } else if (activeTool === "text") {
      const pdfY = page.height - startPos.y;
      const text = window.prompt("Ange text:");
      if (text) {
        onAddModification({
          type: "text",
          pageIndex,
          x: startPos.x,
          y: pdfY,
          text,
          size: 14,
        });
      }
    }
  };

  if (!page) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
        }}
      >
        Valj en sida i panelen till vanster
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: "auto",
        display: "flex",
        justifyContent: "center",
        padding: "20px",
        background: "var(--bg)",
      }}
    >
      <div
        style={{ position: "relative", display: "inline-block" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <canvas ref={canvasRef} style={{ display: "block", borderRadius: "4px" }} />
        <canvas
          ref={overlayRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
          }}
        />
        {drawing && activeTool === "mask" && (
          <div
            style={{
              position: "absolute",
              left: Math.min(startPos.x, currentPos.x) * scale,
              top: Math.min(startPos.y, currentPos.y) * scale,
              width: Math.abs(currentPos.x - startPos.x) * scale,
              height: Math.abs(currentPos.y - startPos.y) * scale,
              background: "rgba(0,0,0,0.4)",
              border: "1px dashed var(--accent)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </div>
  );
}

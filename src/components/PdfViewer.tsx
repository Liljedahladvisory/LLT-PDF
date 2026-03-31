import React, { useEffect, useRef, useState, useCallback } from "react";
import type { PageInfo, PdfModification } from "../lib/pdfEngine";
import { T } from "../lib/i18n";

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
  const textInputRef = useRef<HTMLInputElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  // Text-input state
  const [textInput, setTextInput] = useState<{
    visible: boolean;
    x: number;
    y: number;
    pdfX: number;
    pdfY: number;
    value: string;
  }>({ visible: false, x: 0, y: 0, pdfX: 0, pdfY: 0, value: "" });
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
        const canvasY = page.height - mod.y - mod.height;
        ctx.fillRect(
          mod.x * scale,
          canvasY * scale,
          mod.width * scale,
          mod.height * scale
        );
      } else if (mod.type === "text" && mod.text) {
        ctx.fillStyle = "#000";
        ctx.font = `${(mod.size || 12) * scale}px Helvetica, sans-serif`;
        const canvasY = page.height - mod.y;
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
    if (activeTool === "select" || activeTool === "text" || !page) return;
    e.preventDefault();
    const pos = getRelativePos(e);
    setStartPos(pos);
    setCurrentPos(pos);
    setDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    e.preventDefault();
    setCurrentPos(getRelativePos(e));
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!drawing || !page) return;
    e.preventDefault();
    setDrawing(false);

    if (activeTool === "mask") {
      const x = Math.min(startPos.x, currentPos.x);
      const canvasY = Math.min(startPos.y, currentPos.y);
      const w = Math.abs(currentPos.x - startPos.x);
      const h = Math.abs(currentPos.y - startPos.y);

      if (w > 2 && h > 2) {
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
    }
  };

  const handleTextClick = (e: React.MouseEvent) => {
    if (activeTool !== "text" || !page) return;
    const pos = getRelativePos(e);
    const pdfY = page.height - pos.y;
    setTextInput({
      visible: true,
      x: pos.x * scale,
      y: pos.y * scale,
      pdfX: pos.x,
      pdfY,
      value: "",
    });
    // Fokusera input efter render
    setTimeout(() => textInputRef.current?.focus(), 50);
  };

  const commitText = () => {
    if (textInput.value.trim()) {
      onAddModification({
        type: "text",
        pageIndex,
        x: textInput.pdfX,
        y: textInput.pdfY,
        text: textInput.value,
        size: 14,
      });
    }
    setTextInput({ visible: false, x: 0, y: 0, pdfX: 0, pdfY: 0, value: "" });
  };

  const getCursor = () => {
    if (activeTool === "mask") return "crosshair";
    if (activeTool === "text") return "text";
    return "default";
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
        {T("select_page")}
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
        style={{
          position: "relative",
          display: "inline-block",
          cursor: getCursor(),
        }}
      >
        <canvas ref={canvasRef} style={{ display: "block", borderRadius: "4px" }} />
        {/* Overlay för modifieringar */}
        <canvas
          ref={overlayRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
          }}
        />
        {/* Interaktionslager */}
        <div
          onClick={handleTextClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            cursor: getCursor(),
          }}
        />
        {/* Visuell förhandsvisning vid maskering */}
        {drawing && activeTool === "mask" && (
          <div
            style={{
              position: "absolute",
              left: Math.min(startPos.x, currentPos.x) * scale,
              top: Math.min(startPos.y, currentPos.y) * scale,
              width: Math.abs(currentPos.x - startPos.x) * scale,
              height: Math.abs(currentPos.y - startPos.y) * scale,
              background: "rgba(0,0,0,0.5)",
              border: "2px dashed #ff8c00",
              pointerEvents: "none",
            }}
          />
        )}
        {/* Inline text-input */}
        {textInput.visible && (
          <div
            style={{
              position: "absolute",
              left: textInput.x,
              top: textInput.y - 30,
              zIndex: 10,
              display: "flex",
              gap: "4px",
            }}
          >
            <input
              ref={textInputRef}
              type="text"
              value={textInput.value}
              onChange={(e) =>
                setTextInput((prev) => ({ ...prev, value: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") commitText();
                if (e.key === "Escape")
                  setTextInput({
                    visible: false,
                    x: 0,
                    y: 0,
                    pdfX: 0,
                    pdfY: 0,
                    value: "",
                  });
              }}
              placeholder={T("enter_text")}
              style={{
                padding: "4px 8px",
                fontSize: "14px",
                border: "2px solid #ff8c00",
                borderRadius: "4px",
                background: "#fff",
                color: "#000",
                outline: "none",
                minWidth: "180px",
              }}
            />
            <button
              onClick={commitText}
              style={{
                padding: "4px 10px",
                background: "#ff8c00",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

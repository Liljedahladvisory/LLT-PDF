import React, { useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PageInfo } from "../lib/pdfEngine";

interface PageThumbnailProps {
  page: PageInfo;
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  renderPage: (
    canvas: HTMLCanvasElement,
    fileIndex: number,
    pageIndex: number
  ) => void;
}

export default function PageThumbnail({
  page,
  index,
  isSelected,
  onSelect,
  onRemove,
  renderPage,
}: PageThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    border: isSelected
      ? "2px solid var(--accent)"
      : "2px solid transparent",
    borderRadius: "var(--radius)",
    background: "var(--surface)",
    padding: "6px",
    cursor: "grab",
    position: "relative",
  };

  useEffect(() => {
    if (canvasRef.current) {
      renderPage(canvasRef.current, page.sourceFileIndex, page.sourcePageIndex);
    }
  }, [page.sourceFileIndex, page.sourcePageIndex, renderPage]);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div onClick={() => onSelect(index)}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", display: "block", borderRadius: "4px" }}
        />
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            marginTop: "4px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {page.label}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(index);
        }}
        style={{
          position: "absolute",
          top: "4px",
          right: "4px",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: "var(--danger)",
          color: "#fff",
          fontSize: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        x
      </button>
    </div>
  );
}

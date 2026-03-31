import React, { useCallback, useRef, useState } from "react";

interface DropzoneProps {
  onFilesAdded: (files: File[]) => void;
}

export default function Dropzone({ onFilesAdded }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === "application/pdf"
      );
      if (files.length > 0) onFilesAdded(files);
    },
    [onFilesAdded]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(
        (f) => f.type === "application/pdf"
      );
      if (files.length > 0) onFilesAdded(files);
    }
  };

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${isDragging ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "var(--radius)",
        padding: "24px 16px",
        textAlign: "center",
        cursor: "pointer",
        background: isDragging ? "rgba(91,141,239,0.08)" : "transparent",
        transition: "all 0.2s",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf"
        style={{ display: "none" }}
        onChange={handleInputChange}
      />
      <div style={{ fontSize: "28px", marginBottom: "8px" }}>+</div>
      <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
        Dra PDF-filer hit eller klicka
      </div>
    </div>
  );
}

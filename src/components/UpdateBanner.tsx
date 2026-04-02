import React from "react";
import { T } from "../lib/i18n";
import { openDownloadPage } from "../lib/versionCheck";

interface UpdateBannerProps {
  newVersion: string;
  downloadUrl: string;
  onDismiss: () => void;
}

export default function UpdateBanner({
  newVersion,
  downloadUrl,
  onDismiss,
}: UpdateBannerProps) {
  const handleUpdate = async () => {
    await openDownloadPage(downloadUrl);
  };

  return (
    <div
      style={{
        background: "var(--accent)",
        color: "white",
        padding: "10px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "13px",
        gap: "12px",
      }}
    >
      <span>
        {T("update_available")}: <strong>v{newVersion}</strong>
      </span>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={handleUpdate}
          style={{
            background: "white",
            color: "var(--accent)",
            border: "none",
            padding: "5px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "12px",
          }}
        >
          {T("update_now")}
        </button>
        <button
          onClick={onDismiss}
          style={{
            background: "rgba(255,255,255,0.2)",
            color: "white",
            border: "none",
            padding: "5px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          {T("dismiss")}
        </button>
      </div>
    </div>
  );
}

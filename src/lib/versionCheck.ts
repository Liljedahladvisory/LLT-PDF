import { fetch } from "@tauri-apps/plugin-http";
import { open } from "@tauri-apps/plugin-shell";

const GITHUB_API_URL =
  "https://api.github.com/repos/Liljedahladvisory/LLT-PDF/releases/latest";
const VERSION_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 timmar
const LAST_CHECK_KEY = "llt-pdf-last-version-check";
const CURRENT_VERSION = "0.2.0"; // Maste matcha package.json och tauri.conf.json

export interface UpdateInfo {
  newVersion: string;
  downloadUrl: string;
  releaseNotes: string;
}

export interface VersionCheckResult {
  updateAvailable: boolean;
  updateInfo?: UpdateInfo;
  error?: string;
}

/** Kolla om 24 timmar har gatt sedan senaste check */
export function shouldCheckVersion(): boolean {
  const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
  if (!lastCheck) return true;
  const lastCheckTime = parseInt(lastCheck, 10);
  return Date.now() - lastCheckTime >= VERSION_CHECK_INTERVAL_MS;
}

/** Jamfor tva semantic versions — returnerar true om newVersion > currentVersion */
export function isNewerVersion(
  newVersion: string,
  currentVersion: string
): boolean {
  const cleanNew = newVersion.replace(/^v/, "");
  const cleanCurrent = currentVersion.replace(/^v/, "");
  const newParts = cleanNew.split(".").map(Number);
  const currentParts = cleanCurrent.split(".").map(Number);

  for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
    const n = newParts[i] || 0;
    const c = currentParts[i] || 0;
    if (n > c) return true;
    if (n < c) return false;
  }
  return false;
}

/** Kolla GitHub Releases API efter ny version */
export async function checkForUpdates(): Promise<VersionCheckResult> {
  localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());

  try {
    const resp = await fetch(GITHUB_API_URL, {
      method: "GET",
      headers: { Accept: "application/vnd.github.v3+json" },
      maxRedirections: 5,
    });

    if (!resp.ok) {
      console.error("[VersionCheck] GitHub API error:", resp.status);
      return { updateAvailable: false, error: `HTTP ${resp.status}` };
    }

    const data = (await resp.json()) as {
      tag_name: string;
      html_url: string;
      body: string;
    };

    if (!isNewerVersion(data.tag_name, CURRENT_VERSION)) {
      return { updateAvailable: false };
    }

    return {
      updateAvailable: true,
      updateInfo: {
        newVersion: data.tag_name.replace(/^v/, ""),
        downloadUrl: "https://github.com/Liljedahladvisory/LLT-PDF/releases/latest",
        releaseNotes: data.body || "",
      },
    };
  } catch (err) {
    console.error("[VersionCheck] Failed:", err);
    return { updateAvailable: false, error: String(err) };
  }
}

/** Oppna release-sidan i standardwebblasaren */
export async function openDownloadPage(url: string): Promise<void> {
  try {
    await open(url);
  } catch (err) {
    console.error("[VersionCheck] Could not open browser:", err);
  }
}

export function getCurrentVersion(): string {
  return CURRENT_VERSION;
}

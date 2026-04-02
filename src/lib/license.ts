import { invoke } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbz-GgPCB5f1BwII7OLg8aM38nbTiiF-tUxdgspHhx84H27LBMdSR2J68rbgiYzBEvRq4Q/exec";
const REVOCATION_URL =
  "https://raw.githubusercontent.com/Liljedahladvisory/LLT-PDF/main/revoked.json";

export interface LicenseStatus {
  valid: boolean;
  message: string;
  email: string | null;
  expires: string | null;
  company: string | null;
}

export async function checkLicense(): Promise<LicenseStatus> {
  return invoke<LicenseStatus>("check_license");
}

export async function activateLicense(key: string): Promise<LicenseStatus> {
  return invoke<LicenseStatus>("activate_license", { key });
}

export async function getMachineId(): Promise<string> {
  return invoke<string>("get_machine_id");
}

export async function generateTrialKey(
  name: string,
  email: string,
  company: string,
  days: number
): Promise<string> {
  return invoke<string>("generate_trial_key", { name, email, company, days });
}

export async function sendVerificationCode(
  email: string,
  code: string,
  name: string
): Promise<boolean> {
  if (!WEBHOOK_URL || WEBHOOK_URL.startsWith("__")) return false;
  try {
    const resp = await tauriFetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "send_verification_email",
        email,
        name,
        code,
      }),
      maxRedirections: 5,
    });
    if (!resp.ok) {
      console.error("[Verification] HTTP status:", resp.status, resp.statusText);
      return false;
    }
    const text = await resp.text();
    console.log("[Verification] Response:", text);
    try {
      const data = JSON.parse(text);
      return data.status === "ok";
    } catch {
      console.error("[Verification] Non-JSON response:", text);
      return false;
    }
  } catch (e) {
    console.error("[Verification] Webhook error:", e);
    return false;
  }
}

export async function notifyAdmin(regData: Record<string, string>): Promise<void> {
  if (!WEBHOOK_URL || WEBHOOK_URL.startsWith("__")) return;
  try {
    await tauriFetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(regData),
      maxRedirections: 5,
    });
  } catch (e) {
    console.error("[NotifyAdmin] Webhook error:", e);
  }
}

export async function checkRevocation(email: string): Promise<boolean> {
  try {
    const resp = await tauriFetch(REVOCATION_URL, {
      headers: { "User-Agent": "LLT-PDF/1.0" },
      maxRedirections: 5,
    });
    const data = await resp.json();
    const revoked: string[] = (data.revoked || []).map((e: string) =>
      e.toLowerCase().trim()
    );
    return revoked.includes(email.toLowerCase().trim());
  } catch {
    return false;
  }
}

export function generateCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

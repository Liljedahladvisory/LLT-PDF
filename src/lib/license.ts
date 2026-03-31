import { invoke } from "@tauri-apps/api/core";

// Placeholder — ersätt med din GAS-webhook URL efter driftsättning
const WEBHOOK_URL = "__REPLACE_WITH_GAS_WEBHOOK_URL__";
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
    const resp = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send_verification_email",
        email,
        name,
        code,
      }),
    });
    const data = await resp.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

export async function notifyAdmin(regData: Record<string, string>): Promise<void> {
  if (!WEBHOOK_URL || WEBHOOK_URL.startsWith("__")) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(regData),
    });
  } catch {
    // fire-and-forget
  }
}

export async function checkRevocation(email: string): Promise<boolean> {
  try {
    const resp = await fetch(REVOCATION_URL, {
      headers: { "User-Agent": "LLT-PDF/1.0" },
    });
    const data = await resp.json();
    const revoked: string[] = (data.revoked || []).map((e: string) =>
      e.toLowerCase().trim()
    );
    return revoked.includes(email.toLowerCase().trim());
  } catch {
    return false; // graceful offline
  }
}

export function generateCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

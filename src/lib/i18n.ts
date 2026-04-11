const strings: Record<string, Record<string, string>> = {
  sv: {
    // Toolbar
    select: "Markera",
    mask: "Maskera",
    text: "Text",
    undo: "Ångra",
    clear: "Rensa",
    clear_confirm: "Vill du ta bort alla uppladdade PDF-filer och börja om?",
    export_pdf: "Exportera PDF",

    // Dropzone
    drop_hint: "Dra PDF-filer hit eller klicka",

    // PdfViewer
    select_page: "Välj en sida i panelen till vänster",
    enter_text: "Skriv text...",

    // Export
    pdf_saved: "PDF sparad!",
    export_failed: "Kunde inte exportera PDF. Se konsolen för detaljer.",
    pdf_document: "PDF-dokument",

    // Drop overlay
    drop_files_here: "Släpp PDF-filer här",

    // Language dialog
    lang_title: "LLT PDF",
    lang_prompt: "Välj språk / Select language",
    lang_sv: "Svenska",
    lang_en: "English",

    // Version check
    update_available: "Ny version tillgänglig",
    update_now: "Uppdatera",
    dismiss: "Stäng",

    // License screens
    loading: "Laddar...",
    license_revoked: "Din licens har spärrats. Kontakta Liljedahl Legal Tech.",
    contact_renewal: "Kontakta svante@liljedahladvisory.se för att förnya din licens.",
    enter_new_key: "Ange ny licensnyckel",
    activate: "Aktivera",
    back: "Tillbaka",
    activating: "Aktiverar...",
    paste_key: "Ange din licensnyckel för att aktivera appen:",
    key_placeholder: "LLT.XXXX.XXXX.XXXX...",
    invalid_key: "Klistra in din licensnyckel.",
    activation_failed: "Aktivering misslyckades.",
  },
  en: {
    // Toolbar
    select: "Select",
    mask: "Mask",
    text: "Text",
    undo: "Undo",
    clear: "Clear",
    clear_confirm: "Remove all uploaded PDFs and start over?",
    export_pdf: "Export PDF",

    // Dropzone
    drop_hint: "Drag PDF files here or click",

    // PdfViewer
    select_page: "Select a page in the left panel",
    enter_text: "Enter text...",

    // Export
    pdf_saved: "PDF saved!",
    export_failed: "Could not export PDF. See console for details.",
    pdf_document: "PDF Document",

    // Drop overlay
    drop_files_here: "Drop PDF files here",

    // Language dialog
    lang_title: "LLT PDF",
    lang_prompt: "Select language / Valj sprak",
    lang_sv: "Svenska",
    lang_en: "English",

    // Version check
    update_available: "New version available",
    update_now: "Update Now",
    dismiss: "Dismiss",

    // License screens
    loading: "Loading...",
    license_revoked: "Your license has been revoked. Contact Liljedahl Legal Tech.",
    contact_renewal: "Contact svante@liljedahladvisory.se to renew your license.",
    enter_new_key: "Enter new license key",
    activate: "Activate",
    back: "Back",
    activating: "Activating...",
    paste_key: "Enter your license key to activate the app:",
    key_placeholder: "LLT.XXXX.XXXX.XXXX...",
    invalid_key: "Please paste your license key.",
    activation_failed: "Activation failed.",
  },
};

let currentLang = "en";

export function setLanguage(lang: string) {
  currentLang = lang in strings ? lang : "en";
}

export function getLanguage(): string {
  return currentLang;
}

export function T(key: string): string {
  return strings[currentLang]?.[key] ?? strings["en"]?.[key] ?? key;
}

/**
 * LLT PDF — Google Apps Script (Webhook)
 * ========================================
 * Hanterar e-postverifiering och registreringsnotifikationer.
 *
 * SETUP:
 * 1. Gå till script.google.com → Nytt projekt
 * 2. Klistra in detta script
 * 3. Kör testSkickaEmail() en gång för att auktorisera
 * 4. Distribuera → Ny driftsättning → Webbapp
 *    - Kör som: Jag
 *    - Åtkomst: Alla
 * 5. Kopiera URL:en till WEBHOOK_URL i appen
 */

var ADMIN_EMAIL = "svante@liljedahladvisory.se";
var SHEET_NAME  = "Registreringar";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === "send_verification_email") {
      return handleVerificationEmail(data);
    }
    return handleRegistration(data);
  } catch (err) {
    return jsonResponse({status: "error", message: err.toString()});
  }
}

function doGet(e) {
  return ContentService.createTextOutput("LLT PDF - OK");
}

function handleVerificationEmail(data) {
  var email = data.email || "";
  var name  = data.name  || "Anvandare";
  var code  = data.code  || "????";

  if (!email || email.indexOf("@") === -1) {
    return jsonResponse({status: "error", message: "Ogiltig e-postadress"});
  }

  var subject = "LLT PDF - Din verifieringskod";
  var body = "Hej " + name + ",\n\n" +
    "Tack for att du registrerar dig for LLT PDF.\n\n" +
    "Din verifieringskod ar:\n\n" +
    "        " + code + "\n\n" +
    "Ange koden i appen for att slutfora din registrering.\n\n" +
    "Med vanliga halsningar,\n" +
    "Liljedahl Legal Tech\n" +
    "www.liljedahladvisory.se";

  MailApp.sendEmail(email, subject, body, {name: "Liljedahl Legal Tech"});
  return jsonResponse({status: "ok"});
}

function handleRegistration(data) {
  try {
    var sheet = getOrCreateSheet();
    sheet.appendRow([
      new Date().toISOString(),
      data.name        || "",
      data.company     || "",
      data.address     || "",
      data.org_nr      || "",
      data.email       || "",
      data.registered  || "",
      data.license_expires || "",
      data.machine_id  || ""
    ]);
  } catch (err) {
    Logger.log("Sheet error: " + err);
  }

  try {
    var adminSubject = "LLT PDF — Ny registrering: " + (data.name || "Okand") +
                       " (" + (data.company || "") + ")";
    var adminBody =
      "Ny anvandare har registrerat sig for LLT PDF.\n\n" +
      "Namn:    " + (data.name    || "-") + "\n" +
      "Foretag: " + (data.company || "-") + "\n" +
      "Adress:  " + (data.address || "-") + "\n" +
      "Org.nr:  " + (data.org_nr  || "-") + "\n" +
      "E-post:  " + (data.email   || "-") + "\n" +
      "Registrerad: " + (data.registered || "-") + "\n" +
      "Licens t.o.m.: " + (data.license_expires || "-") + "\n";
    MailApp.sendEmail(ADMIN_EMAIL, adminSubject, adminBody, {name: "Liljedahl Legal Tech"});
  } catch (err) {
    Logger.log("Admin email error: " + err);
  }

  return jsonResponse({status: "ok"});
}

function getOrCreateSheet() {
  var files = DriveApp.getFilesByName("LLT PDF Registreringar");
  var ss = files.hasNext()
    ? SpreadsheetApp.open(files.next())
    : SpreadsheetApp.create("LLT PDF Registreringar");

  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Tidpunkt","Namn","Foretag","Adress","Org.nr",
                     "E-post","Registrerad","Licens t.o.m.","Maskin-ID"]);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function testSkickaEmail() {
  MailApp.sendEmail(
    "svante@liljedahladvisory.se",
    "Test LLT PDF",
    "Om du ser detta fungerar mejlutskicket for LLT PDF!",
    {name: "Liljedahl Legal Tech"}
  );
}

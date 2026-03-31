#!/usr/bin/env python3
"""
LLT PDF — License Key Generator
=================================
Admin tool for Svante / Liljedahl Advisory AB.

Generate a 12-month license:
    python generate_license.py "Kund AB" "kund@example.com"

Generate with custom duration:
    python generate_license.py "Kund AB" "kund@example.com" --months 24

List all generated licenses:
    python generate_license.py --list
"""

import argparse
import base64
import hashlib
import hmac
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# HMAC secret — lagras i license_secret.py (committas ALDRIG)
try:
    from license_secret import LICENSE_HMAC_SECRET as _LICENSE_HMAC_SECRET
except ImportError:
    raise RuntimeError("license_secret.py saknas — den far aldrig committas till git.")

ADMIN_DIR = Path.home() / ".llt-pdf-admin"
LICENSE_LOG_FILE = ADMIN_DIR / "licenses.json"


def _load_license_log() -> list:
    if LICENSE_LOG_FILE.exists():
        return json.loads(LICENSE_LOG_FILE.read_text())
    return []


def _save_license_log(log: list):
    ADMIN_DIR.mkdir(parents=True, exist_ok=True)
    LICENSE_LOG_FILE.write_text(json.dumps(log, indent=2, ensure_ascii=False))


def cmd_generate(company: str, email: str, months: int):
    """Generate a signed license key."""
    created = datetime.now().strftime("%Y-%m-%d")
    expires = (datetime.now() + timedelta(days=months * 30)).strftime("%Y-%m-%d")

    payload = {
        "company": company,
        "created": created,
        "email": email,
        "expires": expires,
    }
    payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    payload_bytes = payload_json.encode("utf-8")

    sig = hmac.new(_LICENSE_HMAC_SECRET, payload_bytes, hashlib.sha256).digest()

    combined = payload_bytes + b"|" + sig
    key_b64 = base64.urlsafe_b64encode(combined).decode("ascii")

    chunks = [key_b64[i:i+4] for i in range(0, len(key_b64), 4)]
    license_key = "LLT." + ".".join(chunks)

    log = _load_license_log()
    log.append({
        "company": company,
        "email": email,
        "created": created,
        "expires": expires,
        "key_preview": license_key[:20] + "...",
        "full_key": license_key,
    })
    _save_license_log(log)

    print()
    print("=" * 60)
    print("  LICENSNYCKEL — LLT PDF")
    print("=" * 60)
    print(f"  Kund:        {company}")
    print(f"  E-post:      {email}")
    print(f"  Skapad:      {created}")
    print(f"  Galler till: {expires}")
    print("-" * 60)
    print()
    print(license_key)
    print()
    print("-" * 60)
    print("  Skicka nyckeln ovan till kunden.")
    print("=" * 60)


def cmd_list():
    """List all generated licenses."""
    log = _load_license_log()
    if not log:
        print("Inga licenser genererade annu.")
        return

    print(f"\n{'Foretag':<25} {'E-post':<30} {'Skapad':<12} {'Utgar':<12}")
    print("-" * 80)
    for entry in log:
        print(f"{entry['company']:<25} {entry['email']:<30} "
              f"{entry['created']:<12} {entry['expires']:<12}")
    print(f"\nTotalt: {len(log)} licenser")


def main():
    parser = argparse.ArgumentParser(
        description="LLT PDF — Licensgenerator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("company", nargs="?", help="Kundforetag")
    parser.add_argument("email", nargs="?", help="Kundens e-post")
    parser.add_argument("--months", type=int, default=12,
                        help="Licensens giltighetstid i manader (default: 12)")
    parser.add_argument("--list", action="store_true",
                        help="Lista alla genererade licenser")

    args = parser.parse_args()

    if args.list:
        cmd_list()
    elif args.company and args.email:
        cmd_generate(args.company, args.email, args.months)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

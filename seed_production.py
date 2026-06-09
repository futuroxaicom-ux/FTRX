#!/usr/bin/env python3
"""
FuturoX AI — Skrypt seedujący bazę produkcyjną
================================================
Uruchom JEDNORAZOWO po pierwszym deploy'u na futuroxai.com, aby wgrać
dane z lokalnej bazy deweloperskiej do produkcji.

Użycie:
  python3 seed_production.py

Wymagania:
  pip install pymongo

Skrypt jest idempotentny — nie duplikuje rekordów (sprawdza po unikalnym polu).
"""

import json
import sys
from pathlib import Path

try:
    import pymongo
except ImportError:
    print("Brak pymongo. Zainstaluj: pip install pymongo")
    sys.exit(1)

EXPORT_FILE = Path(__file__).parent / "db_export.json"

MONGO_URI = "mongodb://localhost:27017"
DB_NAME   = "futurox_db"

UPSERT_KEYS = {
    "update_requests": "id",
    "declarations":    "declaration_id",
    "declarations2":   "declaration_id",
    "bot_orders":      "order_id",
    "whitelist":       "wallet",
}

def seed():
    if not EXPORT_FILE.exists():
        print(f"Plik eksportu nie istnieje: {EXPORT_FILE}")
        sys.exit(1)

    with open(EXPORT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    client = pymongo.MongoClient(MONGO_URI)
    db = client[DB_NAME]

    total_inserted = 0
    total_skipped  = 0

    for col_name, docs in data.items():
        if not docs:
            print(f"  {col_name}: brak danych — pomijam")
            continue

        key = UPSERT_KEYS.get(col_name)
        collection = db[col_name]
        inserted = 0
        skipped  = 0

        for doc in docs:
            if key and key in doc:
                existing = collection.find_one({key: doc[key]})
                if existing:
                    skipped += 1
                    continue
            collection.insert_one({k: v for k, v in doc.items() if k != "_id"})
            inserted += 1

        print(f"  {col_name}: {inserted} wgranych, {skipped} już istniało")
        total_inserted += inserted
        total_skipped  += skipped

    print(f"\nGotowe — łącznie: {total_inserted} wgranych, {total_skipped} pominiętych (duplikaty).")
    client.close()

if __name__ == "__main__":
    print("=== FuturoX AI — seed produkcyjny ===")
    print(f"Baza: {MONGO_URI} / {DB_NAME}")
    print(f"Plik: {EXPORT_FILE}\n")
    seed()

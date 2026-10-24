#!/usr/bin/env python3
"""Create a consistent SQLite backup using SQLite's online backup API.

Backups contain user account metadata, password hashes, sessions, assessment records,
and audit events. Store them on restricted, encrypted backup storage and copy them
off-host; a backup in the same Docker volume is not disaster recovery.
"""
from __future__ import annotations

import argparse
import hashlib
import os
import sqlite3
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create and verify a consistent database backup.")
    parser.add_argument("--output-dir", required=True,
                        help="Restricted durable backup directory, preferably on a separate mounted volume.")
    return parser.parse_args()


def main_cli() -> int:
    args = parse_args()
    source_path = Path(os.getenv("CLINICAL_SIM_DB", str(Path(__file__).resolve().parents[1] / "backend" / "clinical_sim.db")))
    if not source_path.is_file():
        raise SystemExit(f"Database file does not exist: {source_path}")
    output_dir = Path(args.output_dir)
    output_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    final_path = output_dir / f"clinical_sim_{timestamp}.sqlite3"
    if final_path.exists():
        raise SystemExit(f"Backup destination already exists: {final_path}")

    fd, temporary_name = tempfile.mkstemp(prefix=".clinical_sim_backup_", suffix=".tmp", dir=output_dir)
    os.close(fd)
    temporary_path = Path(temporary_name)
    try:
        source_uri = f"file:{source_path.resolve().as_posix()}?mode=ro"
        with sqlite3.connect(source_uri, uri=True, timeout=30) as source:
            with sqlite3.connect(temporary_path, timeout=30) as destination:
                source.backup(destination, pages=256, sleep=0.05)
                destination.commit()
                integrity = destination.execute("PRAGMA integrity_check").fetchone()[0]
                if integrity != "ok":
                    raise RuntimeError(f"Backup integrity check failed: {integrity}")
        os.chmod(temporary_path, 0o600)
        os.replace(temporary_path, final_path)
        digest = hashlib.sha256(final_path.read_bytes()).hexdigest()
        print(f"Backup verified: {final_path}")
        print(f"SHA-256: {digest}")
        print("Copy this file to encrypted off-host storage; retain the checksum with the backup record.")
        return 0
    except BaseException:
        try:
            temporary_path.unlink(missing_ok=True)
        except OSError:
            pass
        raise


if __name__ == "__main__":
    raise SystemExit(main_cli())

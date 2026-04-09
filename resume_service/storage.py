from __future__ import annotations

import json
import sqlite3
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import re
from threading import Lock
from uuid import uuid4

from .schemas import (
    CandidateType,
    NormalizedResume,
    ParseResumeResponse,
    ParserMetadata,
    ResumeListItem,
    ResumeListResponse,
    ResumeQualityResult,
)

DATA_DIR = Path(__file__).resolve().parent / "data"
RESUME_STORE_DIR = DATA_DIR / "resumes"
DB_PATH = DATA_DIR / "resume_catalog.sqlite3"
_STORAGE_READY = False
_DB_LOCK = Lock()
_CONNECTION: sqlite3.Connection | None = None


@dataclass(slots=True)
class StoredResume:
    resume_id: str
    candidate_type: CandidateType
    normalized_resume: NormalizedResume
    resume_text: str
    parser_metadata: ParserMetadata
    resume_quality: ResumeQualityResult
    duplicate_of_resume_id: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


def init_storage() -> None:
    global _STORAGE_READY
    if _STORAGE_READY:
        return
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    RESUME_STORE_DIR.mkdir(parents=True, exist_ok=True)
    try:
        _initialize_database()
    except sqlite3.OperationalError:
        _reset_database_files()
        _initialize_database()
    _STORAGE_READY = True


def save_parsed_resume(response: ParseResumeResponse) -> None:
    init_storage()
    now = _utc_now()
    fingerprint = response.parser_metadata.content_fingerprint

    with _DB_LOCK:
        connection = _connect()
        duplicate_of_resume_id = _resolve_duplicate_resume_id(connection, response.resume_id, fingerprint)
        connection.execute(
            """
            INSERT INTO parsed_resumes (
                resume_id,
                candidate_type,
                normalized_resume_json,
                parser_metadata_json,
                resume_quality_json,
                resume_text,
                filename,
                full_name,
                current_role,
                content_fingerprint,
                duplicate_of_resume_id,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(resume_id) DO UPDATE SET
                candidate_type = excluded.candidate_type,
                normalized_resume_json = excluded.normalized_resume_json,
                parser_metadata_json = excluded.parser_metadata_json,
                resume_quality_json = excluded.resume_quality_json,
                resume_text = excluded.resume_text,
                filename = excluded.filename,
                full_name = excluded.full_name,
                current_role = excluded.current_role,
                content_fingerprint = excluded.content_fingerprint,
                duplicate_of_resume_id = excluded.duplicate_of_resume_id,
                updated_at = excluded.updated_at
            """,
            (
                response.resume_id,
                response.candidate_type.value,
                json.dumps(response.normalized_resume.model_dump()),
                json.dumps(response.parser_metadata.model_dump()),
                json.dumps(response.resume_quality.model_dump()),
                response.parser_metadata.extracted_text,
                response.parser_metadata.filename,
                response.normalized_resume.full_name,
                response.normalized_resume.current_role,
                fingerprint,
                duplicate_of_resume_id,
                now,
                now,
            ),
        )
        _reconcile_duplicate_chain(connection, fingerprint)
        connection.commit()


def load_parsed_resume(resume_id: str) -> StoredResume | None:
    init_storage()
    with _DB_LOCK:
        connection = _connect()
        row = connection.execute(
            "SELECT * FROM parsed_resumes WHERE resume_id = ?",
            (resume_id,),
        ).fetchone()
    if row is None:
        return None
    return _stored_resume_from_row(row)


def list_parsed_resumes(*, page: int, page_size: int) -> ResumeListResponse:
    init_storage()
    offset = max(0, (page - 1) * page_size)
    with _DB_LOCK:
        connection = _connect()
        total = int(connection.execute("SELECT COUNT(*) FROM parsed_resumes").fetchone()[0])
        rows = connection.execute(
            """
            SELECT resume_id, candidate_type, full_name, current_role, filename, content_fingerprint,
                   duplicate_of_resume_id, created_at, updated_at, parser_metadata_json
            FROM parsed_resumes
            ORDER BY updated_at DESC, resume_id DESC
            LIMIT ? OFFSET ?
            """,
            (page_size, offset),
        ).fetchall()

    items: list[ResumeListItem] = []
    for row in rows:
        parser_metadata = ParserMetadata.model_validate(json.loads(row["parser_metadata_json"]))
        items.append(
            ResumeListItem(
                resume_id=row["resume_id"],
                candidate_type=CandidateType(row["candidate_type"]),
                full_name=row["full_name"],
                current_role=row["current_role"],
                filename=row["filename"],
                extractor_name=parser_metadata.extractor_name,
                page_count=parser_metadata.page_count,
                content_fingerprint=row["content_fingerprint"],
                duplicate_of_resume_id=row["duplicate_of_resume_id"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
        )
    return ResumeListResponse(page=page, page_size=page_size, total=total, items=items)


def migrate_legacy_json_store(*, retire_legacy_files: bool = False) -> dict[str, int | str]:
    init_storage()
    run_id = uuid4().hex
    started_at = _utc_now()
    status = "running"
    imported = 0
    skipped = 0
    failed = 0
    retired = 0
    files = sorted(RESUME_STORE_DIR.glob("*.json"))
    error_message: str | None = None

    _start_migration_run(
        run_id=run_id,
        started_at=started_at,
        source_dir=str(RESUME_STORE_DIR),
        retire_legacy_files=retire_legacy_files,
        files_discovered=len(files),
    )

    try:
        for path in files:
            try:
                stored = json.loads(path.read_text(encoding="utf-8"))
                response = ParseResumeResponse(
                    resume_id=stored["resume_id"],
                    candidate_type=CandidateType(stored["candidate_type"]),
                    normalized_resume=NormalizedResume.model_validate(stored["normalized_resume"]),
                    warnings=stored.get("warnings", []),
                    missing_fields=stored.get("missing_fields", []),
                    resume_quality=ResumeQualityResult.model_validate(stored["resume_quality"]),
                    parser_metadata=ParserMetadata.model_validate(stored["parser_metadata"]),
                )
            except Exception:
                failed += 1
                continue

            existing = load_parsed_resume(response.resume_id)
            if existing is not None:
                skipped += 1
                continue

            save_parsed_resume(response)
            imported += 1

            if retire_legacy_files:
                _retire_legacy_json(path, run_id)
                retired += 1
        status = "success"
    except Exception as exc:
        status = "failed"
        error_message = str(exc)
    finally:
        finished_at = _utc_now()
        _finish_migration_run(
            run_id=run_id,
            finished_at=finished_at,
            status=status,
            imported=imported,
            skipped=skipped,
            failed=failed,
            retired=retired,
            error_message=error_message,
        )

    return {
        "run_id": run_id,
        "status": status,
        "files_discovered": len(files),
        "imported_count": imported,
        "skipped_count": skipped,
        "failed_count": failed,
        "retired_count": retired,
    }


def load_migration_run(run_id: str) -> dict[str, str | int] | None:
    init_storage()
    with _DB_LOCK:
        row = _connect().execute("SELECT * FROM migration_runs WHERE run_id = ?", (run_id,)).fetchone()
    if row is None:
        return None
    return dict(row)


def resume_store_path(resume_id: str) -> Path:
    safe_id = re.sub(r"[^A-Za-z0-9._-]", "_", resume_id).strip("._") or "resume"
    return RESUME_STORE_DIR / f"{safe_id}.json"


def _connect() -> sqlite3.Connection:
    global _CONNECTION
    if _CONNECTION is None:
        _CONNECTION = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
        _CONNECTION.row_factory = sqlite3.Row
    return _CONNECTION


def _stored_resume_from_row(row: sqlite3.Row) -> StoredResume:
    return StoredResume(
        resume_id=row["resume_id"],
        candidate_type=CandidateType(row["candidate_type"]),
        normalized_resume=NormalizedResume.model_validate(json.loads(row["normalized_resume_json"])),
        parser_metadata=ParserMetadata.model_validate(json.loads(row["parser_metadata_json"])),
        resume_quality=ResumeQualityResult.model_validate(json.loads(row["resume_quality_json"])),
        resume_text=row["resume_text"],
        duplicate_of_resume_id=row["duplicate_of_resume_id"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _initialize_database() -> None:
    with _DB_LOCK:
        connection = _connect()
        connection.execute("PRAGMA journal_mode=MEMORY")
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS parsed_resumes (
                resume_id TEXT PRIMARY KEY,
                candidate_type TEXT NOT NULL,
                normalized_resume_json TEXT NOT NULL,
                parser_metadata_json TEXT NOT NULL,
                resume_quality_json TEXT NOT NULL,
                resume_text TEXT NOT NULL,
                filename TEXT,
                full_name TEXT,
                current_role TEXT,
                content_fingerprint TEXT,
                duplicate_of_resume_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS migration_runs (
                run_id TEXT PRIMARY KEY,
                started_at TEXT NOT NULL,
                finished_at TEXT,
                status TEXT NOT NULL,
                source_dir TEXT NOT NULL,
                retire_legacy_files INTEGER NOT NULL DEFAULT 0,
                files_discovered INTEGER NOT NULL DEFAULT 0,
                imported_count INTEGER NOT NULL DEFAULT 0,
                skipped_count INTEGER NOT NULL DEFAULT 0,
                failed_count INTEGER NOT NULL DEFAULT 0,
                retired_count INTEGER NOT NULL DEFAULT 0,
                error_message TEXT
            );
            """
        )
        connection.commit()


def _resolve_duplicate_resume_id(connection: sqlite3.Connection, resume_id: str, fingerprint: str | None) -> str | None:
    if not fingerprint:
        return None

    row = connection.execute(
        """
        SELECT resume_id, duplicate_of_resume_id
        FROM parsed_resumes
        WHERE content_fingerprint = ? AND resume_id <> ?
        ORDER BY created_at ASC, resume_id ASC
        LIMIT 1
        """,
        (fingerprint, resume_id),
    ).fetchone()
    if row is None:
        return None
    return row["duplicate_of_resume_id"] or row["resume_id"]


def _reconcile_duplicate_chain(connection: sqlite3.Connection, fingerprint: str | None) -> None:
    if not fingerprint:
        return

    rows = connection.execute(
        """
        SELECT resume_id
        FROM parsed_resumes
        WHERE content_fingerprint = ?
        ORDER BY created_at ASC, resume_id ASC
        """,
        (fingerprint,),
    ).fetchall()
    if len(rows) <= 1:
        return

    canonical_resume_id = rows[0]["resume_id"]
    connection.execute(
        "UPDATE parsed_resumes SET duplicate_of_resume_id = NULL WHERE resume_id = ?",
        (canonical_resume_id,),
    )
    connection.execute(
        """
        UPDATE parsed_resumes
        SET duplicate_of_resume_id = ?
        WHERE content_fingerprint = ? AND resume_id <> ?
        """,
        (canonical_resume_id, fingerprint, canonical_resume_id),
    )


def _retire_legacy_json(path: Path, run_id: str) -> None:
    retired_dir = RESUME_STORE_DIR.parent / "resumes_retired" / run_id
    retired_dir.mkdir(parents=True, exist_ok=True)
    destination = retired_dir / path.name
    shutil.move(str(path), str(destination))


def _start_migration_run(
    *,
    run_id: str,
    started_at: str,
    source_dir: str,
    retire_legacy_files: bool,
    files_discovered: int,
) -> None:
    with _DB_LOCK:
        connection = _connect()
        connection.execute(
            """
            INSERT OR REPLACE INTO migration_runs (
                run_id,
                started_at,
                status,
                source_dir,
                retire_legacy_files,
                files_discovered
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (run_id, started_at, "running", source_dir, 1 if retire_legacy_files else 0, files_discovered),
        )
        connection.commit()


def _finish_migration_run(
    *,
    run_id: str,
    finished_at: str,
    status: str,
    imported: int,
    skipped: int,
    failed: int,
    retired: int,
    error_message: str | None,
) -> None:
    with _DB_LOCK:
        connection = _connect()
        connection.execute(
            """
            UPDATE migration_runs
            SET finished_at = ?,
                status = ?,
                imported_count = ?,
                skipped_count = ?,
                failed_count = ?,
                retired_count = ?,
                error_message = ?
            WHERE run_id = ?
            """,
            (finished_at, status, imported, skipped, failed, retired, error_message, run_id),
        )
        connection.commit()


def _reset_database_files() -> None:
    global _CONNECTION
    if _CONNECTION is not None:
        try:
            _CONNECTION.close()
        except Exception:
            pass
        _CONNECTION = None
    for suffix in ("", "-journal", "-wal", "-shm"):
        stale_path = Path(f"{DB_PATH}{suffix}")
        if stale_path.exists():
            try:
                stale_path.unlink(missing_ok=True)
            except PermissionError:
                pass

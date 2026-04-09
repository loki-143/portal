from __future__ import annotations

import argparse
import json

from .storage import init_storage, migrate_legacy_json_store


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate legacy JSON resume store into SQLite catalog.")
    parser.add_argument(
        "--retire-legacy-files",
        action="store_true",
        help="Move successfully migrated legacy JSON files to data/resumes_retired/<run_id>/.",
    )
    args = parser.parse_args()

    init_storage()
    result = migrate_legacy_json_store(retire_legacy_files=args.retire_legacy_files)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()

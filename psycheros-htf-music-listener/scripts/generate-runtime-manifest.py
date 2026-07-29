#!/usr/bin/env python3
"""Generate a release-runtime manifest from native build artifacts."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import quote


ASSET_PATTERN = re.compile(r"^psycheros-htf-runtime-(.+)\.tar\.gz$")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--assets", required=True, type=Path)
    parser.add_argument("--repository", required=True)
    parser.add_argument("--tag", required=True)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    assets: dict[str, dict[str, object]] = {}
    for archive in sorted(args.assets.rglob("*.tar.gz")):
        match = ASSET_PATTERN.match(archive.name)
        if not match:
            continue
        platform_name = match.group(1)
        os_name = platform_name.split("-", 1)[0]
        suffix = ".exe" if os_name == "windows" else ""
        assets[platform_name] = {
            "filename": archive.name,
            "url": (
                f"https://github.com/{args.repository}/releases/download/"
                f"{quote(args.tag, safe='')}/{quote(archive.name, safe='')}"
            ),
            "sha256": sha256(archive),
            "size": archive.stat().st_size,
            "worker": f"htf-worker{suffix}",
            "watcher": f"now-playing-watcher{suffix}"
            if os_name in {"windows", "linux"}
            else None,
        }

    if not assets:
        raise SystemExit("No HTF runtime archives were found.")
    manifest = {
        "schemaVersion": 1,
        "releaseTag": args.tag,
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "assets": assets,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()

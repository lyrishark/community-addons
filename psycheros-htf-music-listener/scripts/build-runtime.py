#!/usr/bin/env python3
"""Build one native HTF runtime archive on its target operating system."""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import platform as host_platform
import shutil
import subprocess
import sys
import tarfile
import tempfile


PLUGIN_ROOT = Path(__file__).resolve().parent.parent
WATCHER_ROOT = PLUGIN_ROOT / "watcher"
LICENSE_NAMES = ("LICENSE", "COPYING", "NOTICE", "AUTHORS")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run(*args: str) -> None:
    subprocess.run(args, cwd=PLUGIN_ROOT, check=True)


def copy_python_licenses(destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    for distribution in importlib.metadata.distributions():
        name = (distribution.metadata.get("Name") or "package").replace("/", "_")
        version = distribution.version.replace("/", "_")
        for relative in distribution.files or []:
            if not relative.name.upper().startswith(LICENSE_NAMES):
                continue
            source = Path(distribution.locate_file(relative))
            if source.is_file():
                target = destination / f"{name}-{version}-{relative.name}"
                shutil.copy2(source, target)

    candidates = [
        Path(sys.base_prefix) / "LICENSE.txt",
        Path(sys.base_prefix) / "LICENSE",
        Path(sys.base_prefix).parent / "LICENSE.txt",
    ]
    for source in candidates:
        if source.is_file():
            shutil.copy2(source, destination / f"Python-{source.name}")
            break


def copy_rust_licenses(destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    metadata = json.loads(
        subprocess.check_output(
            [
                "cargo",
                "metadata",
                "--manifest-path",
                str(WATCHER_ROOT / "Cargo.toml"),
                "--format-version",
                "1",
            ],
            cwd=PLUGIN_ROOT,
            text=True,
        )
    )
    for package in metadata["packages"]:
        if not package.get("source"):
            continue
        package_root = Path(package["manifest_path"]).parent
        for source in package_root.iterdir():
            if source.is_file() and source.name.upper().startswith(LICENSE_NAMES):
                safe_name = f"{package['name']}-{package['version']}-{source.name}"
                shutil.copy2(source, destination / safe_name)


def assert_host(platform_name: str) -> None:
    os_name, architecture = platform_name.split("-", 1)
    expected_os = {
        "windows": "Windows",
        "linux": "Linux",
        "darwin": "Darwin",
    }[os_name]
    if host_platform.system() != expected_os:
        raise SystemExit(
            f"Platform label {platform_name} does not match {host_platform.system()}."
        )
    machine = host_platform.machine().lower()
    if architecture == "x86_64" and machine not in {"amd64", "x86_64"}:
        raise SystemExit(f"Expected x86_64 host, received {machine}.")
    if architecture == "aarch64" and machine not in {"arm64", "aarch64"}:
        raise SystemExit(f"Expected aarch64 host, received {machine}.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--platform", required=True)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    assert_host(args.platform)
    args.output.mkdir(parents=True, exist_ok=True)

    os_name = args.platform.split("-", 1)[0]
    executable_suffix = ".exe" if os_name == "windows" else ""
    archive_name = f"psycheros-htf-runtime-{args.platform}.tar.gz"
    archive_path = args.output / archive_name

    with tempfile.TemporaryDirectory(prefix="psycheros-htf-runtime-") as temporary:
        build_root = Path(temporary)
        worker_dist = build_root / "worker-dist"
        run(
            sys.executable,
            "-m",
            "PyInstaller",
            "--noconfirm",
            "--clean",
            "--onefile",
            "--noupx",
            "--name",
            "htf-worker",
            "--distpath",
            str(worker_dist),
            "--workpath",
            str(build_root / "pyinstaller-work"),
            "--specpath",
            str(build_root / "pyinstaller-spec"),
            "--exclude-module",
            "torch",
            "--exclude-module",
            "torchvision",
            "--exclude-module",
            "tensorflow",
            "--exclude-module",
            "jax",
            "--exclude-module",
            "cupy",
            str(PLUGIN_ROOT / "worker" / "generate-htf.py"),
        )

        stage = build_root / f"psycheros-htf-runtime-{args.platform}"
        stage.mkdir()
        worker = worker_dist / f"htf-worker{executable_suffix}"
        shutil.copy2(worker, stage / worker.name)

        watcher_name: str | None = None
        if os_name in {"windows", "linux"}:
            run(
                "cargo",
                "build",
                "--release",
                "--manifest-path",
                str(WATCHER_ROOT / "Cargo.toml"),
            )
            built_watcher = (
                WATCHER_ROOT
                / "target"
                / "release"
                / f"psycheros-now-playing-watcher{executable_suffix}"
            )
            watcher_name = f"now-playing-watcher{executable_suffix}"
            shutil.copy2(built_watcher, stage / watcher_name)

        shutil.copy2(PLUGIN_ROOT / "THIRD_PARTY_NOTICES.md", stage)
        copy_python_licenses(stage / "third-party" / "python-packages")
        if watcher_name:
            copy_rust_licenses(stage / "third-party" / "rust-crates")

        info = {
            "schemaVersion": 1,
            "platform": args.platform,
            "python": sys.version,
            "worker": worker.name,
            "workerSha256": sha256(stage / worker.name),
            "watcher": watcher_name,
            "watcherSha256": sha256(stage / watcher_name) if watcher_name else None,
        }
        (stage / "runtime-info.json").write_text(
            json.dumps(info, indent=2) + "\n", encoding="utf-8"
        )

        with tarfile.open(archive_path, "w:gz") as archive:
            archive.add(stage, arcname=stage.name)

    digest = sha256(archive_path)
    checksum_path = args.output / f"{archive_name}.sha256"
    checksum_path.write_text(f"{digest}  {archive_name}\n", encoding="ascii")
    print(json.dumps({"archive": str(archive_path), "sha256": digest}))


if __name__ == "__main__":
    main()

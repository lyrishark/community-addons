#!/usr/bin/env bash
set -euo pipefail

addon_id="psycheros-more-uploads"
addon_version="0.4.0-rc.1"
supported_version="0.11.2"
script_dir="$(cd -- "$(dirname -- "$0")" && pwd -P)"
package_root="$(cd -- "$script_dir/.." && pwd -P)"
files_root="$package_root/files"

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

hash_command() {
  if command -v sha256sum >/dev/null 2>&1; then
    printf 'sha256sum\n'
  elif command -v shasum >/dev/null 2>&1; then
    printf 'shasum\n'
  else
    die "sha256sum or shasum is required"
  fi
}

normalized_hash() {
  local path="$1"
  if [ "$(hash_command)" = "sha256sum" ]; then
    tr -d '\r' < "$path" | sha256sum | awk '{print $1}'
  else
    tr -d '\r' < "$path" | shasum -a 256 | awk '{print $1}'
  fi
}

stock_hash() {
  case "$1" in
    packages/psycheros/src/server/routes.ts) printf '%s\n' "18d6df2b59e0b2e72e1668d608b7cd9111596eed2107562d14e53917d6899db3" ;;
    packages/psycheros/src/server/templates.ts) printf '%s\n' "c452f06b95103b8abd223ab551adb9b66d9d2753d0a1adc489323465921dcd33" ;;
    packages/psycheros/src/voice/session-manager.ts) printf '%s\n' "911e2495c0b8fcb492fb3c0cc0f1c37c3f50764f958e7a4158c0c6a89e8a338a" ;;
    packages/psycheros/web/css/components.css) printf '%s\n' "27f96a5471a297ad128981cc0b61b2d7f6662afd9454097b3c01c93647825737" ;;
    packages/psycheros/web/css/voice.css) printf '%s\n' "988c920bda148e7aae631ab67a37bd6e64df4e383226c13fbbbb59a7412037d0" ;;
    packages/psycheros/web/js/psycheros.js) printf '%s\n' "b4ebbd75d15660eb2afb15e09e8351108969910541692100b91f978cfe61964e" ;;
    packages/psycheros/web/js/voice.js) printf '%s\n' "901aba21b8a47f576e6f51837dba01506b767db44ebb0187858278305665b95b" ;;
    packages/psycheros/web/sw.js) printf '%s\n' "1c6bf021d733f6d3abd7a8620d3f186b16ecfa51ee0779aadac9d63cb229840f" ;;
    *) return 1 ;;
  esac
}

[ "$#" -eq 1 ] || die "Usage: $0 /path/to/Psycheros/source"
root="$(cd -- "$1" 2>/dev/null && pwd -P)" ||
  die "Psycheros source root does not exist: $1"
deno_json="$root/packages/psycheros/deno.json"
[ -f "$deno_json" ] || die "Could not find packages/psycheros/deno.json"
version="$(sed -n 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$deno_json" | head -n 1)"
[ "$version" = "$supported_version" ] ||
  die "This source bridge supports Psycheros $supported_version; found $version. No files were changed."

preflight_errors=""
while IFS= read -r payload; do
  relative="$(printf '%s\n' "$payload" | sed "s#^$files_root/##")"
  destination="$root/$relative"
  case "$destination" in
    "$root"/*) ;;
    *) die "Unsafe payload path escaped the selected source root: $relative" ;;
  esac
  payload_hash="$(normalized_hash "$payload")"
  expected="$(stock_hash "$relative" 2>/dev/null || true)"
  if [ -n "$expected" ]; then
    if [ ! -f "$destination" ]; then
      preflight_errors="$preflight_errors\n  - Required stock file is missing: $relative"
    else
      current_hash="$(normalized_hash "$destination")"
      if [ "$current_hash" != "$expected" ] && [ "$current_hash" != "$payload_hash" ]; then
        preflight_errors="$preflight_errors\n  - Refusing to overwrite a non-stock local edit: $relative"
      fi
    fi
  elif [ -e "$destination" ]; then
    current_hash="$(normalized_hash "$destination")"
    if [ "$current_hash" != "$payload_hash" ]; then
      preflight_errors="$preflight_errors\n  - Refusing to replace an existing non-addon file: $relative"
    fi
  fi
done < <(find "$files_root" -type f -print | sort)

[ -z "$preflight_errors" ] ||
  die "Source-bridge preflight failed. No files were changed:$preflight_errors"

timestamp="$(date -u +%Y%m%d-%H%M%S)"
backup_root="$root/packages/psycheros/.community-addon-backups/$addon_id/$timestamp"
while IFS= read -r payload; do
  relative="$(printf '%s\n' "$payload" | sed "s#^$files_root/##")"
  destination="$root/$relative"
  backup="$backup_root/$relative"
  if [ -f "$destination" ]; then
    mkdir -p -- "$(dirname -- "$backup")"
    cp -p -- "$destination" "$backup"
  fi
  mkdir -p -- "$(dirname -- "$destination")"
  cp -p -- "$payload" "$destination"
  printf 'Installed %s\n' "$relative"
done < <(find "$files_root" -type f -print | sort)

marker_dir="$root/packages/psycheros/.addon-installs"
mkdir -p -- "$marker_dir"
printf '{"schema_version":1,"id":"%s","version":"%s","psycheros_version":"%s","base":"psycheros-v0.11.2","installed_at":"%s","backup":"%s"}\n' \
  "$addon_id" "$addon_version" "$version" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$backup_root" \
  > "$marker_dir/$addon_id.json"

printf '\n%s %s installed.\nBackup: %s\nRestart Psycheros before testing attachments.\n' \
  "$addon_id" "$addon_version" "$backup_root"

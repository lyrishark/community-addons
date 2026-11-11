#!/usr/bin/env bash
set -euo pipefail

addon_id="psycheros-screen-presence-alpha"
addon_version="0.5.0-rc.1"
supported_version="1.0.2"
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
    packages/psycheros/src/entity/loop.ts) printf '%s\n' "4e6d86f50a3d5141dea5169234b9fc576457e9138f554da5db0e9ea89a91169a" ;;
    packages/psycheros/src/entity/sa-formatters.ts) printf '%s\n' "10e71f53e1207df4daae8c3bf9a3d447834c3332655fcc6d390d3de8692c21af" ;;
    packages/psycheros/src/pulse/engine.ts) printf '%s\n' "1d3b86fbc57657ccef714ae87837d459c4b7caa29bb4425edb0cab2df76cc139" ;;
    packages/psycheros/src/server/routes.ts) printf '%s\n' "890466d1fa8b36f6d85bffd0fb03613b0f1677079ff690c2aec3890c994409e2" ;;
    packages/psycheros/src/server/server.ts) printf '%s\n' "18a19dbc1170eb5bf5a7fd66cf8f271ed32f77b2d36e73e8eaf8a6674b03b285" ;;
    packages/psycheros/src/server/templates.ts) printf '%s\n' "adcc93a863a98a7f0b830b1a99100d9d94b0247b48bddd88e4ea172e207e30b3" ;;
    packages/psycheros/web/css/components.css) printf '%s\n' "db1a95867750f66aa4699c466d6fc1a59380192268caa790d1c728ac597081df" ;;
    packages/psycheros/web/css/voice.css) printf '%s\n' "294319beb1cb7cf603b12d6d394cddc736f9a7ca51d5c4bde67c0000ab9d8208" ;;
    packages/psycheros/web/js/psycheros.js) printf '%s\n' "5df293f4a3364143d581b4c75389eececcea4b510e4be58cbca1ff131acf66c2" ;;
    packages/psycheros/web/js/voice.js) printf '%s\n' "a66dadbc53a010adc65e55b94e692a8c7994e0c1cf75803c228983cffbc3086c" ;;
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
printf '{"schema_version":1,"id":"%s","version":"%s","psycheros_version":"%s","base":"psycheros-v1.0.2","installed_at":"%s","backup":"%s"}\n' \
  "$addon_id" "$addon_version" "$version" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$backup_root" \
  > "$marker_dir/$addon_id.json"

printf '\n%s %s installed.\nBackup: %s\nRestart Psycheros before testing this source bridge.\n' \
  "$addon_id" "$addon_version" "$backup_root"

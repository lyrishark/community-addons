#!/usr/bin/env bash
set -euo pipefail

addon_id="psycheros-screen-presence-alpha"
addon_version="0.3.0-rc.1"
supported_version="0.10.0"
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
    packages/psycheros/src/entity/loop.ts) printf '%s\n' "9fe231f730120963e04059299eec6a1b4c1bae735ae3a42e784f49f3db0bb027" ;;
    packages/psycheros/src/entity/sa-formatters.ts) printf '%s\n' "10e71f53e1207df4daae8c3bf9a3d447834c3332655fcc6d390d3de8692c21af" ;;
    packages/psycheros/src/pulse/engine.ts) printf '%s\n' "995015524e649712acab6641e9ca42ad69b87efcdd32354f0c3938de13d773b3" ;;
    packages/psycheros/src/server/routes.ts) printf '%s\n' "eb7de44afaa17288c9ab612bf47bd73c6b5b85f12ef4ee3a5f34ae45d3b3e70f" ;;
    packages/psycheros/src/server/server.ts) printf '%s\n' "4868a3271d83753aed380e3a22a3db19dd42dc71d486ec7ee0e9d0907b11dedd" ;;
    packages/psycheros/src/server/templates.ts) printf '%s\n' "c612d5508c2228df6e26615fc30126cda7dc396d89c39e5ca46c50187b63c077" ;;
    packages/psycheros/web/css/components.css) printf '%s\n' "3f20ebfcc548c16372e89923043660f31558f5b4221c82db398d8f5ce7d9cd2d" ;;
    packages/psycheros/web/css/voice.css) printf '%s\n' "37afc3b5c8648b340f648a782f2c0f8605f165aad2afe3e1f4a936f585c4106f" ;;
    packages/psycheros/web/js/psycheros.js) printf '%s\n' "8becf0782bd4f750e1f5d5c5a6d6bd919e859ada6226c98b3970f536ae5e30ff" ;;
    packages/psycheros/web/js/voice.js) printf '%s\n' "5aa6f6e9beaa715cdd74509d5d92ff30aa9451b340948ec421e5d8027a5c9fe4" ;;
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
printf '{"schema_version":1,"id":"%s","version":"%s","psycheros_version":"%s","base":"psycheros-v0.10.0","installed_at":"%s","backup":"%s"}\n' \
  "$addon_id" "$addon_version" "$version" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$backup_root" \
  > "$marker_dir/$addon_id.json"

printf '\n%s %s installed.\nBackup: %s\nRestart Psycheros before testing this source bridge.\n' \
  "$addon_id" "$addon_version" "$backup_root"

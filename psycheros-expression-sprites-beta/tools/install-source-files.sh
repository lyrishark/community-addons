#!/usr/bin/env bash
set -euo pipefail

addon_id="psycheros-expression-sprites-beta"
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
    deno.lock) printf '%s\n' "088b25f524c8c544433a19176da6503da2a8a4298ee9a7dd876ed82a93bc3fc9" ;;
    packages/psycheros/deno.json) printf '%s\n' "5bb1157ad31d0d9e1085a0c10388ad3eab662d733cabe4db7314fad51789f346" ;;
    packages/psycheros/docs/ui-features.md) printf '%s\n' "d9e995d035745793fe15b4f9c141adec0b0fc4c3c3c53431e0f083f1653cb886" ;;
    packages/psycheros/src/db/client.ts) printf '%s\n' "1b150f7ff68bdbb49afaaf11ae30283ef6af456fcc37481fb814622d2c6e713c" ;;
    packages/psycheros/src/db/schema.ts) printf '%s\n' "1bad1d5b32d1fdd27464f2237fcbadb7b52edd67ad1e2aefa7b51121d69e1a2e" ;;
    packages/psycheros/src/entity/loop.ts) printf '%s\n' "9fe231f730120963e04059299eec6a1b4c1bae735ae3a42e784f49f3db0bb027" ;;
    packages/psycheros/src/server/routes.ts) printf '%s\n' "eb7de44afaa17288c9ab612bf47bd73c6b5b85f12ef4ee3a5f34ae45d3b3e70f" ;;
    packages/psycheros/src/server/server.ts) printf '%s\n' "4868a3271d83753aed380e3a22a3db19dd42dc71d486ec7ee0e9d0907b11dedd" ;;
    packages/psycheros/src/server/templates.ts) printf '%s\n' "c612d5508c2228df6e26615fc30126cda7dc396d89c39e5ca46c50187b63c077" ;;
    packages/psycheros/src/types.ts) printf '%s\n' "4eb0cf45d5c10e38612226766799419e4addea4b1e9f966e565c2559c574c1c2" ;;
    packages/psycheros/src/voice/pipeline.ts) printf '%s\n' "e3707bb65b8cd7855ff0bd19ee1b20e862becf947d9c7c7c8956bb89707e5667" ;;
    packages/psycheros/src/voice/session-manager.ts) printf '%s\n' "911e2495c0b8fcb492fb3c0cc0f1c37c3f50764f958e7a4158c0c6a89e8a338a" ;;
    packages/psycheros/web/css/components.css) printf '%s\n' "3f20ebfcc548c16372e89923043660f31558f5b4221c82db398d8f5ce7d9cd2d" ;;
    packages/psycheros/web/css/voice.css) printf '%s\n' "37afc3b5c8648b340f648a782f2c0f8605f165aad2afe3e1f4a936f585c4106f" ;;
    packages/psycheros/web/js/psycheros.js) printf '%s\n' "8becf0782bd4f750e1f5d5c5a6d6bd919e859ada6226c98b3970f536ae5e30ff" ;;
    packages/psycheros/web/js/voice.js) printf '%s\n' "5aa6f6e9beaa715cdd74509d5d92ff30aa9451b340948ec421e5d8027a5c9fe4" ;;
    packages/psycheros/web/sw.js) printf '%s\n' "1c6bf021d733f6d3abd7a8620d3f186b16ecfa51ee0779aadac9d63cb229840f" ;;
    site/src/content/docs/psycheros/ui-features.md) printf '%s\n' "552be1a3a3309344bd7a50247b5d0324372c0a9b3ce0f3cae4ae8160e1853250" ;;
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
backup_root="$root/.community-addon-backups/$addon_id/$timestamp"
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

marker_dir="$root/.addon-installs"
mkdir -p -- "$marker_dir"
printf '{"schema_version":1,"id":"%s","version":"%s","psycheros_version":"%s","base":"psycheros-v0.10.0","installed_at":"%s","backup":"%s"}\n' \
  "$addon_id" "$addon_version" "$version" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$backup_root" \
  > "$marker_dir/$addon_id.json"

printf '\n%s %s installed.\nBackup: %s\nRestart Psycheros before testing this source bridge.\n' \
  "$addon_id" "$addon_version" "$backup_root"

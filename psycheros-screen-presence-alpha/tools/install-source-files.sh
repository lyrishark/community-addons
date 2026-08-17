#!/usr/bin/env bash
set -euo pipefail

addon_id="psycheros-screen-presence-alpha"
addon_version="0.4.0-rc.1"
supported_version="0.11.0"
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
    packages/psycheros/src/entity/loop.ts) printf '%s\n' "0eaa90155b4c09e0cefc58eea324e8ddae6a70af81edeba13a88afc692083d18" ;;
    packages/psycheros/src/entity/sa-formatters.ts) printf '%s\n' "10e71f53e1207df4daae8c3bf9a3d447834c3332655fcc6d390d3de8692c21af" ;;
    packages/psycheros/src/pulse/engine.ts) printf '%s\n' "1ea93b0d360bee0a127f737dd0ab98f6638960049ad51c7804f0c5a0d2ab2c35" ;;
    packages/psycheros/src/server/routes.ts) printf '%s\n' "56d3041a3f976a458b769146a69e9c32f46990e0ff01f0513b8bd66d2eaecf6f" ;;
    packages/psycheros/src/server/server.ts) printf '%s\n' "99583a44fd6934effcde75a3918ce687d1671a9eac1eafe7d4b1d349598904e4" ;;
    packages/psycheros/src/server/templates.ts) printf '%s\n' "c452f06b95103b8abd223ab551adb9b66d9d2753d0a1adc489323465921dcd33" ;;
    packages/psycheros/web/css/components.css) printf '%s\n' "3e42d925867b1068ded44b05f6841b20dd95a580556e5d2c3423ee9545e3744e" ;;
    packages/psycheros/web/css/voice.css) printf '%s\n' "988c920bda148e7aae631ab67a37bd6e64df4e383226c13fbbbb59a7412037d0" ;;
    packages/psycheros/web/js/psycheros.js) printf '%s\n' "944acf307be66edde20f26bb825f297466588b05608d8a9aeed17bb1ada1a56a" ;;
    packages/psycheros/web/js/voice.js) printf '%s\n' "901aba21b8a47f576e6f51837dba01506b767db44ebb0187858278305665b95b" ;;
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
printf '{"schema_version":1,"id":"%s","version":"%s","psycheros_version":"%s","base":"psycheros-v0.11.0","installed_at":"%s","backup":"%s"}\n' \
  "$addon_id" "$addon_version" "$version" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$backup_root" \
  > "$marker_dir/$addon_id.json"

printf '\n%s %s installed.\nBackup: %s\nRestart Psycheros before testing this source bridge.\n' \
  "$addon_id" "$addon_version" "$backup_root"

#!/usr/bin/env bash
set -euo pipefail

supported_version="0.9.2"
addon_name="Expression Sprites Beta"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
patch_root="$(cd -- "$script_dir/.." && pwd -P)"
files_root="$patch_root/files"

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

canonical_existing_path() {
  local path="$1"
  [ -n "$path" ] || return 1
  (cd -- "$path" 2>/dev/null && pwd -P)
}

is_psycheros_root() {
  local path="$1"
  [ -n "$path" ] && [ -f "$path/packages/psycheros/deno.json" ]
}

installed_version() {
  local deno_json="$1"
  sed -n 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$deno_json" | head -n 1
}

print_match_entries() {
  local entry version path
  for entry in "$@"; do
    version="${entry%%|*}"
    path="${entry#*|}"
    printf '  - %s (version %s)\n' "$path" "${version:-unknown}" >&2
  done
}

add_candidate() {
  local path="${1:-}"
  [ -n "$path" ] || return 0
  local resolved
  resolved="$(canonical_existing_path "$path" || true)"
  [ -n "$resolved" ] || return 0
  case ":$candidates:" in
    *":$resolved:"*) ;;
    *) candidates="${candidates:+$candidates:}$resolved" ;;
  esac
}

resolve_psycheros_root() {
  local explicit="${1:-}"
  if [ -n "$explicit" ]; then
    local resolved
    resolved="$(canonical_existing_path "$explicit" || true)"
    [ -n "$resolved" ] || die "Cannot find $explicit"
    is_psycheros_root "$resolved" ||
      die "Could not find packages/psycheros/deno.json under $resolved. Point install.sh at the Psycheros source checkout."
    printf '%s\n' "$resolved"
    return
  fi

  candidates=""
  add_candidate "${PSYCHEROS_ROOT:-}"

  local here
  here="$(pwd -P)"
  while [ -n "$here" ] && [ "$here" != "/" ]; do
    add_candidate "$here"
    here="$(dirname "$here")"
  done
  add_candidate "/"

  add_candidate "$HOME/Library/Application Support/Psycheros/source"
  add_candidate "$HOME/Library/Application Support/Psycheros"
  add_candidate "$HOME/.local/share/Psycheros/source"
  add_candidate "$HOME/.local/share/Psycheros"
  add_candidate "$HOME/Applications/Psycheros"
  add_candidate "$HOME/Psycheros"
  add_candidate "$HOME/Code/Psycheros"
  add_candidate "$HOME/Source/Psycheros"
  add_candidate "$HOME/Documents/Psycheros"

  local matches=()
  local supported_matches=()
  local old_ifs="$IFS"
  IFS=":"
  for candidate in $candidates; do
    if is_psycheros_root "$candidate"; then
      local version
      version="$(installed_version "$candidate/packages/psycheros/deno.json")"
      matches+=("${version:-unknown}|$candidate")
      if [ "$version" = "$supported_version" ]; then
        supported_matches+=("${version:-unknown}|$candidate")
      fi
    fi
  done
  IFS="$old_ifs"

  if [ "${#supported_matches[@]}" -eq 1 ]; then
    printf '%s\n' "${supported_matches[0]#*|}"
    return
  fi

  if [ "${#supported_matches[@]}" -gt 1 ]; then
    printf 'Multiple compatible Psycheros source folders were found:\n' >&2
    print_match_entries "${supported_matches[@]}"
    die "Run again with ./install.sh /path/to/Psycheros/source"
  fi

  if [ "${#matches[@]}" -gt 0 ]; then
    printf 'Found Psycheros source folder(s), but none match supported version %s:\n' "$supported_version" >&2
    print_match_entries "${matches[@]}"
    die "If Psycheros itself reports $supported_version, this installer is seeing a stale or different source folder. Run again with ./install.sh \"$HOME/Library/Application Support/Psycheros/source\" or the launcher source folder shown in diagnostics."
  fi

  die "Could not auto-detect a Psycheros source folder. Run again with ./install.sh /path/to/Psycheros"
}

[ -d "$files_root" ] || die "Could not find add-on files at $files_root"

psycheros_root="$(resolve_psycheros_root "${1:-}")"
root_full="$(canonical_existing_path "$psycheros_root")"
deno_json="$root_full/packages/psycheros/deno.json"
version="$(installed_version "$deno_json")"

if [ "$version" != "$supported_version" ]; then
  die "This add-on supports Psycheros $supported_version, but $root_full reports ${version:-unknown}. No files were changed. If the running app reports $supported_version, this is probably not the source folder your launcher is using; rerun with ./install.sh pointed at the launcher source folder."
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_root="$root_full/packages/psycheros/_expression_sprites_beta_backup_$timestamp"
mkdir -p "$backup_root"

patched=0
backed_up=0

while IFS= read -r -d '' file; do
  rel="${file#"$files_root"/}"
  case "$rel" in
    ../*|*/../*|'') die "Refusing unsafe payload path: $rel" ;;
  esac

  destination="$root_full/$rel"
  backup_destination="$backup_root/$rel"

  case "$destination" in
    "$root_full"/*) ;;
    *) die "Refusing to write outside Psycheros root: $destination" ;;
  esac

  if [ -e "$destination" ]; then
    mkdir -p "$(dirname "$backup_destination")"
    cp -p "$destination" "$backup_destination"
    backed_up=$((backed_up + 1))
  fi

  mkdir -p "$(dirname "$destination")"
  cp -p "$file" "$destination"
  printf 'Patched %s\n' "$rel"
  patched=$((patched + 1))
done < <(find "$files_root" -type f -print0)

printf '\n%s installed for Psycheros %s.\n' "$addon_name" "$version"
printf 'Patched files: %s\n' "$patched"
printf 'Backed-up existing files: %s\n' "$backed_up"
printf 'Backup folder: %s\n\n' "$backup_root"
printf 'Next steps:\n'
printf '1. Fully quit and relaunch Psycheros.\n'
printf '2. Open Settings > Vision > Expressions.\n'
printf '3. A fresh profile will receive the bundled Ember starter sprites automatically.\n\n'
printf 'Existing expression settings and personal sprite files are preserved without automatic seeding.\n'

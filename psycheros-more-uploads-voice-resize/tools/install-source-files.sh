#!/usr/bin/env bash
set -euo pipefail

supported_version="0.8.23"
addon_name="More Uploads + Voice Text Resize"
addon_id="psycheros-more-uploads-voice-resize"
addon_version="0.1.1"
superseded_addon_ids=("psycheros-more-uploads" "psycheros-voice-text-resize")
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

known_addon_name() {
  case "$1" in
    psycheros-more-uploads) printf 'More Uploads\n' ;;
    psycheros-voice-text-resize) printf 'Voice Text Resize\n' ;;
    psycheros-more-uploads-voice-resize) printf 'More Uploads + Voice Text Resize\n' ;;
    psycheros-everything-together) printf 'Everything Together\n' ;;
    *) printf '%s\n' "$1" ;;
  esac
}

legacy_backup_pattern() {
  case "$1" in
    psycheros-more-uploads) printf '_more_uploads_backup_*\n' ;;
    psycheros-voice-text-resize) printf '_voice_text_resize_backup_*\n' ;;
    psycheros-more-uploads-voice-resize) printf '_more_uploads_voice_resize_backup_*\n' ;;
    psycheros-everything-together) printf '_everything_together_backup_*\n' ;;
  esac
}

is_tracked_source_addon() {
  case "$1" in
    psycheros-more-uploads|psycheros-voice-text-resize|psycheros-more-uploads-voice-resize|psycheros-everything-together) return 0 ;;
    *) return 1 ;;
  esac
}

id_in_list() {
  local needle="$1"
  shift
  local item
  for item in "$@"; do
    [ "$needle" = "$item" ] && return 0
  done
  return 1
}

collect_addon_records() {
  local psycheros_pkg_dir="$1"
  local marker_dir="$psycheros_pkg_dir/.addon-installs"
  local marker id name pattern backup known_id

  if [ -d "$marker_dir" ]; then
    for marker in "$marker_dir"/*.json; do
      [ -e "$marker" ] || continue
      id="$(sed -n 's/^[[:space:]]*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$marker" | head -n 1)"
      [ -n "$id" ] || continue
      name="$(sed -n 's/^[[:space:]]*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$marker" | head -n 1)"
      [ -n "$name" ] || name="$(known_addon_name "$id")"
      printf '%s|%s|install marker|%s\n' "$id" "$name" "$marker"
    done
  fi

  for known_id in psycheros-more-uploads psycheros-voice-text-resize psycheros-more-uploads-voice-resize psycheros-everything-together; do
    pattern="$(legacy_backup_pattern "$known_id")"
    [ -n "$pattern" ] || continue
    backup="$(find "$psycheros_pkg_dir" -maxdepth 1 -type d -name "$pattern" -print 2>/dev/null | sort | tail -n 1)"
    if [ -n "$backup" ]; then
      printf '%s|%s|legacy backup folder|%s\n' "$known_id" "$(known_addon_name "$known_id")" "$backup"
    fi
  done
}

check_addon_conflicts() {
  local psycheros_pkg_dir="$1"
  local blocked=()
  local superseded=()
  local id name source path

  while IFS='|' read -r id name source path; do
    [ -n "$id" ] || continue
    is_tracked_source_addon "$id" || continue
    [ "$id" = "$addon_id" ] && continue
    if id_in_list "$id" "${superseded_addon_ids[@]}"; then
      superseded+=("  - $name ($id, $source: $path)")
    else
      blocked+=("  - $name ($id, $source: $path)")
    fi
  done < <(collect_addon_records "$psycheros_pkg_dir")

  if [ "${#blocked[@]}" -gt 0 ]; then
    printf 'Cannot install %s because another overlapping Psycheros source add-on is already present:\n' "$addon_name" >&2
    printf '%s\n' "${blocked[@]}" >&2
    die "Restore the official Psycheros 0.8.23 source before installing this combo package, or install Everything Together instead."
  fi

  if [ "${#superseded[@]}" -gt 0 ]; then
    printf 'Warning: %s will replace these earlier overlapping add-on installs:\n' "$addon_name" >&2
    printf '%s\n' "${superseded[@]}" >&2
  fi
}

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

json_string_array() {
  local first=1
  local item
  printf '['
  for item in "$@"; do
    if [ "$first" -eq 0 ]; then
      printf ', '
    fi
    first=0
    printf '"%s"' "$(json_escape "$item")"
  done
  printf ']'
}

write_addon_marker() {
  local psycheros_pkg_dir="$1"
  local source_root="$2"
  local installed="$3"
  local marker_dir="$psycheros_pkg_dir/.addon-installs"
  local marker_path="$marker_dir/$addon_id.json"
  local superseded_id
  mkdir -p "$marker_dir"
  for superseded_id in "${superseded_addon_ids[@]}"; do
    rm -f "$marker_dir/$superseded_id.json"
  done
  cat > "$marker_path" <<MARKER_EOF
{
  "schema_version": 1,
  "id": "$(json_escape "$addon_id")",
  "name": "$(json_escape "$addon_name")",
  "version": "$(json_escape "$addon_version")",
  "psycheros_version": "$(json_escape "$installed")",
  "installed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "source_root": "$(json_escape "$source_root")",
  "replaces": $(json_string_array "${superseded_addon_ids[@]}")
}
MARKER_EOF
  printf '%s\n' "$marker_path"
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

psycheros_pkg_dir="$root_full/packages/psycheros"
check_addon_conflicts "$psycheros_pkg_dir"

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_root="$psycheros_pkg_dir/_more_uploads_voice_resize_backup_$timestamp"
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

marker_path="$(write_addon_marker "$psycheros_pkg_dir" "$root_full" "$version")"

printf '\n%s installed for Psycheros %s.\n' "$addon_name" "$version"
printf 'Patched files: %s\n' "$patched"
printf 'Backed-up existing files: %s\n' "$backed_up"
printf 'Backup folder: %s\n\n' "$backup_root"
printf 'Install marker: %s\n\n' "$marker_path"
printf 'Next steps:\n'
printf '1. Fully quit and relaunch Psycheros.\n'
printf '2. In chat, attach more than one image or attach a supported document.\n'
printf '3. In voice chat, switch to Yin Yang mode, attach a file, and drag the typed-message box larger.\n'

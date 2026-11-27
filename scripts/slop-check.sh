#!/usr/bin/env bash
# Flags common slop patterns. Warn-only by default; pass --strict to exit 1 on hits.
# Usage: scripts/slop-check.sh [--strict] [path...]
# Hits are prompts to look, not automatic errors. See docs/UNSLOP.md.

strict=0
if [ "$1" = "--strict" ]; then strict=1; shift; fi
paths=("$@")
[ ${#paths[@]} -eq 0 ] && paths=(.)

exclude='--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build --exclude-dir=.next --exclude-dir=vendor --exclude=*.min.* --exclude=*.lock --exclude=package-lock.json --exclude=UNSLOP.md --exclude=slop-check.sh'
copy='--include=*.html --include=*.md --include=*.mdx --include=*.jsx --include=*.tsx --include=*.vue --include=*.svelte --include=*.json'
code='--include=*.js --include=*.jsx --include=*.ts --include=*.tsx --include=*.vue --include=*.svelte --include=*.py --include=*.gd --include=*.cs'
style='--include=*.css --include=*.scss --include=*.html --include=*.jsx --include=*.tsx --include=*.vue --include=*.svelte'

total=0
check() {
  local label="$1" flags="$2" pattern="$3" skip_comments="$4"
  # shellcheck disable=SC2086
  local out
  local ci=i
  [ "$skip_comments" = "case" ] && ci="" && skip_comments=""
  out=$(grep -rnI${ci}E $exclude $flags -- "$pattern" "${paths[@]}" 2>/dev/null)
  # Copy checks skip code comment lines (//, /*, *, {/*, <!--, #) in code files
  if [ -n "$skip_comments" ] && [ -n "$out" ]; then
    out=$(printf '%s\n' "$out" | grep -vE '\.(jsx|tsx|vue|svelte|js|ts):[0-9]+:[[:space:]]*(//|/\*|\*|\{/\*)' | grep -vE ':[0-9]+:[[:space:]]*<!--')
  fi
  if [ -n "$out" ]; then
    local n; n=$(printf '%s\n' "$out" | wc -l)
    total=$((total + n))
    printf '\n== %s (%d)\n%s\n' "$label" "$n" "$(printf '%s\n' "$out" | head -n 15)"
    [ "$n" -gt 15 ] && echo "   ... $((n - 15)) more"
  fi
}

check "Em dashes in copy" "$copy" '—' skip
check "Sales and inflated words" "$copy" '\b(seamless(ly)?|supercharge|game[- ]?changer|unlock (your|the)|elevate your|effortless(ly)?|cutting[- ]edge|next[- ]level|revolutioni[sz]e|empower)\b' skip
check "AI vocabulary" "$copy" '\b(delve|tapestry|testament to|embark|realm|underscores?|showcas(e|ing)|boasts|meticulous(ly)?|pivotal|vibrant|intricate|fostering)\b' skip
check "Staged openers and closers" "$copy" "(here's the thing|let's dive in|imagine this:|in today's fast-paced|at the end of the day|in conclusion|in summary,)" skip
check "Not X but Y" "$copy" "(it'?s not just|not only .{1,40} but also|isn'?t just about)" skip
check "Chat leftovers" "$copy" '(great question|i hope this helps|let me know if you|as an ai\b|certainly!)' skip
check "Generic CTA and section names" "$copy" '>\s*(get started( today)?|learn more|why choose us|submit)\s*<'
check "Placeholder links and text" "$copy $code" '(href="#"|lorem ipsum|john doe|jane doe|acme (corp|inc))'
check "Purple AI gradient" "$style" '(#667eea|#764ba2|from-(purple|violet|indigo)-[0-9]+ .*to-(blue|indigo|purple)-[0-9]+|bg-indigo-500)'
check "Default display fonts" "$style" "font-family:\s*['\"]?(inter|roboto|open sans|arial)\b"
check "Bounce easing" "$style" '(cubic-bezier\([^)]*-[0-9.]+|ease-?(out-)?(back|elastic|bounce))'
check "Swallowed errors" "$code" '(catch\s*(\([^)]*\))?\s*\{\s*\}|except[^:]*:\s*pass\b)'
check "any casts and ignores" "$code" '(as any\b|:\s*any\b|@ts-ignore|# type: ignore)'
check "Debug logs" "$code" '\bconsole\.(log|debug)\('
check "Narrating comments" "$code" '(//|#)\s*(updated to|changed to|added (a|the|new)|now uses|this (function|method|code) (will|is used to))'
check "TODO stubs" "$code" '\b(TODO|FIXME|XXX)\b' case

echo
if [ "$total" -eq 0 ]; then
  echo "slop-check: clean"
else
  echo "slop-check: $total hit(s). Fix them or say why each one stays."
  [ "$strict" -eq 1 ] && exit 1
fi
exit 0

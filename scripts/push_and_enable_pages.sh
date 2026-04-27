#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${1:-main}"
TOKEN="${GITHUB_TOKEN:-}"
OWNER="${GITHUB_OWNER:-hoodlandon25}"
REPO="${GITHUB_REPO:-VR-browser-games-MADE-BY-CODEX-}"

progress=0

print_progress() {
  local next="$1"
  if (( next > progress )); then
    progress="$next"
    printf '%s%%\n' "$progress"
  fi
}

parse_stage_percent() {
  local stage="$1"
  local raw="$2"
  case "$stage" in
    Enumerating)
      echo $(( raw / 10 ))
      ;;
    Counting)
      echo $(( 10 + (raw * 15 / 100) ))
      ;;
    Compressing)
      echo $(( 25 + (raw * 30 / 100) ))
      ;;
    Writing)
      echo $(( 55 + (raw * 40 / 100) ))
      ;;
    *)
      echo "$progress"
      ;;
  esac
}

enable_pages() {
  if [[ -z "$TOKEN" ]]; then
    echo "No GITHUB_TOKEN set, skipping GitHub Pages API call."
    return
  fi

  echo "Enabling GitHub Pages with GitHub Actions..."
  local http_code
  http_code="$(
    curl -sS -o /tmp/github-pages-enable.json -w '%{http_code}' \
      -X POST \
      -H "Accept: application/vnd.github+json" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "https://api.github.com/repos/${OWNER}/${REPO}/pages" \
      -d '{"build_type":"workflow"}'
  )"

  if [[ "$http_code" == "201" || "$http_code" == "204" || "$http_code" == "409" ]]; then
    echo "GitHub Pages API response: ${http_code}"
  else
    echo "GitHub Pages API failed with status ${http_code}"
    cat /tmp/github-pages-enable.json
    return 1
  fi
}

echo "Repo: ${REPO_DIR}"
echo "Branch: ${BRANCH}"

cd "$REPO_DIR"

git status --short
print_progress 1

git push --progress origin "$BRANCH" 2>&1 | while IFS= read -r line; do
  echo "$line"

  if [[ "$line" =~ ^Enumerating\ objects:\ ([0-9]+)% ]]; then
    print_progress "$(parse_stage_percent Enumerating "${BASH_REMATCH[1]}")"
  elif [[ "$line" =~ ^Counting\ objects:\ ([0-9]+)% ]]; then
    print_progress "$(parse_stage_percent Counting "${BASH_REMATCH[1]}")"
  elif [[ "$line" =~ ^Compressing\ objects:\ ([0-9]+)% ]]; then
    print_progress "$(parse_stage_percent Compressing "${BASH_REMATCH[1]}")"
  elif [[ "$line" =~ ^Writing\ objects:\ ([0-9]+)% ]]; then
    print_progress "$(parse_stage_percent Writing "${BASH_REMATCH[1]}")"
  elif [[ "$line" =~ ^To\  ]]; then
    print_progress 98
  elif [[ "$line" =~ Everything\ up-to-date ]]; then
    print_progress 100
  fi
done

print_progress 99
enable_pages
print_progress 100

echo "GitHub Pages URL: https://${OWNER}.github.io/${REPO}/"

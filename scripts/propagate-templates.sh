#!/usr/bin/env bash
# propagate-templates.sh — Push canonical protocol assets to all compliant projects
#
# Usage:
#   ./scripts/propagate-templates.sh              # dry-run (default)
#   ./scripts/propagate-templates.sh --apply      # actually copy files
#   ./scripts/propagate-templates.sh --apply --commit  # copy + git commit in each repo
#   ./scripts/propagate-templates.sh --apply --commit --push  # copy + commit + push
#
# Reads PROJECT_REGISTRY.json for localPath of each compliant project.
# Compares protocol asset versions and only updates projects that are behind.

set -euo pipefail

STUDIO_OPS_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGISTRY="$STUDIO_OPS_ROOT/portfolio/PROJECT_REGISTRY.json"
TEMPLATE_START="$STUDIO_OPS_ROOT/docs/templates/project-system/START_PROMPT.template.md"
TEMPLATE_CLOSEOUT="$STUDIO_OPS_ROOT/docs/templates/project-system/CLOSEOUT_PROMPT.template.md"
TEMPLATE_TRUTH_AUDIT="$STUDIO_OPS_ROOT/docs/templates/project-system/TRUTH_AUDIT.template.md"
TEMPLATE_CLAUDE_SETTINGS="$STUDIO_OPS_ROOT/docs/templates/project-system/CLAUDE_SETTINGS.template.json"
SKILLS_SRC="$STUDIO_OPS_ROOT/.claude/skills"
TASK_BOARD_HEADER="## Deferred to Project Agents"

# Parse flags
DRY_RUN=true
DO_COMMIT=false
DO_PUSH=false
for arg in "$@"; do
  case "$arg" in
    --apply) DRY_RUN=false ;;
    --commit) DO_COMMIT=true ;;
    --push) DO_PUSH=true ;;
  esac
done

extract_version() {
  local file="$1"
  local marker="$2"
  sed -n "s/^<!-- $marker: \\([0-9.]*\\) -->$/\\1/p" "$file" | head -1
}

ensure_deferred_section() {
  local file="$1"
  [ -f "$file" ] || return 0

  if grep -Fq "$TASK_BOARD_HEADER" "$file"; then
    return 0
  fi

  local tmp
  tmp=$(mktemp)

  if awk -v header="$TASK_BOARD_HEADER" '
    BEGIN { inserted = 0 }
    /^## Blocked$/ && !inserted {
      print header
      print ""
      print "- cross-repo item owned by another repo agent:"
      print ""
      inserted = 1
    }
    { print }
    END {
      if (!inserted) {
        print ""
        print header
        print ""
        print "- cross-repo item owned by another repo agent:"
      }
    }
  ' "$file" > "$tmp"; then
    mv "$tmp" "$file"
  else
    rm -f "$tmp"
    return 1
  fi
}

# Read canonical versions
CANONICAL_START_VER=$(extract_version "$TEMPLATE_START" "template-version")
CANONICAL_CLOSEOUT_VER=$(extract_version "$TEMPLATE_CLOSEOUT" "template-version")
CANONICAL_TRUTH_AUDIT_VER=$(extract_version "$TEMPLATE_TRUTH_AUDIT" "truth-audit-version")
CANONICAL_START_VER=${CANONICAL_START_VER:-unknown}
CANONICAL_CLOSEOUT_VER=${CANONICAL_CLOSEOUT_VER:-unknown}
CANONICAL_TRUTH_AUDIT_VER=${CANONICAL_TRUTH_AUDIT_VER:-unknown}

echo "════════════════════════════════════════════════"
echo "  Template Propagation — Studio OS"
echo "  Canonical: start=$CANONICAL_START_VER  closeout=$CANONICAL_CLOSEOUT_VER  truth_audit=$CANONICAL_TRUTH_AUDIT_VER"
if $DRY_RUN; then
  echo "  Mode: DRY RUN (use --apply to write files)"
else
  echo "  Mode: APPLY"
  if $DO_COMMIT; then
    echo "  Commits: YES"
  fi
  if $DO_PUSH; then
    echo "  Pushes: YES"
  fi
fi
echo "════════════════════════════════════════════════"
echo ""

UPDATED=0
SKIPPED=0
MISSING=0
ERRORS=0

# Extract compliant projects using node (jq may not be installed)
while IFS=$'\t' read -r SLUG NAME LOCAL_PATH REPO; do
  [ -n "${SLUG:-}" ] || continue
  
  # Skip studio-ops itself
  if [ "$SLUG" = "studio-ops" ]; then
    continue
  fi

  # Check localPath exists. In GitHub Actions local Windows paths are not
  # available, so clone registered repos into a temp workspace when possible.
  if [ -z "$LOCAL_PATH" ] || [ ! -d "$LOCAL_PATH" ]; then
    if [ -n "${GITHUB_ACTIONS:-}" ] && [ -n "${REPO:-}" ]; then
      CLONE_ROOT="${RUNNER_TEMP:-$STUDIO_OPS_ROOT/.repo-cache}/template-propagation"
      LOCAL_PATH="$CLONE_ROOT/$SLUG"
      if [ ! -d "$LOCAL_PATH/.git" ]; then
        mkdir -p "$CLONE_ROOT"
        echo "  ↳ cloning $REPO for CI propagation"
        git clone "https://x-access-token:${GH_TOKEN:-${GITHUB_TOKEN:-}}@github.com/${REPO}.git" "$LOCAL_PATH" >/dev/null 2>&1 || {
          echo "  ✗ $NAME ($SLUG) — clone failed for $REPO"
          MISSING=$((MISSING + 1))
          continue
        }
      fi
    else
      echo "  ✗ $NAME ($SLUG) — localPath missing or not found: $LOCAL_PATH"
      MISSING=$((MISSING + 1))
      continue
    fi
  fi

  PROMPTS_DIR="$LOCAL_PATH/prompts"
  CONTEXT_DIR="$LOCAL_PATH/context"

  # Check if prompts/ directory exists
  if [ ! -d "$PROMPTS_DIR" ]; then
    echo "  ✗ $NAME ($SLUG) — no prompts/ directory"
    MISSING=$((MISSING + 1))
    continue
  fi

  if [ ! -d "$CONTEXT_DIR" ]; then
    echo "  ✗ $NAME ($SLUG) — no context/ directory"
    MISSING=$((MISSING + 1))
    continue
  fi

  NEEDS_UPDATE=false
  UPDATE_FILES=()

  # Check start.md version
  START_FILE="$PROMPTS_DIR/start.md"
  if [ -f "$START_FILE" ]; then
    CURRENT_START_VER=$(extract_version "$START_FILE" "template-version")
    CURRENT_START_VER=${CURRENT_START_VER:-none}
    if [ "$CURRENT_START_VER" != "$CANONICAL_START_VER" ]; then
      NEEDS_UPDATE=true
      UPDATE_FILES+=("start.md ($CURRENT_START_VER → $CANONICAL_START_VER)")
    fi
  else
    NEEDS_UPDATE=true
    UPDATE_FILES+=("start.md (missing → $CANONICAL_START_VER)")
  fi

  # Check closeout.md version
  CLOSEOUT_FILE="$PROMPTS_DIR/closeout.md"
  if [ -f "$CLOSEOUT_FILE" ]; then
    CURRENT_CLOSEOUT_VER=$(extract_version "$CLOSEOUT_FILE" "template-version")
    CURRENT_CLOSEOUT_VER=${CURRENT_CLOSEOUT_VER:-none}
    if [ "$CURRENT_CLOSEOUT_VER" != "$CANONICAL_CLOSEOUT_VER" ]; then
      NEEDS_UPDATE=true
      UPDATE_FILES+=("closeout.md ($CURRENT_CLOSEOUT_VER → $CANONICAL_CLOSEOUT_VER)")
    fi
  else
    NEEDS_UPDATE=true
    UPDATE_FILES+=("closeout.md (missing → $CANONICAL_CLOSEOUT_VER)")
  fi

  # Check TRUTH_AUDIT — only propagate if MISSING (it contains project-specific data,
  # not a pure template; version drift is expected and should not trigger overwrite)
  TRUTH_AUDIT_FILE="$CONTEXT_DIR/TRUTH_AUDIT.md"
  if [ ! -f "$TRUTH_AUDIT_FILE" ]; then
    NEEDS_UPDATE=true
    UPDATE_FILES+=("TRUTH_AUDIT.md (missing → $CANONICAL_TRUTH_AUDIT_VER)")
  fi

  TASK_BOARD_FILE="$CONTEXT_DIR/TASK_BOARD.md"
  if [ -f "$TASK_BOARD_FILE" ] && ! grep -Fq "$TASK_BOARD_HEADER" "$TASK_BOARD_FILE"; then
    NEEDS_UPDATE=true
    UPDATE_FILES+=("TASK_BOARD.md (add Deferred to Project Agents section)")
  fi

  for skill in studio-start studio-closeout studio-genius-refresh; do
    if [ -d "$SKILLS_SRC/$skill" ] && [ ! -f "$LOCAL_PATH/.claude/skills/$skill/SKILL.md" ]; then
      NEEDS_UPDATE=true
      UPDATE_FILES+=(".claude/skills/$skill (missing)")
    fi
  done

  if $NEEDS_UPDATE; then
    for f in "${UPDATE_FILES[@]}"; do
      echo "  → $NAME ($SLUG): $f"
    done

    if ! $DRY_RUN; then
      if ! "$STUDIO_OPS_ROOT/scripts/check-repo-lock.sh" "$LOCAL_PATH" >/dev/null 2>&1; then
        echo "    SKIP — active session lock or remote divergence detected"
        ERRORS=$((ERRORS + 1))
        continue
      fi

      # Copy templates
      cp "$TEMPLATE_START" "$START_FILE" 2>/dev/null || { echo "    ERROR copying start.md"; ERRORS=$((ERRORS + 1)); continue; }
      cp "$TEMPLATE_CLOSEOUT" "$CLOSEOUT_FILE" 2>/dev/null || { echo "    ERROR copying closeout.md"; ERRORS=$((ERRORS + 1)); continue; }
      # Only copy TRUTH_AUDIT.md if it was missing (never overwrite existing project data)
      if [ ! -f "$TRUTH_AUDIT_FILE" ]; then
        cp "$TEMPLATE_TRUTH_AUDIT" "$TRUTH_AUDIT_FILE" 2>/dev/null || { echo "    ERROR copying TRUTH_AUDIT.md"; ERRORS=$((ERRORS + 1)); continue; }
      fi
      if [ -f "$TASK_BOARD_FILE" ]; then
        ensure_deferred_section "$TASK_BOARD_FILE" || { echo "    ERROR updating TASK_BOARD.md"; ERRORS=$((ERRORS + 1)); continue; }
      fi
      # Copy CLAUDE_SETTINGS.template.json to .claude/settings.json (create .claude/ if needed)
      CLAUDE_DIR="$LOCAL_PATH/.claude"
      CLAUDE_SETTINGS_FILE="$CLAUDE_DIR/settings.json"
      if [ ! -f "$CLAUDE_SETTINGS_FILE" ]; then
        mkdir -p "$CLAUDE_DIR" 2>/dev/null || true
        cp "$TEMPLATE_CLAUDE_SETTINGS" "$CLAUDE_SETTINGS_FILE" 2>/dev/null && echo "    + .claude/settings.json (hooks)" || true
      fi
      if [ -d "$SKILLS_SRC" ]; then
        mkdir -p "$CLAUDE_DIR/skills" 2>/dev/null || true
        for skill in studio-start studio-closeout studio-genius-refresh; do
          if [ -d "$SKILLS_SRC/$skill" ]; then
            rm -rf "$CLAUDE_DIR/skills/$skill" 2>/dev/null || true
            cp -R "$SKILLS_SRC/$skill" "$CLAUDE_DIR/skills/$skill" 2>/dev/null || true
          fi
        done
      fi

      # Optionally commit
      if $DO_COMMIT; then
        cd "$LOCAL_PATH"
        git add prompts/start.md prompts/closeout.md context/TRUTH_AUDIT.md context/TASK_BOARD.md .claude/settings.json .claude/skills 2>/dev/null || true
        git commit -m "studio-os: sync protocol assets to v$CANONICAL_START_VER

Propagated from studio-ops canonical templates.
start.md: v$CANONICAL_START_VER | closeout.md: v$CANONICAL_CLOSEOUT_VER | truth_audit.md: v$CANONICAL_TRUTH_AUDIT_VER
TASK_BOARD.md: add Deferred to Project Agents section
.claude/settings.json: Stop hook + JSON validator
.claude/skills: studio-start + studio-closeout + studio-genius-refresh" 2>/dev/null || echo "    (nothing to commit — files unchanged)"
        if $DO_PUSH; then
          BRANCH=$(git branch --show-current)
          if [ -n "$BRANCH" ]; then
            git push origin "$BRANCH" 2>/dev/null || { echo "    ERROR pushing $BRANCH"; ERRORS=$((ERRORS + 1)); cd "$STUDIO_OPS_ROOT"; continue; }
          fi
        fi
        cd "$STUDIO_OPS_ROOT"
      fi

      echo "    ✓ Updated"
    fi

    UPDATED=$((UPDATED + 1))
  else
    SKIPPED=$((SKIPPED + 1))
  fi
done < <(node -e "
  const fs = require('fs');
  const reg = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
  reg.projects
    .filter(p => p.studioOsApplied && p.status !== 'archived')
    .forEach(p => console.log([p.slug, p.name, p.localPath || '', p.repo || ''].join('\t')));
" "$STUDIO_OPS_ROOT/portfolio/PROJECT_REGISTRY.json")

echo ""
echo "════════════════════════════════════════════════"
echo "  Summary"
echo "  Updated: $UPDATED"
echo "  Already current: $SKIPPED"
echo "  Missing/inaccessible: $MISSING"
echo "  Errors: $ERRORS"
if $DRY_RUN; then
  echo ""
  echo "  This was a dry run. Use --apply to write files."
  echo "  Use --apply --commit to also create git commits."
fi
echo "════════════════════════════════════════════════"

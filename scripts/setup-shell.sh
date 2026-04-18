#!/usr/bin/env bash
# setup-shell.sh
#
# Zero-friction global shell setup for VaultSpark Studio Ops.
# Run once — adds `ops` alias + ANTHROPIC_API_KEY reminder to your shell profile.
#
# Usage:
#   bash scripts/setup-shell.sh
#   bash scripts/setup-shell.sh --zsh      # force zsh profile
#   bash scripts/setup-shell.sh --bash     # force bash profile
#   bash scripts/setup-shell.sh --dry-run  # preview only

set -euo pipefail

OPS_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ops.mjs"
DRY_RUN=false
FORCE_SHELL=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --zsh)     FORCE_SHELL="zsh" ;;
    --bash)    FORCE_SHELL="bash" ;;
  esac
done

# ── Detect shell profile ──────────────────────────────────────────────────────
if [[ -n "$FORCE_SHELL" ]]; then
  SHELL_NAME="$FORCE_SHELL"
else
  SHELL_NAME="$(basename "${SHELL:-bash}")"
fi

case "$SHELL_NAME" in
  zsh)  PROFILE="$HOME/.zshrc" ;;
  bash) PROFILE="$HOME/.bashrc" ;;
  *)    PROFILE="$HOME/.profile" ;;
esac

# ── Build lines to inject ────────────────────────────────────────────────────
MARKER="# VaultSpark Studio Ops"

ALIAS_LINE="alias ops='node \"${OPS_SCRIPT}\"'"
COMPLETION_ZSH="# Zsh ops completion"$'\n'"source <(node \"${OPS_SCRIPT}\" completion zsh 2>/dev/null) 2>/dev/null || true"
COMPLETION_BASH="# Bash ops completion"$'\n'"source <(node \"${OPS_SCRIPT}\" completion bash 2>/dev/null) 2>/dev/null || true"

[[ "$SHELL_NAME" == "zsh" ]] && COMPLETION_LINE="$COMPLETION_ZSH" || COMPLETION_LINE="$COMPLETION_BASH"

INJECT="
${MARKER}
${ALIAS_LINE}
${COMPLETION_LINE}
"

# ── Preview ──────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  VaultSpark Studio Ops — Shell Setup"
echo "  Profile: ${PROFILE}"
echo "  Mode:    $([ "$DRY_RUN" = true ] && echo 'dry-run (no changes)' || echo 'apply')"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo "Will add to ${PROFILE}:"
echo "──────────────────────────────────────────────────────────────"
echo "${INJECT}"
echo "──────────────────────────────────────────────────────────────"

# ── Check if already installed ───────────────────────────────────────────────
if grep -qF "$MARKER" "$PROFILE" 2>/dev/null; then
  echo "✓  Already installed in ${PROFILE} — no changes needed."
  echo ""
  echo "To reinstall, remove the '${MARKER}' block from ${PROFILE} first."
  exit 0
fi

if [[ "$DRY_RUN" == "true" ]]; then
  echo "Dry-run — no changes written."
  exit 0
fi

# ── Write ────────────────────────────────────────────────────────────────────
printf '%s\n' "$INJECT" >> "$PROFILE"
echo "✓  Written to ${PROFILE}"

# ── ANTHROPIC_API_KEY check ───────────────────────────────────────────────────
echo ""
if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "⚠  ANTHROPIC_API_KEY is not set."
  echo ""
  echo "   Add this to ${PROFILE} (replace with your actual key):"
  echo ""
  echo "     export ANTHROPIC_API_KEY='sk-ant-api03-...'"
  echo ""
  echo "   Get your key: https://console.anthropic.com/settings/keys"
  echo ""
  echo "   Then run:  source ${PROFILE}"
else
  echo "✓  ANTHROPIC_API_KEY is already set."
fi

# ── Final instructions ────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  Setup complete. Activate now:"
echo ""
echo "    source ${PROFILE}"
echo ""
echo "  Then use ops from ANY directory:"
echo ""
echo "    ops cockpit"
echo "    ops doctor"
echo "    ops genius-list"
echo "    ops harden-all-repos --apply --push"
echo "    ops                         (TUI mode)"
echo "══════════════════════════════════════════════════════════════"
echo ""

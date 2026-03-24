#!/usr/bin/env bash
set -euo pipefail

REMOTE_URL=$(git remote get-url origin 2>/dev/null) || { echo "No remote 'origin' found"; exit 1; }
REPO=$(echo "$REMOTE_URL" | sed -E 's#.+[:/]([^/]+/[^/]+?)(\.git)?$#\1#')
BRANCH="main"

red()   { printf '\033[1;31m%s\033[0m\n' "$*"; }
green() { printf '\033[1;32m%s\033[0m\n' "$*"; }
step()  { printf '\n\033[1;36m=> %s\033[0m\n' "$*"; }

fail() { red "FAILED: $*"; exit 1; }

# --- Ensure we're on the right branch ---
current=$(git branch --show-current)
if [[ "$current" != "$BRANCH" ]]; then
  fail "Expected branch '$BRANCH', currently on '$current'"
fi

# --- Show remote ---
step "Checking remote"
green "Remote: ${REMOTE_URL}"
green "Repo:   ${REPO}"

# --- Ensure working tree is clean ---
step "Checking working tree"
if [[ -n "$(git status --porcelain)" ]]; then
  fail "Working tree is dirty — commit or stash changes first"
fi
green "Working tree clean"

# --- Install dependencies ---
step "Installing dependencies"
npm ci || fail "npm ci"
green "Dependencies installed"

# --- Lint ---
step "Linting"
npm run lint || fail "Lint"
green "Lint passed"

# --- Tests ---
step "Running tests"
npm test || fail "Tests"
green "Tests passed"

# --- Build ---
step "Building"
npm run build || fail "Build"
green "Build succeeded"

# --- Push ---
step "Pushing to origin/${BRANCH}"
git push -u origin "$BRANCH" || fail "Push"
green "Pushed — GitHub Actions will deploy to Pages"

echo ""
green "Done! Monitor the deploy at:"
echo "  https://github.com/${REPO}/actions"

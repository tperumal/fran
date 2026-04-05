#!/bin/bash
set -x

echo "Script started"
echo "PATH: $PATH"

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew install node@22

export PATH="$(brew --prefix node@22)/bin:$PATH"

echo "node: $(node --version)"
echo "npm: $(npm --version)"

cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

# Copy web assets and config into the iOS project
npx cap sync ios

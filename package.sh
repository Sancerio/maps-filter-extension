#!/bin/bash
# Convenience wrapper for the packaging script
# Automatically bump the extension version before packaging

set -e

# Bump patch version in package.json without creating a git tag
NEW_VERSION=$(npm version patch --no-git-tag-version | tr -d 'v')

# Update manifest.json with the new version
jq --arg v "$NEW_VERSION" '.version = $v' manifest.json > manifest.tmp && mv manifest.tmp manifest.json

# Run the actual packaging script
./scripts/pack.sh "$@"

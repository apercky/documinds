#!/bin/bash
set -e

# --- CONFIGURAZIONE ---
CR_USER="apercky"
CR_PATH="ghcr.io"
REPO_NAME="documinds"

# --- POSIZIONATI NELLA ROOT DEL PROGETTO ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# --- LOGIN CONTAINER REGISTRY ---
echo "Logging into $CR_PATH..."
echo "$GHCR_TOKEN" | docker login $CR_PATH -u $CR_USER --password-stdin

# --- VERSIONING ---
VERSION=$(jq -r .version package.json)
echo "Building version: $VERSION"

# --- EXPORT NEXT_PUBLIC_* VARIABLES ---
echo "Loading NEXT_PUBLIC_* variables from .env..."
export $(grep '^NEXT_PUBLIC_' .env | xargs)

# --- BUILD_ARGS AUTOMATICI ---
BUILD_ARGS=$(grep '^NEXT_PUBLIC_' .env | sed 's/^/--build-arg /' | xargs)

# --- DOCKER BUILD ---
echo "Building Docker image..."
docker build $BUILD_ARGS -t $CR_PATH/$CR_USER/$REPO_NAME:$VERSION .

# --- TAG LATEST ---
docker tag $CR_PATH/$CR_USER/$REPO_NAME:$VERSION $CR_PATH/$CR_USER/$REPO_NAME:latest

# --- PUSH IMAGES ---
echo "Pushing $VERSION to $CR_PATH..."
docker push $CR_PATH/$CR_USER/$REPO_NAME:$VERSION

echo "Pushing latest tag to $CR_PATH..."
docker push $CR_PATH/$CR_USER/$REPO_NAME:latest

echo "✅ Build & Push completed!"

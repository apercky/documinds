#!/bin/bash
set -e

# Define variables
CR_PATH=${CR_PATH:-ghcr.io}
CR_USER=${CR_USER:-apercky}
REPO_NAME=${REPO_NAME:-documinds}
IMAGE_NAME="${CR_PATH}/${CR_USER}/${REPO_NAME}"
IMAGE_TAG=${1:-latest}  # Use the first argument as tag or default to 'latest'
PLATFORMS="linux/amd64,linux/arm64"

# Display build information
echo "Building multi-architecture Docker image:"
echo "Image: $IMAGE_NAME:$IMAGE_TAG"
echo "Platforms: $PLATFORMS"

# Make sure buildx is installed and create a new builder instance if it doesn't exist
docker buildx inspect multiarch-builder >/dev/null 2>&1 || docker buildx create --name multiarch-builder --use

# Log in to registry if GHCR_TOKEN is set
if [ -n "$GHCR_TOKEN" ]; then
  echo "Logging in to container registry..."
  echo $GHCR_TOKEN | docker login ${CR_PATH} -u ${CR_USER} --password-stdin
fi

# Build and push the multi-architecture image
docker buildx build \
  --platform $PLATFORMS \
  --tag $IMAGE_NAME:$IMAGE_TAG \
  --push \
  --progress=plain \
  .

echo "Multi-architecture build complete for $IMAGE_NAME:$IMAGE_TAG" 
#!/bin/bash
set -e

echo "Setting up environment for multi-architecture Docker builds..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if buildx is available
if ! docker buildx version &> /dev/null; then
    echo "❌ Docker Buildx is not available. This is required for multi-architecture builds."
    echo "Please upgrade to Docker Desktop or install the buildx plugin."
    exit 1
fi

echo "✅ Docker Buildx is available"

# Check if builder exists and create it if needed
if ! docker buildx inspect multiarch-builder &> /dev/null; then
    echo "Creating new buildx builder instance 'multiarch-builder'..."
    docker buildx create --name multiarch-builder --driver docker-container --bootstrap
else
    echo "✅ Builder 'multiarch-builder' already exists"
fi

# Set as default builder
docker buildx use multiarch-builder

# Inspect the builder to verify setup
echo "Inspecting builder configuration:"
docker buildx inspect

echo "Verifying platform support..."
SUPPORTED_PLATFORMS=$(docker buildx inspect --bootstrap | grep "Platforms:" | cut -d ":" -f2)
echo "Supported platforms: $SUPPORTED_PLATFORMS"

# Check for ARM64 and AMD64 support
if [[ "$SUPPORTED_PLATFORMS" == *"linux/arm64"* ]] && [[ "$SUPPORTED_PLATFORMS" == *"linux/amd64"* ]]; then
    echo "✅ Builder supports both ARM64 and AMD64 architectures"
else
    echo "⚠️ Warning: Builder may not support all required architectures"
    echo "Please ensure QEMU is installed for cross-platform emulation:"
    echo "   docker run --privileged --rm tonistiigi/binfmt --install all"
fi

echo ""
echo "✅ Multi-architecture build environment is ready!"
echo ""
echo "To build multi-architecture images, run:"
echo "   export GHCR_TOKEN=your_github_token"
echo "   ./scripts/build-multiarch.sh [tag]"
echo ""
echo "Or use the Makefile target:"
echo "   export GHCR_TOKEN=your_github_token"
echo "   make build-multiarch" 
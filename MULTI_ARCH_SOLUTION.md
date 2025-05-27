# Multi-Architecture Docker Solution for Documinds

This document outlines the changes made to support multi-architecture Docker images for both AMD64 (x86_64) and ARM64 platforms.

## Problem

When running the Documinds Docker image in Kubernetes, we encountered the following error:

```txt
The image issue is related to architecture compatibility. You need to either rebuild the image for the correct architecture or use a multi-architecture image.
```

This happens because the Docker image was built for a specific architecture (likely amd64) but is being deployed to nodes with a different architecture (likely arm64).

## Solution

We implemented a comprehensive solution for building and deploying multi-architecture Docker images:

1. **Updated Dockerfile**:
   - Added platform specifications (`--platform=$BUILDPLATFORM` and `--platform=$TARGETPLATFORM`)
   - Used Prisma client generation with binary targets defined in schema.prisma
   - Ensured proper copying of Prisma binaries to the final image

2. **Updated Prisma Schema**:
   - Added additional binary targets to support various architectures:
     - `native`
     - `darwin-arm64` (Apple Silicon)
     - `darwin` (Intel Mac)
     - `linux-musl-arm64-openssl-3.0.x` (ARM64 Linux)
     - `linux-musl-x64-openssl-3.0.x` (AMD64 Linux)
     - `windows`

3. **Enhanced Makefile**:
   - Enhanced `build-multiarch` target to handle everything in one command:
     - Login to container registry
     - Setup Docker Buildx
     - Build multi-architecture images
     - Push to registry

4. **Kubernetes Configuration**:
   - Updated the deployment to use the multi-architecture image
   - Added image pull secrets configuration for GitHub Container Registry

## How to Build

Building your multi-architecture image is simple with just one command:

```bash
# Set your GitHub token for container registry
export GHCR_TOKEN=your_github_token

# Build and push multi-architecture image
make build-multiarch
```

## How to Deploy

1.Create the GitHub Container Registry secret:

```bash
kubectl create secret docker-registry ghcr-auth \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_TOKEN \
  --docker-email=YOUR_EMAIL
```

2.Apply the Kubernetes deployment:

```bash
kubectl apply -f k8s-deployment.yaml
```

## Testing

To verify that your image is multi-architecture:

```bash
docker buildx imagetools inspect ghcr.io/apercky/documinds:latest
```

This should show both `linux/amd64` and `linux/arm64` in the platforms list.

## Troubleshooting

If you encounter issues:

1. **Prisma client generation errors**:
   - The error "The generator client.binaryTargets specified via --generator does not exist in your Prisma schema" means you should not override targets in the Dockerfile command
   - Let Prisma use the targets defined in schema.prisma

2. **Missing architecture support**:
   - Install QEMU for cross-platform emulation:

    ```bash
    docker run --privileged --rm tonistiigi/binfmt --install all
    ```

3. **Check what platforms your builder supports**:

   ```bash
   docker buildx inspect
   ```

## References

- [Docker Buildx documentation](https://docs.docker.com/build/buildx/)
- [Multi-platform images with Docker](https://docs.docker.com/build/building/multi-platform/)
- [Prisma deployment guides](https://www.prisma.io/docs/orm/prisma-client/deployment)
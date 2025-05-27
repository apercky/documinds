# Documinds

A modern, AI-powered document search and chat interface built with Next.js 14, featuring a beautiful UI powered by shadcn/ui and Tailwind CSS.

![Documinds Logo](/public/logo.svg)

## Features

- 🎨 Modern and responsive UI with dark/light mode support
- 🌍 Internationalization support (English and Italian)
- 💬 AI-powered chat interface with markdown support
- 📱 Collapsible sidebar for better mobile experience
- 🔍 Advanced document search capabilities
- 🎯 Real-time chat with code highlighting
- 🔒 Secure and private document handling

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Hooks
- **Markdown**: react-markdown with syntax highlighting
- **Icons**: Lucide Icons
- **Animations**: Framer Motion
- **Type Safety**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1.Clone the repository:

```bash
git clone https://github.com/yourusername/documinds.git
cd documinds
```

2.Install dependencies:

```bash
npm install
# or
yarn install
```

3.Create a `.env.local` file in the root directory and add your environment variables:

```env
# Your environment variables here
```

4.Start the development server:

```bash
npm run dev
# or
yarn dev
```

5.Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```bash
documinds/
├── app/                   # Next.js app directory
│   ├── [locale]/         # Internationalized routes
│   └── api/              # API routes
├── components/           # React components
│   ├── ui/              # Reusable UI components
│   └── layout/          # Layout components
├── lib/                 # Utility functions
├── public/              # Static assets
├── styles/             # Global styles
└── messages/           # i18n messages
```

## Deploy to production environment

### Docker Deployment

To deploy Documinds using Docker, follow these steps:

1.Login to GitHub Container Registry:

```bash
echo $CR_PATH | docker login ghcr.io -u apercky --password-stdin
```

2.Build the Docker image:

```bash
VERSION=1.0.0

# Build with tag for GitHub Container Registry
docker build -t ghcr.io/apercky/documinds:$VERSION .
```

3.If using a private registry, tag and push the image:

```bash
# Push to GitHub Container Registry
docker push ghcr.io/apercky/documinds:$VERSION

# Create the latest tag
docker tag ghcr.io/apercky/documinds:$VERSION ghcr.io/apercky/documinds:latest

# Push the latest tag
docker push ghcr.io/apercky/documinds:latest
```

4.Run the Docker container:

```bash
VERSION=1.0.0

# Senza certificato personalizzato
docker run -p 3000:3000 ghcr.io/apercky/documinds:$VERSION

# Con certificato personalizzato per risolvere problemi UNABLE_TO_GET_ISSUER_CERT_LOCALLY
docker run --name documinds-app \
  --env-file .env \
  -p 3000:3000 \
  -v /Users/apercky/certs:/app/certs \
  ghcr.io/apercky/documinds:$VERSION
```

#### Troubleshooting Docker Build

If you encounter build issues:

- Ensure `next.config.js` includes `output: 'standalone'` for Next.js 15
- Fix ENV variables in Dockerfile to use `KEY=value` format instead of `KEY value`
- Make sure you're copying the correct output files in the final stage
- If you get ESLint or TypeScript errors during build:
  - Add `--no-lint` flag to the build command
  - Use the `build:docker` script which skips linting: `npm run build:docker`
  - Fix your ESLint configuration in `.eslintrc.js` to ensure valid rules

#### Troubleshooting Container Runtime

If you encounter runtime issues with the container:

- Check that all required environment variables are provided:

  ```bash
  docker run --env-file .env -p 3000:3000 ghcr.io/apercky/documinds:$VERSION
  ```

- If you encounter SSL certificate issues (UNABLE_TO_GET_ISSUER_CERT_LOCALLY):

  ```bash
  # Montare il certificato personalizzato dalla directory locale
  docker run --env-file .env -p 3000:3000 \
    -v /Users/apercky/certs:/app/certs \
    ghcr.io/apercky/documinds:$VERSION
  ```

### Multi-Architecture Docker Builds

To build Docker images that can run on different CPU architectures (like x86/amd64 and ARM64), use the multi-architecture build through the Makefile:

```bash
# Set your GitHub token for container registry
export GHCR_TOKEN=your_github_token

# Build and push multi-arch image 
make build-multiarch
```

This single command will:

1. Log in to the GitHub Container Registry
2. Set up the Docker Buildx environment
3. Build for both `linux/amd64` and `linux/arm64` architectures
4. Push the multi-architecture image to your registry

Your containers will now run on different CPU architectures, including Kubernetes clusters with mixed node architectures.

#### Troubleshooting Multi-Architecture Builds

If you encounter issues with multi-architecture builds:

1. **Error with Prisma client generation**:
   - The schema.prisma file has the correct binary targets configured
   - No need to specify targets in the Dockerfile command

2. **Missing architecture support**:

   - Install QEMU for cross-platform emulation:

     ```bash
     docker run --privileged --rm tonistiigi/binfmt --install all
     ```

3. **Buildx permission issues**:
   - Make sure you have the correct permissions to create and use builders
   - On Linux, you might need to use sudo

4. **Verify your multi-architecture image**:

   ```bash
   docker buildx imagetools inspect ghcr.io/apercky/documinds:latest
   ```

5. **Test the image on different architectures**:

   ```bash
   # For ARM64
   docker run --platform linux/arm64 ghcr.io/apercky/documinds:latest
   
   # For AMD64
   docker run --platform linux/amd64 ghcr.io/apercky/documinds:latest
   ```

### Kubernetes Deployment with Multi-Architecture Images

When deploying to Kubernetes with multi-architecture images, you need to set up access to the GitHub Container Registry:

1.Create a secret for GitHub Container Registry authentication:

```bash
# Create a secret with your GitHub credentials
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

3.Check that pods are being scheduled correctly:

```bash
# See which nodes your pods are running on
kubectl get pods -o wide

# Check node architectures
kubectl get nodes -o wide
```

Your pods should be scheduled on nodes with the appropriate architecture automatically, thanks to the multi-architecture image.

### Kubernetes Deployment

For deploying to a Kubernetes cluster:

1.Apply the Kubernetes deployment:

```bash
kubectl apply -f k8s-deployment.yaml
```

2.Check deployment status:

```bash
kubectl get deployments
kubectl get pods
```

3.Access the service:

```bash
kubectl port-forward svc/documinds-service 8080:80
```

The application will be available at <http://localhost:8080>

#### Certificate Configuration for Kubernetes

To set up the certificate in Kubernetes:

1.Create a ConfigMap from your certificate file:

```bash
kubectl create configmap documinds-certs --from-file=/Users/apercky/certs/staging-documinds-certs.pem
```

2.Or update the ConfigMap in the k8s-deployment.yaml:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: documinds-certs
data:
  staging-documinds-certs.pem: |-
    # Paste your certificate content here
```

3.Apply the configuration:

```bash
kubectl apply -f k8s-deployment.yaml
```

The container is configured to use this certificate automatically via the NODE_EXTRA_CA_CERTS environment variable.

## Key Components

- **Chat Interface**: Real-time chat with AI, featuring markdown support and code highlighting
- **Sidebar Navigation**: Collapsible sidebar with project navigation and user settings
- **Internationalization**: Built-in support for multiple languages
- **Theme Switcher**: Dynamic dark/light mode switching
- **Document Viewer**: Advanced document viewing capabilities

## Contributing

We welcome contributions! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Next.js](https://nextjs.org/) for the amazing framework
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Lucide Icons](https://lucide.dev/) for the beautiful icons

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.

---

Built with ❤️ using Next.js and shadcn/ui

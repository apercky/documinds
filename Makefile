# Configurazioni base
CR_PATH = ghcr.io
CR_USER = apercky
REPO_NAME = documinds
VERSION ?= $(shell jq -r .version package.json)

# Next Public Vars
BUILD_ARGS = $(shell grep '^NEXT_PUBLIC_' .env | sed 's/^/--build-arg /' | xargs)

# Comandi

.PHONY: dev build push all build-multiarch dist seed compile-seed

dev:
	@echo "🛠️  Starting dev container with hot-reload..."
	docker run --rm -it \
		-p 3000:3000 \
		--env-file .env.local \
		--network="bridge" \
		-v $(shell pwd):/app \
		-v /app/node_modules \
		-w /app \
		node:20-alpine sh -c "apk add --no-cache bash && npm install && npm run dev"


build:
	@echo "🔨 Building $(VERSION)..."
	@docker build $(BUILD_ARGS) -t $(CR_PATH)/$(CR_USER)/$(REPO_NAME):$(VERSION) .
	@docker tag $(CR_PATH)/$(CR_USER)/$(REPO_NAME):$(VERSION) $(CR_PATH)/$(CR_USER)/$(REPO_NAME):latest

push:
	@echo "🚀 Pushing $(VERSION) to $(CR_PATH)..."
	@docker push $(CR_PATH)/$(CR_USER)/$(REPO_NAME):$(VERSION)
	@docker push $(CR_PATH)/$(CR_USER)/$(REPO_NAME):latest

login:
	@echo "🔑 Logging into $(CR_PATH)..."
	@if [ -z "$$GHCR_TOKEN" ]; then \
		echo "❌ ERROR: GHCR_TOKEN is not set"; \
		exit 1; \
	fi
	@echo $$GHCR_TOKEN | docker login $(CR_PATH) -u $(CR_USER) --password-stdin

build-multiarch: 
	@echo "🏗️  Building multi-architecture image for $(VERSION)..."
	@if [ -z "$$GHCR_TOKEN" ]; then \
		echo "❌ ERROR: GHCR_TOKEN is not set"; \
		exit 1; \
	fi
	@echo $$GHCR_TOKEN | docker login $(CR_PATH) -u $(CR_USER) --password-stdin
	@if ! docker buildx version >/dev/null 2>&1; then \
		echo "❌ ERROR: Docker Buildx is not available. Please upgrade Docker or install the buildx plugin."; \
		exit 1; \
	fi
	@echo "Setting up Docker Buildx environment..."
	@if ! docker buildx inspect multiarch-builder >/dev/null 2>&1; then \
		docker buildx create --name multiarch-builder --driver docker-container --bootstrap; \
	else \
		echo "Using existing builder instance"; \
		docker buildx use multiarch-builder; \
		docker buildx inspect; \
	fi
	@docker buildx build $(BUILD_ARGS) \
		--no-cache \
		--platform linux/amd64,linux/arm64 \
		--tag $(CR_PATH)/$(CR_USER)/$(REPO_NAME):$(VERSION) \
		--tag $(CR_PATH)/$(CR_USER)/$(REPO_NAME):latest \
		--push \
		.
	@echo "✅ Multi-architecture build complete for $(VERSION)"

all: login build

dist: login compile-seed build-multiarch

# Esegui il seed localmente (dev only)
seed:
	npx prisma db seed

# Compila seed.ts in seed.js per Docker
compile-seed:
	@echo "🔧 Compiling and bundling seed.ts to seed.js..."
	npx esbuild prisma/seed.ts --bundle --platform=node --outfile=prisma/seed.js --external:@prisma/client --target=es2020
	@echo "✅ seed.js compiled and bundled successfully"


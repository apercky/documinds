# Configurazioni base
CR_PATH = ghcr.io
CR_USER = apercky
REPO_NAME = documinds
VERSION = $(shell jq -r .version package.json)

# Next Public Vars
BUILD_ARGS = $(shell grep '^NEXT_PUBLIC_' .env | sed 's/^/--build-arg /' | xargs)

# Comandi

.PHONY: dev build push all

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

all: login build push

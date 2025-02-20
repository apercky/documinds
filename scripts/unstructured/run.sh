#! /bin/zsh
echo "Stopping Unstructured API..."
docker compose -f scripts/unstructured/docker-compose.yml down && \
echo "Starting Unstructured API..."
docker compose -f scripts/unstructured/docker-compose.yml up -d
echo "Unstructured API started"

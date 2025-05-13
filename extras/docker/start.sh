#! /bin/zsh

echo "Starting DOCUMINDS services..."
docker compose -f docker-compose.yml --env-file .env up -d
echo "DOCUMINDS services started"

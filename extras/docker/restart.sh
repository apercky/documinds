#! /bin/zsh
echo "Restarting DOCUMINDS services..."
echo "--------------------------------"
echo "Stopping DOCUMINDS services..."
docker compose -f docker-compose.yml down && \
echo "Starting DOCUMINDS services..."
docker compose -f docker-compose.yml --env-file .env up -d
echo "DOCUMINDS services started"
#! /bin/zsh
echo "Stopping DOCUMINDS services..."
docker compose -f docker-compose.yml down && \
echo "DOCUMINDS services stopped"

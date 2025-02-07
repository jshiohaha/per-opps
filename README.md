# PER Telegram Bot

## Setup workspace

```bash
pnpm install
```

## Build Docker Image

```bash
docker build -t per-tg-bot:latest -f Dockerfile .
```

## Run in Docker

```bash
# Run the container
docker run -d \
  --name per-tg-bot \
  --env-file .env \
  -v ./logs:/app/logs \
  --restart unless-stopped \
  per-tg-bot:latest
```

## Run via docker-compose

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down

# Rebuild and restart only if there are changes
docker-compose up -d

# Force rebuild ignoring cache
docker-compose build --no-cache
docker-compose up -d
```

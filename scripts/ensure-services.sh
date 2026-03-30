#!/usr/bin/env bash
# Ensures Postgres and Redis are running via docker compose before starting dev.
# Called automatically by `pnpm dev` from the monorepo root.

set -e

COMPOSE_FILE="apps/api/docker-compose.yml"

if ! command -v docker &> /dev/null; then
  echo "⚠️  Docker not found — skipping service startup. Install Docker to run Postgres & Redis locally."
  exit 0
fi

# Check if containers are already running
if docker compose -f "$COMPOSE_FILE" ps --status running 2>/dev/null | grep -q "glossarly"; then
  echo "✓ Postgres & Redis already running"
else
  echo "Starting Postgres & Redis..."
  docker compose -f "$COMPOSE_FILE" up -d --wait
  echo "✓ Services ready"
fi

# Khidmat Docker Containerization

This directory contains container configurations for running the Khidmat web application in an isolated Docker environment.

---

## 1. Files Overview

- **`Dockerfile`**: Multi-stage build for Expo React Native web runtime with non-root security context.
- **`docker-compose.yml`**: Compose service configuration for local development with file watching and volume mounts.
- **`.dockerignore`**: Excludes `node_modules`, `.expo`, `.git`, build caches, and test artifacts from image builds.

---

## 2. Ports

| Port | Service |
| :--- | :--- |
| `8081` | Expo Metro / Web development server |
| `3000` | Fallback HTTP port |
| `19000` / `19001` | Expo DevTools & WebSocket debugging ports |

---

## 3. Quick Start

### Build and Run with Docker Compose
```bash
# Navigate to the repository root
cd path/to/khidmat-app

# Build and start the container
docker compose -f docker/docker-compose.yml up --build
```

### Run Standalone Image
```bash
# Build the Docker image from repo root
docker build -t khidmat-mobile-web -f docker/Dockerfile .

# Run the container
docker run -p 8081:8081 --env-file .env khidmat-mobile-web
```

---

## 4. Environment Variables

Ensure your root `.env` file contains valid client configurations:
```ini
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_AGENT_SERVER_URL=http://localhost:8787
```

> **Note on Local Supabase:** Running a local Supabase stack in Docker requires Docker Desktop with Linux container support enabled. For integration testing on machines without Docker, use the cloud `khidmat-test` instance via `.env.test`.

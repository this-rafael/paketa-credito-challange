# Paketa / Base39 — Menu challenge (monorepo)

- **backend/** — Menu API (Express + MongoDB). Docs: [backend/README.md](backend/README.md)
- **frontend/** — Menu Studio (Angular). Docs: [frontend/README.md](frontend/README.md)

## Quick start (Docker — full stack)

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| UI | http://localhost:4200 |
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/docs (also via UI proxy `/docs`) |

The `web` container serves the Angular build with nginx and proxies `/api` to the `api` service.

## Local (without Docker UI)

```bash
docker compose up mongodb api   # or full stack
npm run install:all             # once
npm run dev:frontend            # proxy /api → :3000
```

The Angular mock (`npm run start:api --prefix frontend`) is optional/legacy; prefer the real API.

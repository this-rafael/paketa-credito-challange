# Menu API

HTTP service for corporate menu management.

## Requirements

- Node.js 24 LTS
- MongoDB (local or via Docker Compose)

## Setup

```bash
npm ci
```

## Environment

| Variable          | Description               | Default                          |
| ----------------- | ------------------------- | -------------------------------- |
| `PORT`            | HTTP port                 | `3000`                           |
| `MONGODB_URI`     | MongoDB connection string | `mongodb://127.0.0.1:27017/menu` |
| `LOG_LEVEL`       | Pino log level            | `info`                           |
| `JSON_BODY_LIMIT` | Max JSON body size        | `100kb`                          |

Invalid values fail during startup before the process opens the HTTP port.

## Scripts

```bash
npm test
npm run coverage
npm run typecheck
npm run lint
npm run format:check
npm run openapi:lint
npm run audit
npm run benchmark
npm run dev
npm start
```

## Local run

```bash
npm ci
npm run dev
```

The API listens on `PORT` after connecting to MongoDB and ensuring indexes.

## HTTP API

- `POST /api/v1/menu`
- `GET /api/v1/menu`
- `DELETE /api/v1/menu/{id}`

OpenAPI 3.1: `openapi/openapi.yaml`  
Swagger UI: `GET /docs`  
Raw spec: `GET /openapi.yaml`

## Docker Compose

```bash
docker compose up --build
```

Services:

- `api` — Node 24 image running as non-root (`USER node`)
- `mongodb` — MongoDB 7 without replica set

## Quality gates

CI runs format, lint, typecheck, tests with 100% coverage thresholds, OpenAPI lint, dependency audit and Docker build. The tree benchmark is non-blocking.

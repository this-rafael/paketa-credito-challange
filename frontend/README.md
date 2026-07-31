# MenuVerse Studio

Frontend Angular para o desafio de API de Menu, com UI inspirada no [MenuVerse](https://navigation-studio.lovable.app/).

## Stack

- Angular 19 (standalone)
- Design system próprio (CSS tokens estilo MenuVerse)
- Consome `GET` / `POST` / `DELETE` `/api/v1/menu`

## Rodar (Docker — recomendado)

Na raiz do monorepo:

```bash
docker compose up --build
```

UI: http://localhost:4200 (nginx + proxy `/api` → serviço `api`)

## Rodar (dev local)

```bash
# API na porta 3000 (Docker ou npm run dev:backend)
npm start
```

App: http://localhost:4200  
Proxy: `/api` → `http://localhost:3000`

`npm run start:api` (mock local) é legado/opcional.

## Features

- Árvore hierárquica infinita
- Mapa visual read-only (SVG + pan/zoom)
- Criar / excluir itens
- Detalhes derivados (nível, path, filhos)
- HTTP Console com log das requisições

# BDD: API Menu

Tags: `unit` `property` `integration` `http` `contract` `concurrency` `architecture` `operational` `quality` `benchmark`

## Criação

**CRT-001** `http` `integration` `contract`  
Criar raiz `"Eletrodomésticos"` → `201`, body só `{ id }` string numérica; documento com `parentId: null`, `ancestors: []`, `_id` ObjectId.

**CRT-002** `unit` `http` `integration`  
POST com `"  Televisores  "` → `201`; nome persistido/público `"Televisores"`.

**CRT-003** `http` `integration` `contract`  
Dado raiz ID `1`, POST `{ "name": "Televisores", "relatedId": 1 }` → `201`; `parentId: 1`, `ancestors: [1]`; pai não embute o filho.

**CRT-004** `unit` `integration`  
Dado item `3` com `parentId: 2`, `ancestors: [1,2]`, criar `"110"` → `parentId: 3`, `ancestors: [1,2,3]`; próprio id fora de `ancestors`.

**CRT-005** `unit` `http` `integration`  
`relatedId: 999` inexistente, contador em `10` → `404 PARENT_MENU_ITEM_NOT_FOUND`; nada persistido; contador permanece `10`.

**CRT-006** `http` `integration`  
Nome já existente → `409 MENU_ITEM_NAME_ALREADY_EXISTS`.

**CRT-007** `http` `integration`  
Nome que difere só por espaços → `409`.

**CRT-008** `http` `integration`  
`"Televisores"` e `"televisores"` → ambos `201` (case-sensitive).

**CRT-009** `http` `integration`  
`"Informática"` e `"Informatica"` → ambos `201`.

**CRT-010** `integration`  
Insert falha após reservar ID → ID não é reutilizado; próximo ID maior.

**CRT-011** `http` `integration`  
POST sem `Idempotency-Key` → `201`; só `Content-Type` obrigatório além do corpo.

**CRT-012** `http` `integration`  
Repetir POST do mesmo nome → `409` (não é replay idempotente).

## Validação

**VAL-001** `http`  
Corpos inválidos de `name` (`{}`, `null`, número, `""`, só espaços) → `400 VALIDATION_ERROR`; nada criado.

**VAL-002** `http`  
`relatedId` inválido (`null`, string, `0`, `-1`, decimal, `> MAX_SAFE_INTEGER`) → `400 VALIDATION_ERROR`.

**VAL-003** `http`  
Propriedade desconhecida (ex.: `position`) → `400 VALIDATION_ERROR`.

**VAL-004** `http`  
JSON malformado → `400 INVALID_JSON` sem stack.

**VAL-005** `http`  
Content-Type ausente / `text/plain` / form-urlencoded → `415 UNSUPPORTED_MEDIA_TYPE`.

**VAL-006** `http`  
Corpo acima de `JSON_BODY_LIMIT` → `413 PAYLOAD_TOO_LARGE`.

**VAL-007** `unit` `architecture`  
Rejeição de mídia/parser/schema → use case e persistência não são chamados.

## Consulta

**GET-001** `http` `integration` `contract`  
Sem itens → `200` e `[]` (sem Content-Type obrigatório).

**GET-002** `http` `integration` `contract`  
Menu de exemplo persistido → `200` com relações corretas; cada item uma vez.

**GET-003** `unit` `http` `contract`  
Nó público: `id` string + `name`; `submenus` só com filhos; sem `_id`, `parentId`, `ancestors`, timestamps.

**GET-004** `unit` `http`  
Folha: propriedade `submenus` ausente (não `null` nem `[]`).

**GET-005** `unit` `http` `integration`  
IDs `10`, `2`, `1` no mesmo nível → ordem `"1"`, `"2"`, `"10"`.

**GET-006** `unit` `architecture`  
Montagem: Map + duas passagens iterativas, O(n), sem recursão.

**GET-007** `integration` `architecture`  
Uma leitura ordenada; sem N+1; sem reordenar em memória.

**GET-008** `unit`  
`parentId` inexistente no conjunto → erro de integridade; órfão não vira raiz.

**GET-009** `http` `integration` `operational`  
Documento órfão no banco → `500 INTERNAL_ERROR` sem vazar dados; log com id inconsistente.

**GET-010** `unit`  
Cadeia ≥ 1000 níveis monta sem stack overflow na montagem.

**GET-011** `property`  
Floresta arbitrária: contagem, unicidade, relações, raízes, folhas, ordem e determinismo.

## Exclusão

**DEL-001** `http` `integration` `contract`  
DELETE folha → `200`; item some; demais permanecem.

**DEL-002** `http` `integration`  
Excluir `Televisores` na árvore `Eletrodomésticos > Televisores > LCD > 110` (com `Informática` externa) → remove subárvore; externos permanecem.

**DEL-003** `integration`  
Delete: `id` alvo OR `ancestors` contém alvo; sem queries recursivas.

**DEL-004** `http` `integration`  
DELETE id inexistente válido → `404 MENU_ITEM_NOT_FOUND`.

**DEL-005** `http` `integration`  
DELETE repetido após sucesso → `404 MENU_ITEM_NOT_FOUND`.

**DEL-006** `http`  
Rotas inválidas (`0`, `-1`, `1.5`, `abc`, `01`, `+1`, `1e3`, `> MAX_SAFE_INTEGER`) → `400 INVALID_MENU_ITEM_ID`.

## Persistência e concorrência

**CON-001** `integration` `concurrency`  
Criações paralelas com nomes distintos → todos `201`, IDs únicos, contador atômico `menu-item`.

**CON-002** `integration` `concurrency`  
Mesmo nome em paralelo → um `201`, demais `409 MENU_ITEM_NAME_ALREADY_EXISTS`.

**CON-003** `integration`  
Índices: unique(`id`), unique(`name`), index(`parentId`), multikey(`ancestors`).

**CON-004** `integration`  
Segundo insert com mesmo `id` funcional bloqueado pelo índice.

**CON-005** `integration` `operational`  
Contador acima de `MAX_SAFE_INTEGER` → falha controlada + alerta em log.

**CON-006** `integration`  
Um documento por item; sem filhos embutidos; relações via `parentId`/`ancestors`.

**CON-007** `unit` `integration`  
Raiz: id positivo, name trimado, `parentId: null`, `ancestors: []`.

**CON-008** `unit` `integration`  
Filho: último de `ancestors` == `parentId`; id fora de `ancestors`; `_id` não vaza.

**CON-009** `integration` `concurrency` `redlock`  
DELETE do pai em paralelo com POST de filho (`relatedId` = pai): sem lock (noop + delay pós-lookup) pelo menos um órfão (`parentId` aponta para pai ausente); com Redlock a invariante vale — se o filho existe o pai também existe, e `GET /api/v1/menu` nunca falha por integridade.

## Erros e observabilidade

**ERR-001** `http` `operational`  
Catálogo: cada falha → status + código + `requestId`  
(`INVALID_JSON` 400, `INVALID_MENU_ITEM_ID` 400, `VALIDATION_ERROR` 400, `PARENT_MENU_ITEM_NOT_FOUND` 404, `MENU_ITEM_NOT_FOUND` 404, `ROUTE_NOT_FOUND` 404, `MENU_ITEM_NAME_ALREADY_EXISTS` 409, `PAYLOAD_TOO_LARGE` 413, `UNSUPPORTED_MEDIA_TYPE` 415, `DATABASE_UNAVAILABLE` 503, `INTERNAL_ERROR` 500).

**ERR-002** `http`  
Rota inexistente → `404 ROUTE_NOT_FOUND` + `requestId`.

**ERR-003** `http` `integration`  
Banco indisponível → `503` sem URI/driver/stack.

**ERR-004** `http` `operational`  
Falha não catalogada → `500` sem stack.

**ERR-005** `http` `operational`  
Mesmo `requestId` na resposta e no log de erro.

**ERR-006** `http` `operational`  
Log de sucesso: `requestId`, method, route, status, `durationMs`.

**ERR-007** `operational`  
Logs sem auth headers, cookies, connection string, objetos Mongoose, stacks em sucesso.

**ERR-008** `http` `operational`  
Helmet; sem CORS permissivo.

**ERR-009** `http` `architecture`  
Ordem: requestId → log → Helmet → media → JSON → rotas → zod → controller → notFound → errorHandler.

## Operação

**OPS-001** `unit` `operational`  
Env inválido (`PORT`, `MONGODB_URI`, `LOG_LEVEL`, `JSON_BODY_LIMIT`) → não abre porta.

**OPS-002** `integration` `operational`  
Boot: env → logger → mongo → índices → composição → createApp → listen.

**OPS-003** `integration` `operational`  
Mongo down no boot → sem listen.

**OPS-004** `integration` `operational`  
Shutdown: para de aceitar, drena, fecha mongo, exit.

**OPS-005** `architecture` `http`  
`createApp` não abre porta.

**OPS-006** `operational` `quality`  
Run local: três endpoints respondem.

**OPS-007** `operational` `quality`  
Docker Compose `api` + `mongodb`, non-root, sem replica set.

## Arquitetura

**ARC-001** `architecture`  
Node 24, TS strict, Express 5, Zod, Mongo/Mongoose, Vitest, Supertest, Testcontainers, fast-check.

**ARC-002** `architecture`  
Domínio sem Express/Mongoose/Zod/Pino/env/HTTP status.

**ARC-003** `architecture`  
Use cases só domínio + portas; testáveis com fakes.

**ARC-004** `architecture`  
HTTP sem queries Mongoose.

**ARC-005** `architecture`  
Conversão de ids só na borda HTTP; `_id` nunca público.

**ARC-006** `architecture`  
`createApp` independente do adaptador de listen.

## OpenAPI

**API-001** `contract` `quality`  
OpenAPI 3.1: POST/GET `/api/v1/menu`, DELETE `/api/v1/menu/{id}`.

**API-002** `contract`  
`relatedId` number; `id` resposta string; param DELETE string; sem `_id`.

**API-003** `contract`  
Sucessos + erros com `code`, `message`, `requestId`; sem Idempotency-Key obrigatória.

**API-004** `contract` `quality`  
Exemplos válidos nos schemas; Content-Type só onde exigido.

**API-005** `contract` `http`  
GET reproduz menu de exemplo completo (ids string, folhas sem `submenus`).

## Qualidade

**QLT-001** `quality`  
CI: install, format, lint, tsc, unit/property, integration, coverage, OpenAPI, docker build.

**QLT-002** `quality`  
Cobertura global 100% (lines/branches/functions/statements); núcleo 100%.

**QLT-003** `benchmark`  
Benchmark montagem 1k / 10k / 100k fora da CI bloqueante.

**QLT-004** `quality` `operational`  
Audit de dependências no pipeline.

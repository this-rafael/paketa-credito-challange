# Experimento: Redlock (lock distribuído)

Branch: [`experiments/redlock`](https://github.com/this-rafael/paketa-credito-challange/tree/experiments/redlock)

Demonstra um lock distribuído com **Redis + Redlock** no cenário de corrida
entre `DELETE` do pai e `POST` de um filho (`relatedId` apontando para o pai).

Não altera o contrato HTTP/OpenAPI. O lock é opcional e controlado por env.

## O problema

A criação de filho faz `findById(parent)` e depois `create(child)` sem
atomicidade entre as duas etapas. Em paralelo, outro processo (ou outra
instância) pode apagar o pai no intervalo:

```text
Instância A: findById(pai) → OK
Instância B: deleteSubtree(pai) → remove pai
Instância A: create(filho com parentId=pai) → órfão
```

Com múltiplas instâncias (PM2 cluster), a corrida fica mais fácil de reproduzir.

## O que o experimento faz

| Peça                      | Papel                                      |
| ------------------------- | ------------------------------------------ |
| Porta `SubtreeLock`       | `withLock(nodeId, fn)`                     |
| `NoopSubtreeLock`         | Baseline sem coordenação (expõe a corrida) |
| `RedlockSubtreeLock`      | Adapter Redis/Redlock                      |
| `LockedCreateMenuItem`    | Lock no `relatedId` antes de criar filho   |
| `LockedDeleteMenuSubtree` | Lock no `id` antes de apagar a subárvore   |

Chave do lock: `menu:node:{id}`.

Escopo mínimo: serializa create-filho(pai=X) com delete(X). Locks em
ancestrais/descendentes para cobrir toda a subárvore ficam fora deste
experimento.

## Variáveis de ambiente

| Variável                  | Default | Descrição                                    |
| ------------------------- | ------- | -------------------------------------------- |
| `ENABLE_DISTRIBUTED_LOCK` | `false` | Liga Redlock                                 |
| `REDIS_URL`               | —       | Obrigatório quando o lock está ativo         |
| `LOCK_TTL_MS`             | `5000`  | TTL do lock                                  |
| `LOCK_RETRY_COUNT`        | `3`     | Tentativas de aquisição                      |
| `CREATE_RACE_DELAY_MS`    | `0`     | Só demo: alarga a janela pai-lookup → insert |

## Stack local

```bash
# Mongo + Redis + API (lock ligado)
docker compose -f docker-compose.redlock.yml up --build

# Ou infra + PM2 multi-instância
docker compose -f docker-compose.redlock.yml up -d mongodb redis
npm run build
pm2 start ecosystem.config.cjs
# Confirme que a API responde antes do load test:
curl -sS http://127.0.0.1:3000/api/v1/menu
npm run load:redlock
```

Comparar com lock desligado (perfil `baseline` do PM2):

```bash
# limpe a árvore entre execuções: um órfão remanescente deixa o GET em 500
docker compose -f docker-compose.redlock.yml exec -T mongodb \
  mongosh menu --quiet --eval 'db.menu_items.deleteMany({})'

pm2 delete menu-api
pm2 start ecosystem.config.cjs --env baseline
npm run load:redlock
```

Resultado observado com `ROUNDS=25` e `CREATE_RACE_DELAY_MS=80` (3 instâncias):

| Modo                   | orphans | wins_delete |
| ---------------------- | ------- | ----------- |
| `--env baseline` (sem) | 25      | 0           |
| padrão (Redlock)       | 0       | 25          |

Sem o lock, todo filho é gravado apontando para um pai já removido. Com o
Redlock, o delete e o create são serializados: o create encontra o pai ausente
e responde `404`.

> `ENABLE_DISTRIBUTED_LOCK=false pm2 reload ... --update-env` **não** funciona:
> o bloco `env` do `ecosystem.config.cjs` sobrepõe a variável do shell. Use o
> perfil `--env baseline`.

### Troubleshooting: `ECONNREFUSED 127.0.0.1:3000`

PM2 pode listar as 3 instâncias como `online` mesmo sem nada escutando na
porta. Causas observadas, em ordem:

1. **Guard de entrypoint** — em `exec_mode: cluster` o PM2 troca
   `process.argv[1]` pelo `ProcessContainer.js`, então o check "estou sendo
   executado direto?" em `src/main/server.ts` falhava e `startServer()` nunca
   rodava. Os logs ficavam vazios (0 B) e o processo seguia `online`. Resolvido
   usando `process.env.pm_exec_path` como entrypoint quando presente.
2. Mongo ou Redis fora do ar (`127.0.0.1:27017` / `:6379`)
3. `dist/main/server.js` ausente — rode `npm run build`

Diagnóstico:

```bash
pm2 logs menu-api --lines 80
ls -la ~/.pm2/logs/menu-api-out-0.log   # 0 B = processo subiu mas não bootou
ss -ltnp | grep 3000
curl -sS http://127.0.0.1:3000/api/v1/menu
docker compose -f docker-compose.redlock.yml ps
```

### Troubleshooting: todo round vira `orphan`

Um único órfão remanescente faz o `GET /api/v1/menu` responder `500` para
sempre, e o script conta isso como órfão em todas as rodadas. Limpe a
collection (`menu_items`, não `menuitems`) antes de cada execução. O load test
agora aborta com essa dica quando a árvore já está inconsistente no início.

## Teste CON-009

`tests/integration/redlock-parent-child.test.ts`:

1. **Baseline** (`NoopSubtreeLock` + delay pós-lookup): prova órfão.
2. **Redlock**: invariante — se o filho existe, o pai também; `GET /menu` ok.

```bash
npm test -- tests/integration/redlock-parent-child.test.ts
```

## Limitações

- Um único Redis (quorum Redlock clássico usa N≥3; suficiente para o demo).
- Granularidade só no nó alvo/pai direto.
- `redlock` npm está em beta v5; API `using()` com auto-extend.

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

| Variável                  | Default | Descrição                            |
| ------------------------- | ------- | ------------------------------------ |
| `ENABLE_DISTRIBUTED_LOCK` | `false` | Liga Redlock                         |
| `REDIS_URL`               | —       | Obrigatório quando o lock está ativo |
| `LOCK_TTL_MS`             | `5000`  | TTL do lock                          |
| `LOCK_RETRY_COUNT`        | `3`     | Tentativas de aquisição              |

## Stack local

```bash
# Mongo + Redis + API (lock ligado)
docker compose -f docker-compose.redlock.yml up --build

# Ou infra + PM2 multi-instância
docker compose -f docker-compose.redlock.yml up -d mongodb redis
npm run build
pm2 start ecosystem.config.cjs
npm run load:redlock
```

Comparar com lock desligado:

```bash
ENABLE_DISTRIBUTED_LOCK=false pm2 reload ecosystem.config.cjs --update-env
npm run load:redlock
# orphans / tree_errors > 0 esperados no baseline
```

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

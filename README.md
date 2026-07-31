<div align="center">

[![Menu API · Paketá](https://capsule-render.vercel.app/api?type=waving&color=0:0F4C81,50:0E7490,100:16A34A&height=230&section=header&text=Menu%20API%20%C2%B7%20Paket%C3%A1&fontSize=44&fontColor=FFFFFF&animation=fadeIn&fontAlignY=34&desc=Uma%20API%20hier%C3%A1rquica%20constru%C3%ADda%20para%20ser%20correta,%20observ%C3%A1vel%20e%20r%C3%A1pida&descAlignY=56&descSize=17)](https://github.com/this-rafael/paketa-credito-challange)

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=20&duration=2800&pause=900&color=0E7490&center=true&vCenter=true&width=820&lines=Clean+Architecture+%E2%80%A2+Express+5+%E2%80%A2+MongoDB;100%25+de+cobertura+%E2%80%A2+111+testes;OpenAPI+3.1+%E2%80%A2+TypeDoc+%E2%80%A2+Knowledge+Graph;%C3%81rvores+com+100.000+n%C3%B3s+em+tempo+linear)](https://git.io/typing-svg)

<p>
  <a href="https://github.com/this-rafael/paketa-credito-challange/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/this-rafael/paketa-credito-challange/ci.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=CI" alt="CI" />
  </a>
  <a href="https://this-rafael.github.io/paketa-credito-challange/">
    <img src="https://img.shields.io/badge/Docs-GitHub%20Pages-0E7490?style=for-the-badge&logo=githubpages&logoColor=white" alt="Documentation" />
  </a>
  <a href="vitest.config.ts">
    <img src="https://img.shields.io/badge/Cobertura-100%25-16A34A?style=for-the-badge&logo=vitest&logoColor=white" alt="100% de cobertura" />
  </a>
  <a href="openapi/openapi.yaml">
    <img src="https://img.shields.io/badge/OpenAPI-3.1-6BA539?style=for-the-badge&logo=openapiinitiative&logoColor=white" alt="OpenAPI 3.1" />
  </a>
</p>

<p>
  <a href="README.en.md">🇺🇸 English</a>
  &nbsp;•&nbsp;
  <a href="#-comece-em-60-segundos">Quick start</a>
  &nbsp;•&nbsp;
  <a href="#-api-em-um-minuto">API</a>
  &nbsp;•&nbsp;
  <a href="#-arquitetura">Arquitetura</a>
  &nbsp;•&nbsp;
  <a href="#-documentação-viva">Documentação</a>
</p>

<p>
  <a href="https://this-rafael.github.io/paketa-credito-challange/">
    <img
      src="docs-site/assets/docs-portal.png"
      alt="Portal de documentação interativa — OpenAPI, TypeDoc e Architecture Explorer"
      width="920"
    />
  </a>
</p>

<p>
  <a href="https://this-rafael.github.io/paketa-credito-challange/">
    <strong>📚 Veja a documentação interativa →</strong>
  </a>
  <br />
  <sub>OpenAPI · TypeDoc · Architecture Explorer — gerados a partir do repositório</sub>
</p>

</div>

## ✨ Sobre o projeto

Esta é uma API HTTP para gerenciar menus corporativos hierárquicos. Ela cria
itens raiz ou filhos, entrega a floresta completa já aninhada e remove uma
subárvore inteira de forma consistente.

O projeto nasceu como solução para o desafio técnico da Paketá e foi tratado
como um serviço de produção: regras de domínio isoladas, contratos explícitos,
persistência real, falhas observáveis, documentação navegável e qualidade
mensurável.

<div align="center">

|                     | O que foi construído                                                             |
| :-----------------: | :------------------------------------------------------------------------------- |
|  🌳 **Hierarquia**  | Floresta de menus de profundidade arbitrária, com ordenação determinística       |
|  ⚡ **Desempenho**  | Montagem da árvore em duas passagens — tempo e memória `O(n)`                    |
| 🧭 **Arquitetura**  | Domínio, aplicação, HTTP e infraestrutura com dependências apontando para dentro |
| 🛡️ **Resiliência**  | Validação fail-fast, erros tipados, request ID e graceful shutdown               |
|  🧪 **Confiança**   | 18 suites, 111 testes e 100% de cobertura nas quatro métricas                    |
| 📚 **Documentação** | OpenAPI 3.1, TypeDoc e grafo interativo do código                                |

</div>

<div align="center">
  <img width="100%" src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" alt="" />
</div>

## 🚀 Comece em 60 segundos

### Com Docker — caminho recomendado

```bash
git clone https://github.com/this-rafael/paketa-credito-challange.git
cd paketa-credito-challange
docker compose up --build
```

A API estará em `http://localhost:3000` e a documentação Swagger em
`http://localhost:3000/docs`.

### Com Node.js

Requisitos: Node.js 24 LTS e MongoDB 7 disponível localmente.

```bash
npm ci
npm run dev
```

O processo só abre a porta HTTP depois de conectar ao MongoDB e garantir os
índices necessários.

<div align="center">
  <img width="100%" src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" alt="" />
</div>

## ⚡ API em um minuto

| Método   | Rota                | Comportamento                              | Sucesso |
| :------- | :------------------ | :----------------------------------------- | :-----: |
| `POST`   | `/api/v1/menu`      | Cria um item raiz ou filho                 |  `201`  |
| `GET`    | `/api/v1/menu`      | Retorna toda a floresta hierárquica        |  `200`  |
| `DELETE` | `/api/v1/menu/{id}` | Remove o item e todos os seus descendentes |  `204`  |

### 1. Crie uma raiz

```bash
curl --request POST http://localhost:3000/api/v1/menu \
  --header 'Content-Type: application/json' \
  --data '{"name":"Eletrodomésticos"}'
```

```json
{ "id": "1" }
```

### 2. Adicione um submenu

```bash
curl --request POST http://localhost:3000/api/v1/menu \
  --header 'Content-Type: application/json' \
  --data '{"name":"Televisores","relatedId":1}'
```

### 3. Consulte a árvore

```bash
curl http://localhost:3000/api/v1/menu
```

```json
[
  {
    "id": "1",
    "name": "Eletrodomésticos",
    "submenus": [
      {
        "id": "2",
        "name": "Televisores"
      }
    ]
  }
]
```

<details>
<summary><strong>Como os erros são apresentados?</strong></summary>
<br />

Toda falha pública segue o mesmo contrato e carrega um `requestId` para
correlação com os logs:

```json
{
  "error": {
    "code": "PARENT_MENU_ITEM_NOT_FOUND",
    "message": "Parent menu item not found",
    "requestId": "c5fca0c4-d7c3-43c8-a624-2ab3ec8f0b67"
  }
}
```

O contrato cobre JSON inválido, validação, ID inseguro, pai ou item ausente,
nome duplicado, payload excessivo, mídia não suportada, indisponibilidade do
banco e falhas internas.

</details>

> [!TIP]
> Explore schemas, exemplos e todas as respostas na
> [referência OpenAPI](https://this-rafael.github.io/paketa-credito-challange/openapi/)
> ou no [Swagger local](http://localhost:3000/docs).

<div align="center">
  <img width="100%" src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" alt="" />
</div>

## 🏗️ Arquitetura

O desenho mantém as regras de negócio independentes de Express, Mongoose e
detalhes operacionais. As implementações externas satisfazem portas definidas
pela aplicação.

```mermaid
flowchart LR
    Client([Cliente HTTP])

    subgraph HTTP["HTTP / API"]
      MW[Middlewares]
      Routes[Rotas + Zod]
      Controller[MenuController]
    end

    subgraph App["Aplicação"]
      Create[CreateMenuItem]
      Get[GetMenuTree]
      Delete[DeleteMenuSubtree]
      Ports{{Ports}}
    end

    subgraph Domain["Domínio"]
      Entity[MenuItem]
      Errors[Erros tipados]
    end

    subgraph Infra["Infraestrutura"]
      Repository[MongooseMenuRepository]
      Ids[MongoIdGenerator]
      Mongo[(MongoDB)]
    end

    Client --> MW --> Routes --> Controller
    Controller --> Create
    Controller --> Get
    Controller --> Delete
    Create --> Entity
    Create --> Ports
    Get --> Ports
    Get --> Tree[buildMenuTree O&#40;n&#41;]
    Delete --> Ports
    Entity --> Errors
    Repository -. implementa .-> Ports
    Ids -. implementa .-> Ports
    Repository --> Mongo
    Ids --> Mongo
```

### Fluxos principais

<details>
<summary><strong>Criação de item</strong></summary>
<br />

1. Zod valida `name` e o `relatedId` opcional.
2. O caso de uso busca o pai quando necessário.
3. O domínio normaliza o nome e impede IDs inválidos ou ciclos.
4. Um contador MongoDB gera o ID sequencial de forma atômica.
5. O repositório persiste e converte conflitos de índice em erro de domínio.

</details>

<details>
<summary><strong>Leitura da árvore</strong></summary>
<br />

Os itens chegam ordenados como uma lista plana. `buildMenuTree` primeiro cria
um índice `Map` por ID e depois conecta cada nó ao pai. A estratégia evita
buscas aninhadas, preserva a ordem e detecta órfãos como falha de integridade.

</details>

<details>
<summary><strong>Exclusão de subárvore</strong></summary>
<br />

Cada documento mantém sua cadeia de ancestrais. Assim, o repositório remove a
raiz selecionada e todos os documentos que a referenciam em `ancestors`, sem
percorrer recursivamente a árvore pela aplicação.

</details>

### Mapa do código

```text
src/
├── domain/          # entidades, invariantes e erros de negócio
├── application/     # casos de uso e portas
├── http/            # controllers, rotas, schemas e middlewares
├── infrastructure/  # MongoDB, Mongoose, configuração e logging
├── main/            # composição e ciclo de vida do processo
└── shared/          # construção linear da árvore
```

> [!NOTE]
> O grafo completo contém 136 nós, 338 relações, 10 camadas e um tour guiado
> em 12 etapas. Abra o
> [Architecture Explorer](https://this-rafael.github.io/paketa-credito-challange/architecture/)
> para navegar pelas dependências.

<div align="center">
  <img width="100%" src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" alt="" />
</div>

## 🧰 Stack

<div align="center">

### Runtime e API

![Node.js](https://img.shields.io/badge/Node.js_24-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?style=for-the-badge&logo=express&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)

### Dados e operação

![MongoDB](https://img.shields.io/badge/MongoDB_7-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose_9-880000?style=for-the-badge&logo=mongoose&logoColor=white)
![Pino](https://img.shields.io/badge/Pino-687634?style=for-the-badge&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

### Qualidade e documentação

![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![OpenAPI](https://img.shields.io/badge/OpenAPI_3.1-6BA539?style=for-the-badge&logo=openapiinitiative&logoColor=white)
![TypeDoc](https://img.shields.io/badge/TypeDoc-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)

</div>

## 🔧 Configuração

| Variável          | Descrição                    | Padrão                           |
| :---------------- | :--------------------------- | :------------------------------- |
| `PORT`            | Porta HTTP                   | `3000`                           |
| `MONGODB_URI`     | String de conexão do MongoDB | `mongodb://127.0.0.1:27017/menu` |
| `LOG_LEVEL`       | Nível de log do Pino         | `info`                           |
| `JSON_BODY_LIMIT` | Limite máximo do corpo JSON  | `100kb`                          |

Valores inválidos interrompem o startup antes da abertura da porta HTTP.

## 📚 Documentação viva

<div align="center">

|           Fonte            | Para que serve                                   | Acesso                                                                                                   |
| :------------------------: | :----------------------------------------------- | :------------------------------------------------------------------------------------------------------- |
|     📜 **OpenAPI 3.1**     | Contrato HTTP, schemas, respostas e exemplos     | [Portal](https://this-rafael.github.io/paketa-credito-challange/openapi/) · [YAML](openapi/openapi.yaml) |
|       🔎 **TypeDoc**       | Tipos, funções, classes, ports e casos de uso    | [Referência](https://this-rafael.github.io/paketa-credito-challange/reference/)                          |
| 🕸️ **Understand Anything** | Camadas, dependências, relações e tour do código | [Grafo interativo](https://this-rafael.github.io/paketa-credito-challange/architecture/)                 |

</div>

```bash
npm run docs        # referência TypeDoc HTML em docs/
npm run docs:md     # referência TypeDoc Markdown em docs-md/
npm run docs:all    # ambos os formatos
npm run docs:check  # falha para warnings ou links TSDoc inválidos
npm run docs:site   # monta o portal completo em _site/
```

O código usa TSDoc validado pelo ESLint. Consulte
[`TSDOC_STYLE.md`](TSDOC_STYLE.md) para as convenções.

## 🧪 Qualidade comprovada

```text
Test Files   18 passed (18)
Tests        111 passed (111)
Statements   100% (259/259)
Branches     100% (168/168)
Functions    100% (52/52)
Lines        100% (258/258)
```

As suites cobrem domínio, casos de uso, árvore, schemas, middlewares, contrato
OpenAPI, arquitetura, ciclo de vida, concorrência e persistência real com
MongoDB via Testcontainers.

```bash
npm test                 # testes
npm run coverage         # testes + cobertura
npm run typecheck        # TypeScript sem emissão
npm run lint             # ESLint + TSDoc
npm run format:check     # Prettier
npm run openapi:lint     # Spectral
npm run audit            # dependências de produção
npm run benchmark        # 1k, 10k e 100k nós
```

<details>
<summary><strong>Resultado local do benchmark de 100 mil nós</strong></summary>
<br />

Em Node.js `v24.18.0`, a construção de uma cadeia de 100 mil nós levou
aproximadamente `55 ms` nesta máquina. O número é uma referência local, não um
SLA; o atributo garantido pelo algoritmo é sua complexidade linear.

</details>

O workflow principal executa formatação, lint, typecheck, testes, TypeDoc,
Spectral e auditoria a cada pull request. O portal possui um workflow separado
e só é publicado a partir da `main`.

<div align="center">
  <img width="100%" src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" alt="" />
</div>

## 👨‍💻 Autor

<div align="center">

### Rafael Pereira

Engenheiro de Software Sênior · Full Stack & Solutions Architect

[![GitHub](https://img.shields.io/badge/GitHub-this--rafael-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/this-rafael)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Rafael%20Pereira-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/this-rafael-pereira/)

Construído como solução independente para o desafio técnico da
[Paketá Crédito](https://github.com/paketacredito/entrevista-tecnica).

[![Footer](https://capsule-render.vercel.app/api?type=waving&color=0:0F4C81,50:0E7490,100:16A34A&height=120&section=footer)](https://github.com/this-rafael)

</div>

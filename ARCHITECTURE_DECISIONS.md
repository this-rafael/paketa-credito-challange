# Decisões arquiteturais

Embora o desafio possua apenas três endpoints, a implementação foi estruturada para demonstrar como uma API pequena pode permanecer testável, previsível e evolutiva sem acoplar regras de negócio ao framework HTTP ou ao banco de dados.

A intenção não foi reproduzir toda a complexidade de um sistema corporativo, mas aplicar fronteiras arquiteturais apenas nos pontos em que elas resolvem problemas concretos.

## Separação entre domínio, aplicação e infraestrutura

As regras relacionadas ao menu não dependem diretamente de Express, Mongoose ou MongoDB.

Essa separação permite:

* testar os casos de uso sem iniciar servidor ou banco;
* substituir detalhes de persistência sem alterar regras de negócio;
* impedir que particularidades do framework contaminem a aplicação;
* manter controllers responsáveis apenas pelo protocolo HTTP.

O fluxo principal é:

```text
HTTP → Controller → Use Case → Repository Port → MongoDB Adapter
```

## Casos de uso explícitos

Cada operação da API é representada por um caso de uso específico:

* criação de item;
* exclusão de item;
* consulta da árvore completa.

Essa divisão evita services genéricos com múltiplas responsabilidades e torna as regras de cada operação mais fáceis de localizar, testar e modificar.

## Repository como porta

Os casos de uso dependem de um contrato de repositório, e não diretamente do Mongoose.

Essa decisão permite executar testes unitários com implementações em memória e mantém detalhes como schemas, queries e operadores MongoDB restritos à camada de infraestrutura.

A abstração não foi criada para prever vários bancos de dados, mas para impedir que a lógica da aplicação dependa da tecnologia de persistência.

## Identificador público separado do ObjectId

O MongoDB utiliza `ObjectId` internamente, mas o contrato do desafio trabalha com identificadores numéricos e com o campo `relatedId`.

Por isso, a aplicação mantém um identificador público numérico separado do identificador interno do MongoDB.

Essa decisão:

* preserva o contrato externo;
* evita expor detalhes do banco;
* mantém referências entre itens consistentes;
* permite alterar a persistência sem modificar a API.

## Geração atômica de identificadores

A geração dos identificadores utiliza uma operação atômica no MongoDB.

Calcular o próximo identificador com base no maior valor existente poderia gerar colisões quando duas requisições fossem processadas simultaneamente.

O contador atômico garante que cada criação receba um identificador único mesmo sob concorrência.

## Representação hierárquica por lista de adjacência

Cada item armazena apenas a referência para seu item pai.

Essa representação foi escolhida porque:

* simplifica a criação de itens;
* permite profundidade arbitrária;
* evita duplicar toda a árvore em cada documento;
* mantém alterações locais e previsíveis;
* representa diretamente o campo `relatedId` definido pelo desafio.

## Construção da árvore em memória

A consulta busca os itens em uma única operação e monta a árvore utilizando mapas indexados por identificador.

Esse processo possui complexidade O(n), evitando:

* uma consulta ao banco para cada nível;
* recursão de acesso à persistência;
* comportamento N+1;
* pipelines de agregação excessivamente acoplados ao MongoDB.

A montagem da árvore permanece uma função de domínio pura, permitindo testes independentes da infraestrutura.

## Exclusão de subárvore

Ao excluir um item, seus descendentes também precisam ser removidos para evitar registros órfãos.

A modelagem mantém informações suficientes para identificar a subárvore sem depender de múltiplas consultas recursivas na aplicação.

Essa decisão preserva a integridade hierárquica e torna explícita a semântica da exclusão.

## Erros tipados

Erros de domínio e aplicação são representados por tipos próprios, como:

* item pai inexistente;
* item não encontrado;
* nome duplicado;
* inconsistência hierárquica.

O controller não interpreta códigos internos do MongoDB nem conhece detalhes como erros de índice duplicado. A infraestrutura converte falhas técnicas para erros compreendidos pela aplicação, e a camada HTTP converte esses erros para status adequados.

## Validação na borda

Dados recebidos pela API são validados antes de alcançar os casos de uso.

A validação HTTP garante formato e tipos básicos. Os casos de uso continuam responsáveis pelas regras de negócio, como existência do item pai e unicidade do nome.

Essa separação evita misturar validação de transporte com validação de domínio.

## Composição explícita de dependências

As dependências são instanciadas na camada principal da aplicação.

Controllers e casos de uso não criam diretamente repositories, models ou conexões. Isso torna o grafo de dependências visível e evita service locators ou dependências ocultas.

## Estratégia de testes

A quantidade de testes não está relacionada à quantidade de endpoints, mas aos comportamentos e riscos existentes.

A suíte foi dividida por objetivo:

* testes unitários para regras de domínio e casos de uso;
* testes de integração para adapters MongoDB;
* testes HTTP para validação do contrato da API;
* testes de concorrência para geração de identificadores;
* testes de arquitetura para preservar as fronteiras entre camadas;
* testes de documentação para manter o OpenAPI compatível com a implementação.

Cada nível de teste protege uma responsabilidade diferente. O objetivo não é testar a mesma implementação várias vezes, mas detectar falhas no nível mais próximo de sua origem.

## Quality gates

Lint, type checking, testes e validação da documentação são executados automaticamente.

Essas verificações impedem que alterações aparentemente pequenas introduzam:

* erros de tipagem;
* violações das fronteiras arquiteturais;
* divergências entre código e OpenAPI;
* regressões no contrato HTTP;
* falhas de integração com MongoDB.

## Trade-offs

Essa arquitetura possui mais arquivos e conceitos do que uma implementação baseada apenas em routes, controllers e models.

O custo aceito é uma estrutura inicial maior. Em contrapartida, a solução oferece:

* regras isoladas de frameworks;
* testes mais rápidos e específicos;
* dependências explícitas;
* menor acoplamento ao MongoDB;
* tratamento previsível de erros;
* maior segurança para evolução.

Para uma API descartável, essa estrutura provavelmente seria desnecessária. Para este desafio, ela foi adotada deliberadamente para demonstrar organização de código, concorrência, testabilidade, integridade de dados e capacidade de evolução.

## O que não foi abstraído

A arquitetura não busca abstrair todos os detalhes ou antecipar requisitos inexistentes.

Não foram criadas generalizações para múltiplos bancos, múltiplos protocolos ou funcionalidades que não fazem parte do desafio.

As abstrações existentes correspondem a fronteiras reais:

* entrada HTTP;
* execução dos casos de uso;
* persistência;
* geração de identificadores;
* montagem da hierarquia.

O objetivo é manter complexidade estrutural justificável, e não maximizar a quantidade de padrões utilizados.

# TSDoc style guide

Convenções para a documentação do Menu API, processada pelo TypeDoc.

## Regras gerais

- Todo arquivo `.ts` de `src/` inicia com um comentário de módulo:

  ```ts
  /**
   * @packageDocumentation
   *
   * <Resumo de uma linha da responsabilidade do arquivo e da camada a que pertence.>
   */
  ```

- Todo símbolo exportado tem um resumo em frase imperativa ("Creates…", "Returns…").
- Documentar todos os parâmetros (`@param`), retorno (`@returns`) e erros lançados
  (`@throws`) quando aplicável.
- Usar `@remarks` para contexto extra (invariantes, efeitos colaterais) e `@example`
  quando houver uso não óbvio.
- Membros privados/protegidos relevantes também são documentados (o output do TypeDoc
  inclui privados por decisão do projeto).
- Fazer cross-reference com `{@link Symbol}` (ex.: controller → use-case → repository).
- Schemas Zod: documentar as regras de validação e o tipo inferido.
- Classes de erro: documentar o significado, quando são lançadas e o valor de `code`.

## Tags aceitas

`@packageDocumentation`, `@param`, `@returns`, `@throws`, `@remarks`, `@example`,
`@internal`, `@deprecated`, `{@link}`.

A sintaxe TSDoc é validada no lint (`eslint-plugin-tsdoc`, regra `tsdoc/syntax`).
O build da documentação (`npm run docs:check`) trata warnings como erros.

## Geração

```bash
npm run docs      # HTML em docs/ (gitignored)
npm run docs:md   # Markdown em docs-md/ (gitignored)
npm run docs:all  # ambos
npm run docs:check # valida e trata warnings como erros
```

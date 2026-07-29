# Publicação no Cloudflare Workers + D1

Esta versão está com `FEEDBACK_USE_API = true`. O mesmo Worker entrega os arquivos do site e atende as rotas `/api/*`.

## Banco novo

1. Crie um banco D1.
2. Vincule o banco ao Worker usando o nome de binding **DB**.
3. Execute `api/schema.sql` uma única vez no banco.

## Banco antigo do ASFreedback

Se o banco antigo ainda não possui o campo `cidade` e a tabela `feedbacks_medicos`, execute `api/migration-multicidade-feedback-medico.sql` uma única vez. Não execute essa migration se ela já foi aplicada.

## Publicação pelo terminal

```bash
npm install
npx wrangler login
npx wrangler deploy
```

No painel do Worker, confirme que o D1 está vinculado como **DB**.

## Teste rápido

Após publicar, abra `/api/health`. A resposta deve mostrar `"ok": true` e `"d1": true`.

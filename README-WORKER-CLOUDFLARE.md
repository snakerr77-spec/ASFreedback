# AmorSaudeFreedBack - Worker + D1 + Login pelo Cloudflare

Este pacote foi ajustado para o fluxo da Cloudflare com:

- Worker real em `src/index.js`
- arquivos estáticos em `site/`
- banco D1 com binding `DB`
- feedbacks salvos no D1
- login consultando usuários no D1 pela rota `/api/login`

## Configuração no deploy

Na tela de deploy da Cloudflare, use:

- Build command: `exit 0`
- Deploy command: `npx wrangler deploy`
- Root/path: `/`

## Banco D1

Crie um banco D1 chamado:

```txt
feedback_amorsaude
```

Depois abra o console SQL do D1 e rode o arquivo:

```txt
api/schema.sql
```

Esse SQL cria:

- tabela `feedbacks`
- tabela `users`
- tabela `sessions`
- acessos do painel

## Vinculação do D1

No Worker `amor-saudefreedback`, vá em:

```txt
Configurações > Bindings/Vinculações > Adicionar vinculação
```

Escolha:

```txt
Tipo: D1 database
Nome da variável: DB
Banco: feedback_amorsaude
```

Não coloque `DB` em Variáveis e Segredos. `DB` é binding/vinculação.

## Acessos criados

```txt
Login: @Admin1
Senha: 15820202
```

```txt
Login: @LucasOliveira
Senha: AScerquilho@2026
```

```txt
Login: @Roberson
Senha: AScerquilho@2026
```

As senhas não ficam mais no JavaScript público do site. O `login.js` chama `/api/login`, e o Worker consulta a tabela `users` no D1.

## Testes

Depois do deploy e da vinculação D1, teste:

```txt
/api/health
```

O certo é responder com:

```json
{
  "ok": true,
  "service": "feedback-amorsaude",
  "d1": true,
  "auth": true
}
```

Depois teste:

- Login: `/`
- Formulário: `/public/fredback.html`
- Painel: `/admin/pages/controle.html`

## Observação

Se alterar usuários ou senhas no `api/schema.sql`, rode o SQL de novo no console do D1.


## ATUALIZAÇÃO FINAL INCLUÍDA

Esta versão já está preparada para Cloudflare Workers + Static Assets + D1, com:

- formulário salvando feedbacks no D1;
- login consultando usuários no D1 pela rota `/api/login`;
- painel protegido por sessão;
- Médico em formato `Sim / Não`;
- Laboratório separado de Call Center;
- exportação CSV com Laboratório;
- API `/api/health` para teste.

### Se o banco já existia antes do campo Laboratório

Rode no D1 o arquivo:

```txt
api/migration-add-laboratorio.sql
```

Se você estiver criando o banco do zero, rode apenas:

```txt
api/schema.sql
```

### Configuração no Cloudflare

Build command:

```txt
exit 0
```

Deploy command:

```txt
npx wrangler deploy
```

Path:

```txt
/
```

O binding D1 deve ser:

```txt
Nome da variável: DB
Banco: feedback_amorsaude
```

Teste final:

```txt
/api/health
```

O esperado é:

```json
{"ok":true,"service":"feedback-amorsaude","d1":true,"auth":true}
```

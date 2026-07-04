# AmorSaudeFreedBack - Worker + D1

Este pacote foi ajustado para o fluxo que aparece no painel novo da Cloudflare com `npx wrangler deploy`.

## Configuração no deploy

- Build command: `exit 0`
- Deploy command: `npx wrangler deploy`
- Root/path: `/`

## Depois do primeiro deploy

1. Crie o banco D1 chamado `feedback_amorsaude`.
2. Rode o SQL em `api/schema.sql` no console do D1.
3. Volte no Worker `amor-saudefreedback`.
4. Vá em Configurações > Bindings/Vinculações.
5. Adicione uma vinculação do tipo D1 database:
   - Variable name: `DB`
   - Database: `feedback_amorsaude`
6. Redeploy o projeto.
7. Teste `/api/health`.

## Testes

- Formulário: `/public/fredback.html`
- Painel: `/admin/pages/controle.html`
- API: `/api/health`

Login atual:
- Usuário: `1admin`
- Senha: `1582`

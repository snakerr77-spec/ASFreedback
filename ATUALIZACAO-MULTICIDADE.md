# ASFreedback — Cloudflare Workers + D1

Esta versão preserva o visual atual e usa Cloudflare para:

- validar o login administrativo no D1;
- salvar feedbacks dos pacientes no D1;
- salvar feedbacks dos médicos no D1;
- separar os registros por Cerquilho, Tatuí, Itapeva e Embu das Artes;
- carregar, filtrar, excluir e exportar resultados pelo painel;
- manter o login somente na entrada do sistema durante a sessão válida.

## Banco novo

Execute `api/schema.sql`.

## Banco antigo

Execute `api/migration-multicidade-feedback-medico.sql` somente se o banco ainda não possuir a coluna `cidade` e a tabela `feedbacks_medicos`.

Consulte `CLOUDFLARE-SETUP.md` para o passo a passo.

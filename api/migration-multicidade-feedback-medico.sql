-- ATUALIZAÇÃO MULTICIDADE + FEEDBACK MÉDICO
-- Execute este arquivo uma única vez no banco D1 que já está em uso.
-- Os feedbacks antigos permanecem salvos e serão associados a Cerquilho.

ALTER TABLE feedbacks ADD COLUMN cidade TEXT NOT NULL DEFAULT 'cerquilho';
UPDATE feedbacks SET cidade = 'cerquilho' WHERE cidade IS NULL OR TRIM(cidade) = '';
CREATE INDEX IF NOT EXISTS idx_feedbacks_cidade ON feedbacks(cidade, created_at DESC);

CREATE TABLE IF NOT EXISTS feedbacks_medicos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  cidade TEXT NOT NULL DEFAULT 'cerquilho',
  doctor_name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  organizacao_nota INTEGER CHECK (organizacao_nota IS NULL OR organizacao_nota BETWEEN 1 AND 5),
  organizacao_comentario TEXT,
  recepcao_nota INTEGER CHECK (recepcao_nota IS NULL OR recepcao_nota BETWEEN 1 AND 5),
  recepcao_comentario TEXT,
  enfermagem_nota INTEGER CHECK (enfermagem_nota IS NULL OR enfermagem_nota BETWEEN 1 AND 5),
  enfermagem_comentario TEXT,
  materiais_nota INTEGER CHECK (materiais_nota IS NULL OR materiais_nota BETWEEN 1 AND 5),
  materiais_comentario TEXT,
  limpeza_nota INTEGER CHECK (limpeza_nota IS NULL OR limpeza_nota BETWEEN 1 AND 5),
  limpeza_comentario TEXT,
  estrutura_nota INTEGER CHECK (estrutura_nota IS NULL OR estrutura_nota BETWEEN 1 AND 5),
  estrutura_comentario TEXT,
  gestao_nota INTEGER CHECK (gestao_nota IS NULL OR gestao_nota BETWEEN 1 AND 5),
  gestao_comentario TEXT,
  fluxo_nota INTEGER CHECK (fluxo_nota IS NULL OR fluxo_nota BETWEEN 1 AND 5),
  fluxo_comentario TEXT,
  valorizacao_nota INTEGER CHECK (valorizacao_nota IS NULL OR valorizacao_nota BETWEEN 1 AND 5),
  valorizacao_comentario TEXT,
  prioridade_melhoria TEXT,
  sugestoes TEXT
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_medicos_cidade ON feedbacks_medicos(cidade, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_medicos_nome ON feedbacks_medicos(doctor_name);

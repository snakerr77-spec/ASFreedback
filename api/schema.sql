CREATE TABLE IF NOT EXISTS feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  patient_name TEXT,
  patient_phone TEXT,
  medico_nome TEXT,

  whatsapp_nota INTEGER CHECK (whatsapp_nota IS NULL OR whatsapp_nota BETWEEN 1 AND 5),
  whatsapp_comentario TEXT,

  agendamento_nota INTEGER CHECK (agendamento_nota IS NULL OR agendamento_nota BETWEEN 1 AND 5),
  agendamento_comentario TEXT,

  recepcao_nota INTEGER CHECK (recepcao_nota IS NULL OR recepcao_nota BETWEEN 1 AND 5),
  recepcao_comentario TEXT,

  tempo_espera_nota INTEGER CHECK (tempo_espera_nota IS NULL OR tempo_espera_nota BETWEEN 1 AND 5),
  tempo_espera_comentario TEXT,

  pos_consulta_nota INTEGER CHECK (pos_consulta_nota IS NULL OR pos_consulta_nota BETWEEN 1 AND 5),
  pos_consulta_comentario TEXT,

  enfermagem_nota INTEGER CHECK (enfermagem_nota IS NULL OR enfermagem_nota BETWEEN 1 AND 5),
  enfermagem_comentario TEXT,

  odontologia_nota INTEGER CHECK (odontologia_nota IS NULL OR odontologia_nota BETWEEN 1 AND 5),
  odontologia_comentario TEXT,

  medico_nota INTEGER CHECK (medico_nota IS NULL OR medico_nota BETWEEN 1 AND 5),
  medico_comentario TEXT,

  limpeza_nota INTEGER CHECK (limpeza_nota IS NULL OR limpeza_nota BETWEEN 1 AND 5),
  limpeza_comentario TEXT,

  organizacao_nota INTEGER CHECK (organizacao_nota IS NULL OR organizacao_nota BETWEEN 1 AND 5),
  organizacao_comentario TEXT,

  estrutura_nota INTEGER CHECK (estrutura_nota IS NULL OR estrutura_nota BETWEEN 1 AND 5),
  estrutura_comentario TEXT,

  recomendacao_nota INTEGER CHECK (recomendacao_nota IS NULL OR recomendacao_nota BETWEEN 1 AND 5),
  comentario_geral TEXT
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_medico_nome ON feedbacks(medico_nome);
CREATE INDEX IF NOT EXISTS idx_feedbacks_recepcao_nota ON feedbacks(recepcao_nota);
CREATE INDEX IF NOT EXISTS idx_feedbacks_medico_nota ON feedbacks(medico_nota);

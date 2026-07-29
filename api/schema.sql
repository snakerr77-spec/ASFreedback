CREATE TABLE IF NOT EXISTS feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  cidade TEXT NOT NULL DEFAULT 'cerquilho',
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

  laboratorio_nota INTEGER CHECK (laboratorio_nota IS NULL OR laboratorio_nota BETWEEN 1 AND 5),
  laboratorio_comentario TEXT,

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
CREATE INDEX IF NOT EXISTS idx_feedbacks_cidade ON feedbacks(cidade, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_medico_nome ON feedbacks(medico_nome);
CREATE INDEX IF NOT EXISTS idx_feedbacks_recepcao_nota ON feedbacks(recepcao_nota);
CREATE INDEX IF NOT EXISTS idx_feedbacks_medico_nota ON feedbacks(medico_nota);
CREATE INDEX IF NOT EXISTS idx_feedbacks_laboratorio_nota ON feedbacks(laboratorio_nota);

-- Feedback interno enviado pelos médicos.
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

-- Usuários do painel administrativo.
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  username_lower TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'colaborador',
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users(username_lower);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

DELETE FROM users WHERE username_lower IN ('1admin', 'colaborador1');

INSERT INTO users (username, username_lower, name, role, password_salt, password_hash, active)
VALUES ('@Admin1', '@admin1', 'Administrador', 'admin', 'cf85527275e2753e4797112a91c5eb9e', 'cb207932015ca1e2c2dadd873baaca25232617ea8cc511f2550c7b0ab876ab21', 1)
ON CONFLICT(username_lower) DO UPDATE SET username=excluded.username,name=excluded.name,role=excluded.role,password_salt=excluded.password_salt,password_hash=excluded.password_hash,active=excluded.active;

INSERT INTO users (username, username_lower, name, role, password_salt, password_hash, active)
VALUES ('@LucasOliveira', '@lucasoliveira', 'Lucas Oliveira', 'admin', 'a25ca7fff362992ac6192de0932d9030', 'f1254ecd3584e4141b2bc82b6d5ede4b61cd249f0d7e6ecb574ebdff87f3cebb', 1)
ON CONFLICT(username_lower) DO UPDATE SET username=excluded.username,name=excluded.name,role=excluded.role,password_salt=excluded.password_salt,password_hash=excluded.password_hash,active=excluded.active;

INSERT INTO users (username, username_lower, name, role, password_salt, password_hash, active)
VALUES ('@Roberson', '@roberson', 'Roberson', 'admin', '44d978581bb00533e40cf52516f19761', 'd9caea6abdacdb43dc19e7096cc09e3c2fac9ede103b39818ab0e4327f635be0', 1)
ON CONFLICT(username_lower) DO UPDATE SET username=excluded.username,name=excluded.name,role=excluded.role,password_salt=excluded.password_salt,password_hash=excluded.password_hash,active=excluded.active;

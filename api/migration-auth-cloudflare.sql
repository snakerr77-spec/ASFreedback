-- Execute em um banco antigo que ainda não possui login administrativo.
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

INSERT INTO users (username, username_lower, name, role, password_salt, password_hash, active)
VALUES ('@Admin1', '@admin1', 'Administrador', 'admin', 'cf85527275e2753e4797112a91c5eb9e', 'cb207932015ca1e2c2dadd873baaca25232617ea8cc511f2550c7b0ab876ab21', 1)
ON CONFLICT(username_lower) DO UPDATE SET username=excluded.username,name=excluded.name,role=excluded.role,password_salt=excluded.password_salt,password_hash=excluded.password_hash,active=excluded.active;

INSERT INTO users (username, username_lower, name, role, password_salt, password_hash, active)
VALUES ('@LucasOliveira', '@lucasoliveira', 'Lucas Oliveira', 'admin', 'a25ca7fff362992ac6192de0932d9030', 'f1254ecd3584e4141b2bc82b6d5ede4b61cd249f0d7e6ecb574ebdff87f3cebb', 1)
ON CONFLICT(username_lower) DO UPDATE SET username=excluded.username,name=excluded.name,role=excluded.role,password_salt=excluded.password_salt,password_hash=excluded.password_hash,active=excluded.active;

INSERT INTO users (username, username_lower, name, role, password_salt, password_hash, active)
VALUES ('@Roberson', '@roberson', 'Roberson', 'admin', '44d978581bb00533e40cf52516f19761', 'd9caea6abdacdb43dc19e7096cc09e3c2fac9ede103b39818ab0e4327f635be0', 1)
ON CONFLICT(username_lower) DO UPDATE SET username=excluded.username,name=excluded.name,role=excluded.role,password_salt=excluded.password_salt,password_hash=excluded.password_hash,active=excluded.active;

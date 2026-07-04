const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const MAX_LENGTHS = {
  patientName: 90,
  patientPhone: 20,
  medicoNome: 90,
  whatsappComentario: 500,
  agendamentoComentario: 500,
  recepcaoComentario: 500,
  tempoEsperaComentario: 500,
  posConsultaComentario: 500,
  enfermagemComentario: 500,
  laboratorioComentario: 500,
  odontologiaComentario: 500,
  medicoComentario: 500,
  limpezaComentario: 500,
  organizacaoComentario: 500,
  estruturaComentario: 500,
  comentarioGeral: 900
};

const RATING_FIELDS = [
  'whatsappNota',
  'agendamentoNota',
  'recepcaoNota',
  'tempoEsperaNota',
  'posConsultaNota',
  'enfermagemNota',
  'laboratorioNota',
  'odontologiaNota',
  'medicoNota',
  'limpezaNota',
  'organizacaoNota',
  'estruturaNota',
  'recomendacaoNota'
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS
    }
  });
}

function clean(value, limit = 500) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

function rating(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 5) return null;
  return number;
}

function hasAnyRating(payload) {
  return RATING_FIELDS.some((field) => Number.isInteger(payload[field]));
}

function getBearerToken(request) {
  const auth = request.headers.get('Authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return '';
}


function requireDb(env) {
  if (!env.DB) throw new Error('Binding D1 "DB" não configurado no Worker da Cloudflare.');
}


async function digestHex(text) {
  const bytes = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hashBuffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPassword(password, salt) {
  return digestHex(`${salt}:${password}`);
}

function randomToken(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function sessionExpiry() {
  const hours = 12;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

async function login(request, env) {
  requireDb(env);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido.' }, 400);
  }

  const username = clean(body.usuario || body.username || body.login || '', 80);
  const password = String(body.senha || body.password || '');

  if (!username || !password) {
    return json({ error: 'Preencha usuário e senha.' }, 400);
  }

  const usernameLower = username.toLowerCase();

  const user = await env.DB.prepare(`
    SELECT id, username, username_lower, name, role, password_salt, password_hash, active
    FROM users
    WHERE username_lower = ?
    LIMIT 1
  `).bind(usernameLower).first();

  if (!user || Number(user.active) !== 1) {
    return json({ error: 'Usuário ou senha incorretos.' }, 401);
  }

  const sentHash = await hashPassword(password, user.password_salt);
  if (sentHash !== user.password_hash) {
    return json({ error: 'Usuário ou senha incorretos.' }, 401);
  }

  const token = randomToken(32);
  const expiresAt = sessionExpiry();

  await env.DB.prepare(`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (?, ?, ?)
  `).bind(token, user.id, expiresAt).run();

  return json({
    ok: true,
    token,
    expiresAt,
    user: {
      username: user.username,
      role: user.role,
      name: user.name
    }
  });
}

async function getSession(request, env) {
  requireDb(env);

  const token = getBearerToken(request);
  if (!token) return null;

  const now = new Date().toISOString();

  const session = await env.DB.prepare(`
    SELECT
      sessions.token,
      sessions.expires_at,
      users.id AS user_id,
      users.username,
      users.name,
      users.role,
      users.active
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ?
      AND sessions.expires_at > ?
      AND users.active = 1
    LIMIT 1
  `).bind(token, now).first();

  return session || null;
}

async function requireAdmin(request, env) {
  const session = await getSession(request, env);

  if (!session || session.role !== 'admin') {
    return {
      response: json({ error: 'Acesso negado. Faça login novamente.' }, 401),
      session: null
    };
  }

  return { response: null, session };
}

async function me(request, env) {
  const session = await getSession(request, env);

  if (!session) {
    return json({ error: 'Sessão inválida ou expirada.' }, 401);
  }

  return json({
    ok: true,
    user: {
      username: session.username,
      role: session.role,
      name: session.name
    },
    expiresAt: session.expires_at
  });
}

async function logout(request, env) {
  requireDb(env);

  const token = getBearerToken(request);
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  }

  return json({ ok: true });
}

async function createFeedback(request, env) {
  requireDb(env);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido.' }, 400);
  }

  const payload = {
    patientName: clean(body.patientName, MAX_LENGTHS.patientName),
    patientPhone: clean(body.patientPhone, MAX_LENGTHS.patientPhone),
    medicoNome: clean(body.medicoNome, MAX_LENGTHS.medicoNome),

    whatsappNota: rating(body.whatsappNota),
    whatsappComentario: clean(body.whatsappComentario, MAX_LENGTHS.whatsappComentario),

    agendamentoNota: rating(body.agendamentoNota),
    agendamentoComentario: clean(body.agendamentoComentario, MAX_LENGTHS.agendamentoComentario),

    recepcaoNota: rating(body.recepcaoNota),
    recepcaoComentario: clean(body.recepcaoComentario, MAX_LENGTHS.recepcaoComentario),

    tempoEsperaNota: rating(body.tempoEsperaNota),
    tempoEsperaComentario: clean(body.tempoEsperaComentario, MAX_LENGTHS.tempoEsperaComentario),

    posConsultaNota: rating(body.posConsultaNota),
    posConsultaComentario: clean(body.posConsultaComentario, MAX_LENGTHS.posConsultaComentario),

    enfermagemNota: rating(body.enfermagemNota),
    enfermagemComentario: clean(body.enfermagemComentario, MAX_LENGTHS.enfermagemComentario),

    laboratorioNota: rating(body.laboratorioNota),
    laboratorioComentario: clean(body.laboratorioComentario, MAX_LENGTHS.laboratorioComentario),

    odontologiaNota: rating(body.odontologiaNota),
    odontologiaComentario: clean(body.odontologiaComentario, MAX_LENGTHS.odontologiaComentario),

    medicoNota: rating(body.medicoNota),
    medicoComentario: clean(body.medicoComentario, MAX_LENGTHS.medicoComentario),

    limpezaNota: rating(body.limpezaNota),
    limpezaComentario: clean(body.limpezaComentario, MAX_LENGTHS.limpezaComentario),

    organizacaoNota: rating(body.organizacaoNota),
    organizacaoComentario: clean(body.organizacaoComentario, MAX_LENGTHS.organizacaoComentario),

    estruturaNota: rating(body.estruturaNota),
    estruturaComentario: clean(body.estruturaComentario, MAX_LENGTHS.estruturaComentario),

    recomendacaoNota: rating(body.recomendacaoNota),
    comentarioGeral: clean(body.comentarioGeral, MAX_LENGTHS.comentarioGeral)
  };

  if (!payload.patientName || payload.patientName.length < 3) {
    return json({ error: 'Nome do paciente obrigatório.' }, 400);
  }

  if (!payload.patientPhone || payload.patientPhone.replace(/\D/g, '').length < 10) {
    return json({ error: 'Telefone do paciente obrigatório.' }, 400);
  }

  if (!hasAnyRating(payload)) {
    return json({ error: 'Envie pelo menos uma nota.' }, 400);
  }

  const result = await env.DB.prepare(`
    INSERT INTO feedbacks (
      patient_name,
      patient_phone,
      medico_nome,
      whatsapp_nota,
      whatsapp_comentario,
      agendamento_nota,
      agendamento_comentario,
      recepcao_nota,
      recepcao_comentario,
      tempo_espera_nota,
      tempo_espera_comentario,
      pos_consulta_nota,
      pos_consulta_comentario,
      enfermagem_nota,
      enfermagem_comentario,
      laboratorio_nota,
      laboratorio_comentario,
      odontologia_nota,
      odontologia_comentario,
      medico_nota,
      medico_comentario,
      limpeza_nota,
      limpeza_comentario,
      organizacao_nota,
      organizacao_comentario,
      estrutura_nota,
      estrutura_comentario,
      recomendacao_nota,
      comentario_geral
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    payload.patientName,
    payload.patientPhone,
    payload.medicoNome,
    payload.whatsappNota,
    payload.whatsappComentario,
    payload.agendamentoNota,
    payload.agendamentoComentario,
    payload.recepcaoNota,
    payload.recepcaoComentario,
    payload.tempoEsperaNota,
    payload.tempoEsperaComentario,
    payload.posConsultaNota,
    payload.posConsultaComentario,
    payload.enfermagemNota,
    payload.enfermagemComentario,
    payload.laboratorioNota,
    payload.laboratorioComentario,
    payload.odontologiaNota,
    payload.odontologiaComentario,
    payload.medicoNota,
    payload.medicoComentario,
    payload.limpezaNota,
    payload.limpezaComentario,
    payload.organizacaoNota,
    payload.organizacaoComentario,
    payload.estruturaNota,
    payload.estruturaComentario,
    payload.recomendacaoNota,
    payload.comentarioGeral
  ).run();

  return json({ ok: true, id: result.meta.last_row_id }, 201);
}


async function listFeedbacks(request, env) {
  requireDb(env);
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const { results } = await env.DB.prepare(`
    SELECT * FROM feedbacks
    ORDER BY created_at DESC
    LIMIT 5000
  `).all();

  return json({ feedbacks: results || [] });
}

async function deleteFeedback(request, env, id) {
  requireDb(env);
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const numberId = Number(id);
  if (!Number.isInteger(numberId) || numberId <= 0) {
    return json({ error: 'ID inválido.' }, 400);
  }

  await env.DB.prepare('DELETE FROM feedbacks WHERE id = ?').bind(numberId).run();
  return json({ ok: true });
}

async function deleteAllFeedbacks(request, env) {
  requireDb(env);
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  await env.DB.prepare('DELETE FROM feedbacks').run();
  return json({ ok: true });
}

function csvCell(value) {
  const textValue = String(value ?? '');
  return `"${textValue.replace(/"/g, '""')}"`;
}

async function exportCsv(request, env) {
  requireDb(env);
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const { results } = await env.DB.prepare(`
    SELECT * FROM feedbacks
    ORDER BY created_at DESC
  `).all();

  const rows = results || [];
  const columns = [
    'id', 'created_at', 'patient_name', 'patient_phone', 'medico_nome',
    'whatsapp_nota', 'whatsapp_comentario',
    'agendamento_nota', 'agendamento_comentario',
    'recepcao_nota', 'recepcao_comentario',
    'tempo_espera_nota', 'tempo_espera_comentario',
    'pos_consulta_nota', 'pos_consulta_comentario',
    'enfermagem_nota', 'enfermagem_comentario',
    'laboratorio_nota', 'laboratorio_comentario',
    'odontologia_nota', 'odontologia_comentario',
    'medico_nota', 'medico_comentario',
    'limpeza_nota', 'limpeza_comentario',
    'organizacao_nota', 'organizacao_comentario',
    'estrutura_nota', 'estrutura_comentario',
    'recomendacao_nota', 'comentario_geral'
  ];

  const csv = [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(','))
  ].join('\n');

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="feedback-amorsaude.csv"',
      ...CORS_HEADERS
    }
  });
}

async function handleApi(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  try {
    if (path === '/api/health' && request.method === 'GET') {
      return json({ ok: true, service: 'feedback-amorsaude', d1: Boolean(env.DB), auth: Boolean(env.DB) });
    }

    if (path === '/api/login' && request.method === 'POST') {
      return await login(request, env);
    }

    if (path === '/api/me' && request.method === 'GET') {
      return await me(request, env);
    }

    if (path === '/api/logout' && request.method === 'POST') {
      return await logout(request, env);
    }

    if (path === '/api/feedback' && request.method === 'POST') {
      return await createFeedback(request, env);
    }

    if (path === '/api/feedbacks' && request.method === 'GET') {
      return await listFeedbacks(request, env);
    }

    if (path === '/api/feedbacks' && request.method === 'DELETE') {
      return await deleteAllFeedbacks(request, env);
    }

    if (path === '/api/export.csv' && request.method === 'GET') {
      return await exportCsv(request, env);
    }

    const deleteMatch = path.match(/^\/api\/feedback\/(\d+)$/);
    if (deleteMatch && request.method === 'DELETE') {
      return await deleteFeedback(request, env, deleteMatch[1]);
    }

    return json({ error: 'Rota não encontrada.' }, 404);
  } catch (error) {
    return json({ error: 'Erro interno.', detail: error.message }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }

    if (env.ASSETS && env.ASSETS.fetch) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Arquivo não encontrado.', { status: 404 });
  }
};

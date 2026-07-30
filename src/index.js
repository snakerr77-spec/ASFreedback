const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const MAX_LENGTHS = {
  patientName: 90, patientPhone: 20, medicoNome: 90,
  whatsappComentario: 500, agendamentoComentario: 500, recepcaoComentario: 500,
  tempoEsperaComentario: 500, posConsultaComentario: 500, enfermagemComentario: 500,
  laboratorioComentario: 500, odontologiaComentario: 500, medicoComentario: 500,
  limpezaComentario: 500, organizacaoComentario: 500, estruturaComentario: 500,
  comentarioGeral: 900,
  doctorName: 90, specialty: 90, doctorComment: 500, openAnswer: 900
};

const PATIENT_RATING_FIELDS = [
  'whatsappNota','agendamentoNota','recepcaoNota','tempoEsperaNota','posConsultaNota',
  'enfermagemNota','laboratorioNota','odontologiaNota','medicoNota','limpezaNota',
  'organizacaoNota','estruturaNota','recomendacaoNota'
];
const DOCTOR_RATING_FIELDS = [
  'organizacaoNota','recepcaoNota','enfermagemNota','materiaisNota','limpezaNota',
  'estruturaNota','gestaoNota','fluxoNota','valorizacaoNota'
];
const VALID_CITIES = new Set(['cerquilho','tatui','itapeva','embu-das-artes']);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS } });
}
function clean(value, limit = 500) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}
function rating(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 5 ? number : null;
}
function normalizeCity(value) {
  const raw = clean(value, 40).toLowerCase();
  const aliases = { 'tatuí':'tatui', 'embu':'embu-das-artes', 'embu das artes':'embu-das-artes', 'embu_das_artes':'embu-das-artes' };
  const city = aliases[raw] || raw;
  return VALID_CITIES.has(city) ? city : 'cerquilho';
}
function cityFilter(request) {
  const url = new URL(request.url);
  if (!url.searchParams.has('cidade')) return null;
  return normalizeCity(url.searchParams.get('cidade'));
}
function hasAnyRating(payload, fields) { return fields.some((field) => Number.isInteger(payload[field])); }
function getBearerToken(request) {
  const auth = request.headers.get('Authorization') || '';
  return auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
}
function requireDb(env) { if (!env.DB) throw new Error('Binding D1 "DB" não configurado no Worker da Cloudflare.'); }
async function parseBody(request) {
  try { return await request.json(); } catch { return null; }
}
async function digestHex(text) {
  const bytes = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hashBuffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
async function hashPassword(password, salt) { return digestHex(`${salt}:${password}`); }
function randomToken(size = 32) {
  const bytes = new Uint8Array(size); crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
function sessionExpiry() { return new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(); }

async function login(request, env) {
  requireDb(env);
  const body = await parseBody(request);
  if (!body) return json({ error: 'JSON inválido.' }, 400);
  const username = clean(body.usuario || body.username || body.login || '', 80);
  const password = String(body.senha || body.password || '');
  if (!username || !password) return json({ error: 'Preencha usuário e senha.' }, 400);
  const user = await env.DB.prepare(`SELECT id, username, username_lower, name, role, password_salt, password_hash, active FROM users WHERE username_lower = ? LIMIT 1`).bind(username.toLowerCase()).first();
  if (!user || Number(user.active) !== 1) return json({ error: 'Usuário ou senha incorretos.' }, 401);
  if (await hashPassword(password, user.password_salt) !== user.password_hash) return json({ error: 'Usuário ou senha incorretos.' }, 401);
  const token = randomToken(32); const expiresAt = sessionExpiry();
  await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').bind(token, user.id, expiresAt).run();
  return json({ ok: true, token, expiresAt, user: { username: user.username, role: user.role, name: user.name } });
}

async function getSession(request, env) {
  requireDb(env);
  const token = getBearerToken(request); if (!token) return null;
  return await env.DB.prepare(`
    SELECT sessions.token, sessions.expires_at, users.id AS user_id, users.username, users.name, users.role, users.active
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ? AND sessions.expires_at > ? AND users.active = 1 LIMIT 1
  `).bind(token, new Date().toISOString()).first() || null;
}
async function requireAdmin(request, env) {
  const session = await getSession(request, env);
  if (!session || session.role !== 'admin') return { response: json({ error: 'Acesso negado. Faça login novamente.' }, 401), session: null };
  return { response: null, session };
}
async function me(request, env) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'Sessão inválida ou expirada.' }, 401);
  return json({ ok: true, user: { username: session.username, role: session.role, name: session.name }, expiresAt: session.expires_at });
}
async function logout(request, env) {
  requireDb(env); const token = getBearerToken(request);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  return json({ ok: true });
}

async function createFeedback(request, env) {
  requireDb(env);
  const body = await parseBody(request); if (!body) return json({ error: 'JSON inválido.' }, 400);
  const payload = {
    cidade: normalizeCity(body.cidade),
    patientName: clean(body.patientName, MAX_LENGTHS.patientName),
    patientPhone: clean(body.patientPhone, MAX_LENGTHS.patientPhone),
    medicoNome: clean(body.medicoNome, MAX_LENGTHS.medicoNome),
    whatsappNota: rating(body.whatsappNota), whatsappComentario: clean(body.whatsappComentario, MAX_LENGTHS.whatsappComentario),
    agendamentoNota: rating(body.agendamentoNota), agendamentoComentario: clean(body.agendamentoComentario, MAX_LENGTHS.agendamentoComentario),
    recepcaoNota: rating(body.recepcaoNota), recepcaoComentario: clean(body.recepcaoComentario, MAX_LENGTHS.recepcaoComentario),
    tempoEsperaNota: rating(body.tempoEsperaNota), tempoEsperaComentario: clean(body.tempoEsperaComentario, MAX_LENGTHS.tempoEsperaComentario),
    posConsultaNota: rating(body.posConsultaNota), posConsultaComentario: clean(body.posConsultaComentario, MAX_LENGTHS.posConsultaComentario),
    enfermagemNota: rating(body.enfermagemNota), enfermagemComentario: clean(body.enfermagemComentario, MAX_LENGTHS.enfermagemComentario),
    laboratorioNota: rating(body.laboratorioNota), laboratorioComentario: clean(body.laboratorioComentario, MAX_LENGTHS.laboratorioComentario),
    odontologiaNota: rating(body.odontologiaNota), odontologiaComentario: clean(body.odontologiaComentario, MAX_LENGTHS.odontologiaComentario),
    medicoNota: rating(body.medicoNota), medicoComentario: clean(body.medicoComentario, MAX_LENGTHS.medicoComentario),
    limpezaNota: rating(body.limpezaNota), limpezaComentario: clean(body.limpezaComentario, MAX_LENGTHS.limpezaComentario),
    organizacaoNota: rating(body.organizacaoNota), organizacaoComentario: clean(body.organizacaoComentario, MAX_LENGTHS.organizacaoComentario),
    estruturaNota: rating(body.estruturaNota), estruturaComentario: clean(body.estruturaComentario, MAX_LENGTHS.estruturaComentario),
    recomendacaoNota: rating(body.recomendacaoNota), comentarioGeral: clean(body.comentarioGeral, MAX_LENGTHS.comentarioGeral)
  };
  if (payload.patientName.length < 3) return json({ error: 'Nome do paciente obrigatório.' }, 400);
  if (payload.patientPhone.replace(/\D/g, '').length < 10) return json({ error: 'Telefone do paciente obrigatório.' }, 400);
  if (!hasAnyRating(payload, PATIENT_RATING_FIELDS)) return json({ error: 'Envie pelo menos uma nota.' }, 400);
  const result = await env.DB.prepare(`
    INSERT INTO feedbacks (
      cidade, patient_name, patient_phone, medico_nome,
      whatsapp_nota, whatsapp_comentario, agendamento_nota, agendamento_comentario,
      recepcao_nota, recepcao_comentario, tempo_espera_nota, tempo_espera_comentario,
      pos_consulta_nota, pos_consulta_comentario, enfermagem_nota, enfermagem_comentario,
      laboratorio_nota, laboratorio_comentario, odontologia_nota, odontologia_comentario,
      medico_nota, medico_comentario, limpeza_nota, limpeza_comentario,
      organizacao_nota, organizacao_comentario, estrutura_nota, estrutura_comentario,
      recomendacao_nota, comentario_geral
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    payload.cidade, payload.patientName, payload.patientPhone, payload.medicoNome,
    payload.whatsappNota, payload.whatsappComentario, payload.agendamentoNota, payload.agendamentoComentario,
    payload.recepcaoNota, payload.recepcaoComentario, payload.tempoEsperaNota, payload.tempoEsperaComentario,
    payload.posConsultaNota, payload.posConsultaComentario, payload.enfermagemNota, payload.enfermagemComentario,
    payload.laboratorioNota, payload.laboratorioComentario, payload.odontologiaNota, payload.odontologiaComentario,
    payload.medicoNota, payload.medicoComentario, payload.limpezaNota, payload.limpezaComentario,
    payload.organizacaoNota, payload.organizacaoComentario, payload.estruturaNota, payload.estruturaComentario,
    payload.recomendacaoNota, payload.comentarioGeral
  ).run();
  return json({ ok: true, id: result.meta.last_row_id, cidade: payload.cidade }, 201);
}

async function createDoctorFeedback(request, env) {
  requireDb(env);
  const body = await parseBody(request); if (!body) return json({ error: 'JSON inválido.' }, 400);
  const payload = {
    cidade: normalizeCity(body.cidade), doctorName: clean(body.doctorName, MAX_LENGTHS.doctorName), specialty: clean(body.specialty, MAX_LENGTHS.specialty),
    organizacaoNota: rating(body.organizacaoNota), organizacaoComentario: clean(body.organizacaoComentario, MAX_LENGTHS.doctorComment),
    recepcaoNota: rating(body.recepcaoNota), recepcaoComentario: clean(body.recepcaoComentario, MAX_LENGTHS.doctorComment),
    enfermagemNota: rating(body.enfermagemNota), enfermagemComentario: clean(body.enfermagemComentario, MAX_LENGTHS.doctorComment),
    materiaisNota: rating(body.materiaisNota), materiaisComentario: clean(body.materiaisComentario, MAX_LENGTHS.doctorComment),
    limpezaNota: rating(body.limpezaNota), limpezaComentario: clean(body.limpezaComentario, MAX_LENGTHS.doctorComment),
    estruturaNota: rating(body.estruturaNota), estruturaComentario: clean(body.estruturaComentario, MAX_LENGTHS.doctorComment),
    gestaoNota: rating(body.gestaoNota), gestaoComentario: clean(body.gestaoComentario, MAX_LENGTHS.doctorComment),
    fluxoNota: rating(body.fluxoNota), fluxoComentario: clean(body.fluxoComentario, MAX_LENGTHS.doctorComment),
    valorizacaoNota: rating(body.valorizacaoNota), valorizacaoComentario: clean(body.valorizacaoComentario, MAX_LENGTHS.doctorComment),
    prioridadeMelhoria: clean(body.prioridadeMelhoria, MAX_LENGTHS.openAnswer), sugestoes: clean(body.sugestoes, MAX_LENGTHS.openAnswer)
  };
  if (payload.doctorName.length < 3) return json({ error: 'Nome do médico obrigatório.' }, 400);
  if (payload.specialty.length < 2) return json({ error: 'Especialidade obrigatória.' }, 400);
  if (!hasAnyRating(payload, DOCTOR_RATING_FIELDS)) return json({ error: 'Envie pelo menos uma nota.' }, 400);
  const result = await env.DB.prepare(`
    INSERT INTO feedbacks_medicos (
      cidade, doctor_name, specialty,
      organizacao_nota, organizacao_comentario, recepcao_nota, recepcao_comentario,
      enfermagem_nota, enfermagem_comentario, materiais_nota, materiais_comentario,
      limpeza_nota, limpeza_comentario, estrutura_nota, estrutura_comentario,
      gestao_nota, gestao_comentario, fluxo_nota, fluxo_comentario,
      valorizacao_nota, valorizacao_comentario, prioridade_melhoria, sugestoes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    payload.cidade, payload.doctorName, payload.specialty,
    payload.organizacaoNota, payload.organizacaoComentario, payload.recepcaoNota, payload.recepcaoComentario,
    payload.enfermagemNota, payload.enfermagemComentario, payload.materiaisNota, payload.materiaisComentario,
    payload.limpezaNota, payload.limpezaComentario, payload.estruturaNota, payload.estruturaComentario,
    payload.gestaoNota, payload.gestaoComentario, payload.fluxoNota, payload.fluxoComentario,
    payload.valorizacaoNota, payload.valorizacaoComentario, payload.prioridadeMelhoria, payload.sugestoes
  ).run();
  return json({ ok: true, id: result.meta.last_row_id, cidade: payload.cidade }, 201);
}

async function listTable(request, env, table, responseKey) {
  const auth = await requireAdmin(request, env); if (auth.response) return auth.response;
  const city = cityFilter(request);
  const query = city ? `SELECT * FROM ${table} WHERE cidade = ? ORDER BY created_at DESC LIMIT 5000` : `SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 5000`;
  const statement = city ? env.DB.prepare(query).bind(city) : env.DB.prepare(query);
  const { results } = await statement.all();
  return json({ [responseKey]: results || [], cidade: city });
}
async function deleteOne(request, env, table, id) {
  const auth = await requireAdmin(request, env); if (auth.response) return auth.response;
  const numberId = Number(id); if (!Number.isInteger(numberId) || numberId <= 0) return json({ error: 'ID inválido.' }, 400);
  await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(numberId).run(); return json({ ok: true });
}
async function deleteAll(request, env, table) {
  const auth = await requireAdmin(request, env); if (auth.response) return auth.response;
  const city = cityFilter(request);
  if (city) await env.DB.prepare(`DELETE FROM ${table} WHERE cidade = ?`).bind(city).run();
  else await env.DB.prepare(`DELETE FROM ${table}`).run();
  return json({ ok: true, cidade: city });
}
function csvCell(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
async function exportCsv(request, env, table, columns, filename) {
  const auth = await requireAdmin(request, env); if (auth.response) return auth.response;
  const city = cityFilter(request);
  const query = city ? `SELECT * FROM ${table} WHERE cidade = ? ORDER BY created_at DESC` : `SELECT * FROM ${table} ORDER BY created_at DESC`;
  const statement = city ? env.DB.prepare(query).bind(city) : env.DB.prepare(query);
  const { results } = await statement.all(); const rows = results || [];
  const csv = [columns.join(','), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(','))].join('\n');
  return new Response(csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, ...CORS_HEADERS } });
}

const PATIENT_COLUMNS = ['id','created_at','cidade','patient_name','patient_phone','medico_nome','whatsapp_nota','whatsapp_comentario','agendamento_nota','agendamento_comentario','recepcao_nota','recepcao_comentario','tempo_espera_nota','tempo_espera_comentario','pos_consulta_nota','pos_consulta_comentario','enfermagem_nota','enfermagem_comentario','laboratorio_nota','laboratorio_comentario','odontologia_nota','odontologia_comentario','medico_nota','medico_comentario','limpeza_nota','limpeza_comentario','organizacao_nota','organizacao_comentario','estrutura_nota','estrutura_comentario','recomendacao_nota','comentario_geral'];
const DOCTOR_COLUMNS = ['id','created_at','cidade','doctor_name','specialty','organizacao_nota','organizacao_comentario','recepcao_nota','recepcao_comentario','enfermagem_nota','enfermagem_comentario','materiais_nota','materiais_comentario','limpeza_nota','limpeza_comentario','estrutura_nota','estrutura_comentario','gestao_nota','gestao_comentario','fluxo_nota','fluxo_comentario','valorizacao_nota','valorizacao_comentario','prioridade_melhoria','sugestoes'];

async function handleApi(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  const url = new URL(request.url); const path = url.pathname.replace(/\/+$/, '') || '/';
  try {
    if (path === '/api/health' && request.method === 'GET') return json({ ok: true, service: 'feedback-amorsaude', d1: Boolean(env.DB), multicidade: true });
    if (path === '/api/login' && request.method === 'POST') return await login(request, env);
    if (path === '/api/me' && request.method === 'GET') return await me(request, env);
    if (path === '/api/logout' && request.method === 'POST') return await logout(request, env);
    if (path === '/api/feedback' && request.method === 'POST') return await createFeedback(request, env);
    if (path === '/api/feedback-medico' && request.method === 'POST') return await createDoctorFeedback(request, env);
    if (path === '/api/feedbacks' && request.method === 'GET') return await listTable(request, env, 'feedbacks', 'feedbacks');
    if (path === '/api/feedbacks-medicos' && request.method === 'GET') return await listTable(request, env, 'feedbacks_medicos', 'feedbacks');
    if (path === '/api/feedbacks' && request.method === 'DELETE') return await deleteAll(request, env, 'feedbacks');
    if (path === '/api/feedbacks-medicos' && request.method === 'DELETE') return await deleteAll(request, env, 'feedbacks_medicos');
    if (path === '/api/export.csv' && request.method === 'GET') return await exportCsv(request, env, 'feedbacks', PATIENT_COLUMNS, 'feedback-amorsaude.csv');
    if (path === '/api/export-medicos.csv' && request.method === 'GET') return await exportCsv(request, env, 'feedbacks_medicos', DOCTOR_COLUMNS, 'feedback-medicos-amorsaude.csv');
    const patientDelete = path.match(/^\/api\/feedback\/(\d+)$/);
    if (patientDelete && request.method === 'DELETE') return await deleteOne(request, env, 'feedbacks', patientDelete[1]);
    const doctorDelete = path.match(/^\/api\/feedback-medico\/(\d+)$/);
    if (doctorDelete && request.method === 'DELETE') return await deleteOne(request, env, 'feedbacks_medicos', doctorDelete[1]);
    return json({ error: 'Rota não encontrada.' }, 404);
  } catch (error) {
    return json({ error: 'Erro interno.', detail: error.message }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env);
    if (env.ASSETS && env.ASSETS.fetch) return env.ASSETS.fetch(request);
    return new Response('Arquivo não encontrado.', { status: 404 });
  }
};

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const AUTH_KEY = 'amorsaude_auth';
const STORAGE_KEY = 'amorsaude_feedbacks';
const API_URL = (window.FEEDBACK_API_URL || '').replace(/\/$/, '');
const USE_API = window.FEEDBACK_USE_API !== false;
const CURRENT_UNIT = window.ASFUnit ? window.ASFUnit.get() : { slug: 'cerquilho', name: 'Cerquilho' };
function endpoint(path) {
  return `${API_URL}${path}`;
}

function getAuthToken() {
  try {
    const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    return auth?.token || '';
  } catch {
    return '';
  }
}

function authHeaders(extra = {}) {
  const token = getAuthToken();
  return token
    ? { ...extra, Authorization: `Bearer ${token}` }
    : { ...extra };
}

const MONTHS_2026 = [
  { value: 'janeiro-2026', label: 'Jan/26', month: 0 },
  { value: 'fevereiro-2026', label: 'Fev/26', month: 1 },
  { value: 'marco-2026', label: 'Mar/26', month: 2 },
  { value: 'abril-2026', label: 'Abr/26', month: 3 },
  { value: 'maio-2026', label: 'Mai/26', month: 4 },
  { value: 'junho-2026', label: 'Jun/26', month: 5 },
  { value: 'julho-2026', label: 'Jul/26', month: 6 },
  { value: 'agosto-2026', label: 'Ago/26', month: 7 },
  { value: 'setembro-2026', label: 'Set/26', month: 8 },
  { value: 'outubro-2026', label: 'Out/26', month: 9 },
  { value: 'novembro-2026', label: 'Nov/26', month: 10 },
  { value: 'dezembro-2026', label: 'Dez/26', month: 11 }
];

const ratingFields = [
  { key: 'whatsappNota', comment: 'whatsappComentario', label: 'WhatsApp', icon: 'chat' },
  { key: 'agendamentoNota', comment: 'agendamentoComentario', label: 'Agendamento', icon: 'calendar' },
  { key: 'recepcaoNota', comment: 'recepcaoComentario', label: 'Recepção', icon: 'check' },
  { key: 'tempoEsperaNota', comment: 'tempoEsperaComentario', label: 'Tempo de espera', icon: 'clock' },
  { key: 'enfermagemNota', comment: 'enfermagemComentario', label: 'Enfermagem', icon: 'service' },
  { key: 'laboratorioNota', comment: 'laboratorioComentario', label: 'Laboratório', icon: 'service' },
  { key: 'odontologiaNota', comment: 'odontologiaComentario', label: 'Odontologia', icon: 'service' },
  { key: 'medicoNota', comment: 'medicoComentario', label: 'Médico', icon: 'service' },
  { key: 'limpezaNota', comment: 'limpezaComentario', label: 'Limpeza', icon: 'star' },
  { key: 'organizacaoNota', comment: 'organizacaoComentario', label: 'Organização', icon: 'check' },
  { key: 'estruturaNota', comment: 'estruturaComentario', label: 'Estrutura', icon: 'star' },
  { key: 'recomendacaoNota', comment: 'comentarioGeral', label: 'Recomendação', icon: 'user' }
];

const state = {
  periodo: 'todos-2026',
  unidade: 'todos',
  servico: 'todos',
  idade: 'todas',
  feedbacks: []
};

const previousNumbers = new Map();

function getLogin() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
  } catch {
    return null;
  }
}

function requireLogin() {
  const auth = getLogin() || {
    user: 'local',
    name: 'Acesso local',
    role: 'admin',
    mode: 'local'
  };

  const sessionUser = $('#sessionUser');
  if (sessionUser) {
    sessionUser.textContent = `${auth.name || auth.user} • ${CURRENT_UNIT.name}`;
  }

  return auth;
}

function logout() {
  window.location.href = window.ASFUnit.withUnit('../home-page.html', CURRENT_UNIT.slug);
}

function sanitize(value) {
  return String(value ?? '')
    .replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

function number(value) {
  return Math.round(Number(value) || 0).toLocaleString('pt-BR');
}

function percent(value, decimals = 1) {
  const n = Number(value) || 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + '%';
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function icon(name) {
  const map = {
    check: 'icon-check',
    service: 'icon-service',
    star: 'icon-star',
    clock: 'icon-clock',
    alert: 'icon-alert',
    calendar: 'icon-calendar',
    user: 'icon-user',
    chat: 'icon-chat'
  };
  return `<svg aria-hidden="true"><use href="#${map[name] || 'icon-info'}"></use></svg>`;
}

function normalizeFeedback(raw) {
  const feedback = {
    id: raw.id || raw.createdAt || raw.created_at || Date.now(),
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    patientName: raw.patientName ?? raw.patient_name ?? '',
    patientPhone: raw.patientPhone ?? raw.patient_phone ?? '',
    medicoNome: raw.medicoNome ?? raw.medico_nome ?? '',
    comentarioGeral: raw.comentarioGeral ?? raw.comentario_geral ?? '',
    cidade: raw.cidade || 'cerquilho'
  };

  ratingFields.forEach(field => {
    const snakeKey = field.key.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase());
    const snakeComment = field.comment.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase());
    feedback[field.key] = raw[field.key] ?? raw[snakeKey] ?? null;
    feedback[field.comment] = raw[field.comment] ?? raw[snakeComment] ?? '';
  });

  return feedback;
}

function getStoredFeedbacks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.map(normalizeFeedback).filter(item => item.cidade === CURRENT_UNIT.slug)
      : [];
  } catch {
    return [];
  }
}

async function getApiFeedbacks() {
  if (!USE_API) return null;
  if (!getAuthToken()) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const response = await fetch(endpoint(`/api/feedbacks?cidade=${encodeURIComponent(CURRENT_UNIT.slug)}`), {
    headers: authHeaders()
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Não foi possível carregar os feedbacks da Cloudflare.');
  }

  return Array.isArray(data.feedbacks) ? data.feedbacks.map(normalizeFeedback) : [];
}

async function loadFeedbacks() {
  try {
    if (USE_API) {
      state.feedbacks = await getApiFeedbacks();
      return;
    }

    state.feedbacks = getStoredFeedbacks();
  } catch (error) {
    console.warn(error);
    state.feedbacks = [];
    alert(error.message || 'Erro ao carregar feedbacks da Cloudflare.');
  }
}

function feedbackDate(feedback) {
  const date = new Date(feedback.createdAt);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function selectedMonthInfo() {
  if (state.periodo === 'todos-2026') return null;
  return MONTHS_2026.find(item => item.value === state.periodo) || null;
}

function ratingValues(feedback, category = 'todos') {
  const fields = category === 'todos'
    ? ratingFields
    : ratingFields.filter(field => field.key === category);

  return fields
    .map(field => Number(feedback[field.key]))
    .filter(value => Number.isInteger(value) && value >= 1 && value <= 5);
}

function feedbackHasSelectedNote(feedback) {
  if (state.idade === 'todas') return true;
  const note = Number(state.idade);
  return ratingValues(feedback, state.servico).includes(note);
}

function filterFeedbacks() {
  const monthInfo = selectedMonthInfo();

  return state.feedbacks.filter(feedback => {
    const date = feedbackDate(feedback);

    if (date.getFullYear() !== 2026 && state.periodo !== 'todos-2026') return false;
    if (monthInfo && date.getMonth() !== monthInfo.month) return false;

    if (state.unidade !== 'todos') {
      const medico = String(feedback.medicoNome || '').trim() || 'Sem profissional';
      if (medico !== state.unidade) return false;
    }

    if (state.servico !== 'todos' && ratingValues(feedback, state.servico).length === 0) return false;
    if (!feedbackHasSelectedNote(feedback)) return false;

    return true;
  });
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getCommentCount(feedbacks) {
  let count = 0;
  feedbacks.forEach(feedback => {
    ratingFields.forEach(field => {
      if (String(feedback[field.comment] || '').trim()) count += 1;
    });
    if (String(feedback.comentarioGeral || '').trim()) count += 1;
  });
  return count;
}

function getAllRatings(feedbacks, category = 'todos') {
  return feedbacks.flatMap(feedback => ratingValues(feedback, category));
}

function getData() {
  const feedbacks = filterFeedbacks();
  const ratings = getAllRatings(feedbacks, state.servico);
  const satisfacao = ratings.length ? (average(ratings) / 5) * 100 : 0;

  const recomendacoes = feedbacks
    .map((feedback) => {
      const direta = Number(feedback.recomendacaoNota);

      if (Number.isInteger(direta) && direta >= 1 && direta <= 5) {
        return direta;
      }

      const notasDoFeedback = ratingValues(feedback);
      return notasDoFeedback.length ? average(notasDoFeedback) : null;
    })
    .filter(value => Number.isFinite(value));

  const nps = recomendacoes.length
    ? (recomendacoes.filter(value => value >= 4).length / recomendacoes.length) * 100
    : 0;

  const positivos = ratings.length ? (ratings.filter(value => value >= 4).length / ratings.length) * 100 : 0;
  const neutros = ratings.length ? (ratings.filter(value => value === 3).length / ratings.length) * 100 : 0;
  const negativos = ratings.length ? (ratings.filter(value => value <= 2).length / ratings.length) * 100 : 0;

  const monthly = MONTHS_2026.map(month => {
    const monthFeedbacks = state.feedbacks.filter(feedback => {
      const date = feedbackDate(feedback);
      return date.getFullYear() === 2026 && date.getMonth() === month.month;
    });
    const monthRatings = getAllRatings(monthFeedbacks, state.servico);
    return monthRatings.length ? (average(monthRatings) / 5) * 100 : null;
  });

  return {
    feedbacks,
    avaliacoes: feedbacks.length,
    ratings,
    satisfacao,
    nps,
    comentarios: getCommentCount(feedbacks),
    recomendacoes,
    labels: MONTHS_2026.map(month => month.label),
    line: monthly,
    sentimentos: { positivos, neutros, negativos }
  };
}

function animateNumber(el, target, formatter, duration = 650) {
  if (!el) return;
  const key = el.id || el.dataset.metric || Math.random().toString(36);
  const start = previousNumbers.has(key) ? previousNumbers.get(key) : 0;
  const end = Number(target) || 0;
  const startTime = performance.now();

  el.classList.remove('metric-pop');
  void el.offsetWidth;
  el.classList.add('metric-pop');

  function frame(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = start + (end - start) * eased;
    el.textContent = formatter(value);

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      el.textContent = formatter(end);
      previousNumbers.set(key, end);
    }
  }

  requestAnimationFrame(frame);
}

function updateKpis(data) {
  animateNumber($('#kpiAvaliacoes'), data.avaliacoes, number);
  animateNumber($('#kpiSatisfacao'), data.satisfacao, value => data.ratings.length ? percent(value) : '0%');
  animateNumber($('#kpiTempo'), data.comentarios, number);
  animateNumber($('#kpiNps'), data.nps, value => data.feedbacks.length ? `${Math.round(value)}%` : '0%');

  $('#kpiAvaliacoesDelta').textContent = data.avaliacoes ? 'feedbacks reais recebidos' : 'aguardando feedbacks';
  $('#kpiSatisfacaoDelta').textContent = data.ratings.length ? `${number(data.ratings.length)} notas avaliadas` : 'sem notas ainda';
  $('#kpiTempoDelta').textContent = data.comentarios ? 'comentários dos pacientes' : 'sem comentários ainda';
  $('#kpiNpsDelta').textContent = data.recomendacoes?.length ? 'baseado nas avaliações' : 'sem avaliações ainda';
}

function renderLineChart(data) {
  const target = $('#lineChart');
  if (!target) return;

  const hasData = data.line.some(value => value !== null);

  if (!hasData) {
    target.innerHTML = `<div class="empty-state">Nenhum feedback em 2026 ainda. Assim que as respostas forem enviadas, o gráfico aparece aqui.</div>`;
    return;
  }

  const w = 720;
  const h = 250;
  const pad = { left: 50, right: 20, top: 24, bottom: 42 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const x = index => pad.left + (index / (data.line.length - 1)) * chartW;
  const y = value => pad.top + chartH - (value / 100) * chartH;

  const points = data.line.map((value, index) => value === null ? null : ({ x: x(index), y: y(value), value, index }));

  let linePath = '';
  let started = false;
  points.forEach(point => {
    if (!point) {
      started = false;
      return;
    }
    linePath += `${started ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)} `;
    started = true;
  });

  const grid = [0, 25, 50, 75, 100].map(v => {
    const yy = y(v);
    return `<g class="axis"><line class="grid-line" x1="${pad.left}" x2="${w - pad.right}" y1="${yy}" y2="${yy}"></line><text x="${pad.left - 12}" y="${yy + 4}" text-anchor="end">${v}%</text></g>`;
  }).join('');

  const labels = data.labels.map((label, index) => `<text class="month-label" x="${x(index)}" y="${h - 12}">${label}</text>`).join('');

  const dots = points.filter(Boolean).map((p, index) => `
    <circle class="chart-dot" style="animation-delay:${0.25 + index * 0.05}s" cx="${p.x}" cy="${p.y}" r="5"></circle>
    <text class="point-label" style="animation-delay:${0.42 + index * 0.05}s" x="${p.x}" y="${p.y - 14}">${percent(p.value)}</text>
  `).join('');

  target.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${grid}
      <path class="chart-line" d="${linePath.trim()}"></path>
      ${dots}
      ${labels}
    </svg>`;
}

function renderDonut(data) {
  const chart = $('#donutChart');
  const legend = $('#sentimentLegend');
  if (!chart || !legend) return;

  if (!data.ratings.length) {
    chart.innerHTML = `<div class="empty-donut">0<br><span>notas</span></div>`;
    legend.innerHTML = `<div class="empty-state small">Sem notas para distribuir.</div>`;
    return;
  }

  const values = [
    { label: 'Positivos', value: data.sentimentos.positivos, color: '#20b354', count: data.ratings.filter(value => value >= 4).length },
    { label: 'Neutros', value: data.sentimentos.neutros, color: '#f5b51b', count: data.ratings.filter(value => value === 3).length },
    { label: 'Negativos', value: data.sentimentos.negativos, color: '#ff4254', count: data.ratings.filter(value => value <= 2).length }
  ];

  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const circles = values.map(item => {
    const length = (item.value / 100) * circumference;
    const circle = `<circle cx="100" cy="100" r="${radius}" fill="none" stroke="${item.color}" stroke-width="28" stroke-linecap="butt" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="-${offset}"></circle>`;
    offset += length;
    return circle;
  }).join('');

  chart.innerHTML = `
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="${radius}" fill="none" stroke="#e8eef4" stroke-width="28"></circle>
      ${circles}
    </svg>
    <div class="donut-center"><strong id="donutTotal">0</strong><span>notas</span></div>`;
  animateNumber($('#donutTotal'), data.ratings.length, number, 700);

  legend.innerHTML = values.map(item => `
    <div class="legend-row">
      <span class="legend-dot" style="background:${item.color}"></span>
      <span>${item.label}</span>
      <span class="legend-value">${percent(item.value)}</span>
      <span class="legend-count">(${number(item.count)})</span>
    </div>`).join('');
}

function categoryStats(feedbacks) {
  return ratingFields.map(field => {
    const ratings = feedbacks
      .map(item => Number(item[field.key]))
      .filter(value => Number.isInteger(value));
    const avg = ratings.length ? average(ratings) : 0;
    const positive = ratings.length ? ratings.filter(value => value >= 4).length / ratings.length * 100 : 0;
    const negative = ratings.length ? ratings.filter(value => value <= 2).length / ratings.length * 100 : 0;
    return {
      ...field,
      count: ratings.length,
      avg,
      positive,
      negative,
      score: avg ? (avg / 5) * 100 : 0
    };
  }).filter(item => item.count > 0);
}

function renderProgress(data) {
  const stats = categoryStats(data.feedbacks);
  const elogiosBox = $('#elogios');
  const melhoriasBox = $('#melhorias');

  if (!stats.length) {
    elogiosBox.innerHTML = `<div class="empty-state small">Nenhum tópico avaliado ainda.</div>`;
    melhoriasBox.innerHTML = `<div class="empty-state small">Nenhum ponto de melhoria ainda.</div>`;
    return;
  }

  const elogios = [...stats].sort((a, b) => b.score - a.score).slice(0, 4);
  const melhorias = [...stats].sort((a, b) => a.score - b.score).slice(0, 4);

  const render = (items, target, danger = false) => {
    target.innerHTML = items.map(item => {
      const value = danger ? Math.round(100 - item.score) : Math.round(item.score);
      return `
        <div class="progress-row" data-value="${clamp(value, 0, 100)}">
          <span class="row-icon">${icon(danger ? 'alert' : item.icon)}</span>
          <div>
            <strong>${sanitize(item.label)}</strong>
            <div class="bar" style="--value:0%"><span></span></div>
          </div>
          <em>${clamp(value, 0, 100)}%</em>
        </div>`;
    }).join('');

    requestAnimationFrame(() => {
      $$(`.progress-row`, target).forEach(row => {
        row.querySelector('.bar').style.setProperty('--value', row.dataset.value + '%');
      });
    });
  };

  render(elogios, elogiosBox);
  render(melhorias, melhoriasBox, true);
}

function starMarkup(count) {
  const value = clamp(Math.round(Number(count) || 0), 0, 5);
  return `<span class="stars" aria-label="${value} de 5 estrelas">${Array.from({ length: 5 }, (_, i) => `<svg class="${i < value ? '' : 'empty'}"><use href="#icon-star"></use></svg>`).join('')}</span>`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getMainComment(feedback) {
  const geral = String(feedback.comentarioGeral || '').trim();
  if (geral) return { text: geral, tag: 'Comentário geral', stars: Number(feedback.recomendacaoNota) || 0 };

  for (const field of ratingFields) {
    const text = String(feedback[field.comment] || '').trim();
    if (text) return { text, tag: field.label, stars: Number(feedback[field.key]) || 0 };
  }

  return null;
}

function reviewMarkup(feedback) {
  const comment = getMainComment(feedback);
  const ratings = ratingValues(feedback);
  const stars = comment?.stars || Math.round(average(ratings)) || 0;
  const patientName = feedback.patientName || 'Paciente não informado';
  const patientPhone = feedback.patientPhone || 'Telefone não informado';
  const medico = feedback.medicoNome || 'Sem profissional informado';

  return `
    <article class="review-card">
      ${starMarkup(stars)}

      <div class="doctor-chip">
        <span class="doctor-avatar">${icon('user')}</span>
        <div>
          <span>Profissional avaliado</span>
          <strong>${sanitize(medico)}</strong>
        </div>
      </div>

      <blockquote>${sanitize(comment?.text || 'Paciente enviou avaliação sem comentário escrito.')}</blockquote>
      <span class="tag">${sanitize(comment?.tag || 'Avaliação')}</span>

      <div class="review-author patient-author">
        <span class="avatar">${icon('user')}</span>
        <div>
          <strong>${sanitize(patientName)}</strong>
          <small>Telefone: ${sanitize(patientPhone)}</small>
          <small>${formatDate(feedback.createdAt)}</small>
        </div>
      </div>
    </article>`;
}


function ratingLabel(field, value) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 1 || numberValue > 5) {
    return {
      className: 'empty',
      text: 'Não respondeu',
      stars: ''
    };
  }

  if (field.key === 'medicoNota') {
    return {
      className: numberValue >= 4 ? 'yes' : 'no',
      text: numberValue >= 4 ? 'Sim' : 'Não',
      stars: numberValue >= 4 ? 'Gostou do atendimento médico' : 'Não gostou do atendimento médico'
    };
  }

  const labels = {
    1: '1 - Insatisfeito',
    2: '2 - Regular',
    3: '3 - Bom',
    4: '4 - Excelente',
    5: '5 - Muito satisfeito'
  };

  return {
    className: `level-${numberValue}`,
    text: labels[numberValue] || `${numberValue} de 5`,
    stars: starMarkup(numberValue)
  };
}

function detailRatingRow(feedback, field) {
  const value = Number(feedback[field.key]);
  const comment = String(feedback[field.comment] || '').trim();
  const info = ratingLabel(field, value);

  return `
    <div class="detail-rating-row ${info.className}">
      <div class="detail-rating-head">
        <strong>${sanitize(field.label)}</strong>
        <span>${sanitize(info.text)}</span>
      </div>

      ${info.stars ? `<div class="detail-stars">${info.stars}</div>` : ''}

      <p>${comment ? sanitize(comment) : 'Sem comentário nesta categoria.'}</p>
    </div>`;
}

function fullReviewMarkup(feedback) {
  const patientName = feedback.patientName || 'Paciente não informado';
  const patientPhone = feedback.patientPhone || 'Telefone não informado';
  const medico = feedback.medicoNome || 'Sem profissional informado';
  const geral = String(feedback.comentarioGeral || '').trim();
  const ratings = ratingValues(feedback);
  const media = ratings.length ? average(ratings).toFixed(1).replace('.', ',') : '0,0';

  return `
    <article class="review-card review-card-full">
      <div class="full-review-top">
        <div>
          <span class="full-review-kicker">Avaliação completa</span>
          <h3>${sanitize(patientName)}</h3>
          <p>${sanitize(formatDate(feedback.createdAt))}</p>
        </div>

        <div class="full-review-score">
          <button
            type="button"
            class="delete-review-btn"
            data-delete-feedback="${sanitize(feedback.id)}"
            title="Apagar esta avaliação"
            aria-label="Apagar avaliação de ${sanitize(patientName)}"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16"></path>
              <path d="M10 11v6"></path>
              <path d="M14 11v6"></path>
              <path d="M6 7l1 14h10l1-14"></path>
              <path d="M9 7V4h6v3"></path>
            </svg>
          </button>
          <strong>${media}</strong>
          <span>Média geral</span>
        </div>
      </div>

      <div class="full-review-info">
        <div>
          <span>Telefone</span>
          <strong>${sanitize(patientPhone)}</strong>
        </div>

        <div>
          <span>Profissional avaliado</span>
          <strong>${sanitize(medico)}</strong>
        </div>
      </div>

      <div class="full-review-general">
        <span>Comentário geral</span>
        <p>${geral ? sanitize(geral) : 'Paciente não deixou comentário geral.'}</p>
      </div>

      <div class="full-review-ratings">
        ${ratingFields.map(field => detailRatingRow(feedback, field)).join('')}
      </div>
    </article>`;
}


function renderReviews(data) {
  const box = $('#reviews');
  const modal = $('#modalLista');
  const feedbacksWithComments = data.feedbacks.filter(item => getMainComment(item));

  const list = feedbacksWithComments.length ? feedbacksWithComments : data.feedbacks;

  if (!list.length) {
    const empty = `<div class="empty-state">Nenhum feedback enviado ainda. As respostas do formulário aparecerão aqui automaticamente.</div>`;
    box.innerHTML = empty;
    modal.innerHTML = empty;
    return;
  }

  box.innerHTML = list.slice(0, 3).map(reviewMarkup).join('');
  try {
    modal.innerHTML = list.map(fullReviewMarkup).join('');
  } catch (error) {
    console.warn('Erro ao montar detalhes completos dos feedbacks:', error);
    modal.innerHTML = list.map(reviewMarkup).join('');
  }
}


function removeStoredFeedback(id) {
  const normalizedId = String(id);

  state.feedbacks = state.feedbacks.filter(item => String(item.id) !== normalizedId);

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(stored)) {
      const updated = stored.filter(item => String(item.id || item.createdAt || item.created_at) !== normalizedId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {
    // Se o armazenamento local estiver inválido, segue apenas com os dados em memória.
  }
}

async function deleteSingleFeedback(id) {
  if (!id) return;

  const feedback = state.feedbacks.find(item => String(item.id) === String(id));
  const patientName = feedback?.patientName || 'este paciente';

  if (!confirm(`Deseja apagar a avaliação de ${patientName}? Esta ação não pode ser desfeita.`)) {
    return;
  }

  try {
    if (USE_API) {
      if (!getAuthToken()) throw new Error('Sessão expirada. Faça login novamente.');

      const response = await fetch(endpoint(`/api/feedback/${encodeURIComponent(id)}`), {
        method: 'DELETE',
        headers: authHeaders()
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível apagar este feedback na Cloudflare.');
      }

      await loadFeedbacks();
    } else {
      removeStoredFeedback(id);
    }

    updateDashboard();
  } catch (error) {
    alert(error.message || 'Erro ao apagar feedback.');
  }
}


function updateProfessionalFilter() {
  const select = $('#unidade');
  if (!select) return;

  const current = select.value || 'todos';
  const professionals = [...new Set(state.feedbacks.map(item => String(item.medicoNome || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  select.innerHTML = [
    '<option value="todos">Todos os profissionais</option>',
    ...professionals.map(name => `<option value="${sanitize(name)}">${sanitize(name)}</option>`)
  ].join('');

  select.value = professionals.includes(current) ? current : 'todos';
  state.unidade = select.value;
}

function updateDashboard() {
  updateProfessionalFilter();
  syncDropdowns();

  const data = getData();
  updateKpis(data);
  renderLineChart(data);
  renderDonut(data);
  renderProgress(data);
  renderReviews(data);
}

function syncDropdowns() {
  $$('.br-select').forEach(dropdown => {
    const select = $('select', dropdown.closest('.field'));
    const valueText = $('.br-select-value', dropdown);
    const selectedOption = select?.options[select.selectedIndex];

    if (valueText && selectedOption) valueText.textContent = selectedOption.textContent.trim();

    const menu = $('.br-select-menu', dropdown);
    if (menu && select) {
      menu.innerHTML = '';
      Array.from(select.options).forEach(option => {
        const item = document.createElement('button');
        item.type = 'button';
        item.setAttribute('role', 'option');
        item.dataset.value = option.value;
        item.textContent = option.textContent.trim();
        item.classList.toggle('active', option.value === select.value);
        item.setAttribute('aria-selected', option.value === select.value ? 'true' : 'false');
        item.addEventListener('click', () => {
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          dropdown.classList.remove('open');
          const btn = $('.br-select-btn', dropdown);
          if (btn) btn.setAttribute('aria-expanded', 'false');
        });
        menu.appendChild(item);
      });
    }
  });
}

function setFieldListeners() {
  ['periodo', 'unidade', 'servico', 'idade'].forEach(id => {
    const el = $('#' + id);
    if (!el) return;
    el.addEventListener('change', () => {
      state[id] = el.value;
      syncDropdowns();
      updateDashboard();
    });
  });

  const clear = $('#limparFiltros');
  if (clear) {
    clear.addEventListener('click', () => {
      state.periodo = 'todos-2026';
      state.unidade = 'todos';
      state.servico = 'todos';
      state.idade = 'todas';

      ['periodo', 'unidade', 'servico', 'idade'].forEach(id => {
        const el = $('#' + id);
        if (!el) return;
        el.value = state[id];
      });

      updateDashboard();
    });
  }
}

function setMenu() {
  const nav = $('.navbar');
  const menu = $('#menu');
  const button = $('.menu-button');
  if (!button || !menu) return;

  button.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    nav?.classList.toggle('menu-open', open);
    button.setAttribute('aria-expanded', String(open));
  });
}

function setModal() {
  const modal = $('#modalAvaliacoes');
  const open = $('#abrirAvaliacoes');
  const close = $('#fecharModal');

  if (!modal || !open || !close) return;

  open.addEventListener('click', () => {
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
  });

  close.addEventListener('click', () => modal.close());

  modal.addEventListener('click', event => {
    const deleteButton = event.target.closest('[data-delete-feedback]');

    if (deleteButton) {
      event.preventDefault();
      event.stopPropagation();
      deleteSingleFeedback(deleteButton.dataset.deleteFeedback);
      return;
    }

    const rect = modal.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) modal.close();
  });
}

function setReport() {
  const btn = $('#baixarRelatorio');
  if (btn) btn.addEventListener('click', () => window.print());
}

function setRefresh() {
  const btn = $('#atualizarFeedbacks');
  if (btn) {
    btn.addEventListener('click', async () => {
      await loadFeedbacks();
      updateDashboard();
    });
  }
}

function setClearFeedbacks(auth) {
  const btn = $('#limparFeedbacks');
  if (!btn || auth.role !== 'admin') return;

  btn.addEventListener('click', async () => {
    const message = USE_API
      ? `Deseja apagar TODOS os feedbacks da unidade ${CURRENT_UNIT.name}? Esta ação não pode ser desfeita.`
      : 'Deseja apagar os feedbacks salvos neste navegador?';

    if (!confirm(message)) return;

    try {
      if (USE_API) {
        if (!getAuthToken()) throw new Error('Sessão expirada. Faça login novamente.');
        const response = await fetch(endpoint(`/api/feedbacks?cidade=${encodeURIComponent(CURRENT_UNIT.slug)}`), {
          method: 'DELETE',
          headers: authHeaders()
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Não foi possível limpar os feedbacks na Cloudflare.');
      } else {
        try {
          const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
          const kept = Array.isArray(all) ? all.filter(item => (item.cidade || 'cerquilho') !== CURRENT_UNIT.slug) : [];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      state.feedbacks = [];
      updateDashboard();
    } catch (error) {
      alert(error.message || 'Erro ao limpar feedbacks.');
    }
  });
}

function setLogout() {
  const btn = $('#logoutBtn');
  if (btn) btn.addEventListener('click', logout);
}

function setReveal() {
  if (!('IntersectionObserver' in window)) {
    $$('.reveal').forEach(element => element.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  $$('.reveal').forEach(element => observer.observe(element));
}

function closeDropdowns(except) {
  $$('.br-select.open').forEach(item => {
    if (item !== except) {
      item.classList.remove('open');
      const btn = $('.br-select-btn', item);
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
  });
}

function createDropdown(select) {
  if (!select || select.dataset.dropdownBrasil === 'true') return;
  const field = select.closest('.field');
  if (!field) return;

  select.dataset.dropdownBrasil = 'true';
  select.classList.add('native-select');
  select.setAttribute('aria-hidden', 'true');
  select.tabIndex = -1;

  const dropdown = document.createElement('div');
  dropdown.className = 'br-select';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'br-select-btn';
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');

  const selected = document.createElement('span');
  selected.className = 'br-select-value';
  selected.textContent = select.options[select.selectedIndex]?.textContent.trim() || 'Selecionar';

  const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chevron.setAttribute('class', 'br-select-chevron');
  chevron.setAttribute('viewBox', '0 0 24 24');
  chevron.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M6 9l6 6 6-6');
  chevron.appendChild(path);

  button.appendChild(selected);
  button.appendChild(chevron);

  const menu = document.createElement('div');
  menu.className = 'br-select-menu';
  menu.setAttribute('role', 'listbox');

  button.addEventListener('click', () => {
    const isOpen = dropdown.classList.contains('open');
    closeDropdowns(dropdown);
    dropdown.classList.toggle('open', !isOpen);
    button.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
    syncDropdowns();
  });

  dropdown.appendChild(button);
  dropdown.appendChild(menu);
  select.insertAdjacentElement('afterend', dropdown);
}

function initDropdowns() {
  $$('.filter-card .field select').forEach(createDropdown);
  syncDropdowns();

  document.addEventListener('click', event => {
    if (!event.target.closest('.br-select')) closeDropdowns(null);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeDropdowns(null);
  });
}

function atualizarDataRodape() {
  const elemento = document.getElementById('ultimaAtualizacao');
  if (!elemento) return;

  const hoje = new Date();

  const data = hoje.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  elemento.textContent = `${data} às 09:15`;
  elemento.setAttribute('datetime', hoje.toISOString());
}

window.addEventListener('resize', () => renderLineChart(getData()));

document.addEventListener('DOMContentLoaded', async () => {
  const auth = requireLogin();
  if (!auth) return;

  await loadFeedbacks();
  initDropdowns();
  setFieldListeners();
  updateDashboard();
  setMenu();
  setModal();
  setReport();
  setRefresh();
  setClearFeedbacks(auth);
  setLogout();
  setReveal();
  atualizarDataRodape();
});
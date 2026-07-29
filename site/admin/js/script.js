const STORAGE_KEY = 'amorsaude_feedbacks';
const API_URL = (window.FEEDBACK_API_URL || '').replace(/\/$/, '');
const USE_API = window.FEEDBACK_USE_API !== false;
const reveals = document.querySelectorAll('.hero-card, .feature-strip, .doctor-feedback-panel, .info-grid > *');
const CURRENT_UNIT = window.ASFUnit ? window.ASFUnit.get() : { slug: 'cerquilho', name: 'Cerquilho' };

const ratingFields = [
  'whatsappNota',
  'agendamentoNota',
  'recepcaoNota',
  'tempoEsperaNota',
  'enfermagemNota',
  'laboratorioNota',
  'odontologiaNota',
  'medicoNota',
  'limpezaNota',
  'organizacaoNota',
  'estruturaNota',
  'recomendacaoNota'
];

function safeJson(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function endpoint(path) {
  return `${API_URL}${path}`;
}

function getAuthToken() {
  try {
    const auth = JSON.parse(localStorage.getItem('amorsaude_auth') || 'null');
    return auth?.token || '';
  } catch {
    return '';
  }
}

async function getApiFeedbacks() {
  const token = getAuthToken();
  if (!USE_API || !token) return null;

  const response = await fetch(endpoint(`/api/feedbacks?cidade=${encodeURIComponent(CURRENT_UNIT.slug)}`), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) return null;

  const data = await response.json().catch(() => ({}));
  return Array.isArray(data.feedbacks) ? data.feedbacks.map(normalizeFeedback) : null;
}

function normalizeFeedback(raw) {
  const feedback = {
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    comentarioGeral: raw.comentarioGeral ?? raw.comentario_geral ?? '',
    cidade: raw.cidade || 'cerquilho'
  };

  ratingFields.forEach((field) => {
    const snake = field.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase());
    feedback[field] = raw[field] ?? raw[snake] ?? null;
  });

  return feedback;
}

async function getFeedbacks() {
  const fromApi = await getApiFeedbacks();
  if (fromApi) return fromApi;

  const saved = safeJson(localStorage.getItem(STORAGE_KEY) || '[]', []);
  return Array.isArray(saved)
    ? saved.map(normalizeFeedback).filter(item => (item.cidade || 'cerquilho') === CURRENT_UNIT.slug)
    : [];
}

function getRatings(feedbacks) {
  return feedbacks.flatMap((feedback) =>
    ratingFields
      .map((field) => Number(feedback[field]))
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= 5)
  );
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatDecimal(value) {
  return Number(value || 0).toFixed(1).replace('.', ',');
}

function animateCounter(el, target, options = {}) {
  if (!el) return;

  const duration = 900;
  const start = 0;
  const end = Number(target) || 0;
  const startTime = performance.now();

  function run(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = start + (end - start) * eased;

    if (options.decimal) {
      el.textContent = formatDecimal(value);
    } else {
      el.textContent = Math.round(value).toLocaleString('pt-BR');
    }

    if (progress < 1) requestAnimationFrame(run);
  }

  requestAnimationFrame(run);
}

async function updateHomeStats() {
  const feedbacks = await getFeedbacks();
  const ratings = getRatings(feedbacks);
  const media = ratings.length ? average(ratings) : 0;

  const recomendacoes = feedbacks
    .map(item => Number(item.recomendacaoNota))
    .filter(value => Number.isInteger(value) && value >= 1 && value <= 5);

  const recomendacao = recomendacoes.length
    ? (recomendacoes.filter(value => value >= 4).length / recomendacoes.length) * 100
    : 0;

  const mediaEl = document.getElementById('homeMedia');
  const recomendacaoEl = document.getElementById('homeRecomendacao');
  const subtitle = document.getElementById('homeStatsSubtitle');
  const foot = document.getElementById('homeStatsFoot');

  animateCounter(mediaEl, media, { decimal: true });
  animateCounter(recomendacaoEl, recomendacao, { decimal: false });

  if (subtitle) {
    subtitle.textContent = feedbacks.length
      ? `${feedbacks.length.toLocaleString('pt-BR')} feedback${feedbacks.length === 1 ? '' : 's'} recebido${feedbacks.length === 1 ? '' : 's'}`
      : 'Aguardando os primeiros feedbacks reais';
  }

  if (foot) {
    foot.textContent = feedbacks.length
      ? 'Ver painel completo com dados reais'
      : 'Enviar feedbacks para alimentar este painel';
    foot.href = feedbacks.length
      ? window.ASFUnit.withUnit('pages/controle.html', CURRENT_UNIT.slug)
      : window.ASFUnit.withUnit('../public/feedback.html', CURRENT_UNIT.slug);
  }
}

reveals.forEach(el => el.classList.add('reveal'));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .12 });

reveals.forEach(el => revealObserver.observe(el));

document.addEventListener('DOMContentLoaded', updateHomeStats);
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) updateHomeStats();
});

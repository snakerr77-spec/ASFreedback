const API_URL = (window.FEEDBACK_API_URL || '').replace(/\/$/, '');
const USE_API = window.FEEDBACK_USE_API !== false;
const CURRENT_UNIT = window.ASFUnit ? window.ASFUnit.get() : { slug: 'cerquilho', name: 'Cerquilho' };
const fields = [
  'organizacaoNota', 'recepcaoNota', 'enfermagemNota', 'materiaisNota', 'limpezaNota',
  'estruturaNota', 'gestaoNota', 'fluxoNota', 'valorizacaoNota'
];
const state = Object.fromEntries(fields.map((field) => [field, null]));
const form = document.getElementById('doctorFeedbackForm');
const message = document.getElementById('doctorFormMessage');
const submitBtn = document.getElementById('doctorSubmitBtn');

function endpoint(path) { return `${API_URL}${path}`; }
function clean(value, limit = 900) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}
function starSvg(level) {
  return `<svg viewBox="0 0 50 50" aria-hidden="true"><path d="M25 4.5 31.15 17.2 45.1 19.2 35 29.15 37.35 43.1 25 36.5 12.65 43.1 15 29.15 4.9 19.2 18.85 17.2 25 4.5Z"></path></svg><span class="star-level-number">${level}</span>`;
}
function selectedInfo(level) {
  return {1:['😞','Insatisfeito'],2:['🙁','Regular'],3:['😐','Bom'],4:['🙂','Excelente'],5:['😄','Muito satisfeito']}[level];
}
function setupStars() {
  document.querySelectorAll('.stars').forEach((box) => {
    const name = box.dataset.name;
    for (let level = 1; level <= 5; level += 1) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'star-btn';
      btn.innerHTML = starSvg(level);
      btn.setAttribute('aria-label', `${level} de 5`);
      btn.addEventListener('click', () => {
        state[name] = level;
        [...box.children].forEach((item, index) => {
          item.classList.toggle('is-filled', index < level);
          item.classList.toggle('active', index === level - 1);
        });
        const row = box.closest('.rating-row');
        row.querySelector('.row-comment')?.classList.add('is-visible');
        let result = row.querySelector('.selected-rating-feedback');
        if (!result) { result = document.createElement('div'); row.appendChild(result); }
        const [face, label] = selectedInfo(level);
        result.className = `selected-rating-feedback level-${level}`;
        result.innerHTML = `<span class="selected-face">${face}</span><span class="selected-text">Você escolheu: ${level} - ${label}</span>`;
      });
      box.appendChild(btn);
    }
  });
}
function getPayload() {
  const data = new FormData(form);
  const payload = {
    cidade: CURRENT_UNIT.slug,
    doctorName: clean(data.get('doctorName'), 90),
    specialty: clean(data.get('specialty'), 90),
    prioridadeMelhoria: clean(data.get('prioridadeMelhoria'), 900),
    sugestoes: clean(data.get('sugestoes'), 900)
  };
  fields.forEach((field) => { payload[field] = state[field]; });
  fields.forEach((field) => {
    const comment = field.replace('Nota', 'Comentario');
    payload[comment] = clean(data.get(comment), 500);
  });
  return payload;
}
function setMessage(text, type = '') {
  message.textContent = text;
  message.className = `form-message ${type}`.trim();
}
function resetRatings() {
  fields.forEach((field) => { state[field] = null; });
  document.querySelectorAll('.star-btn').forEach((btn) => btn.classList.remove('active', 'is-filled'));
  document.querySelectorAll('.row-comment').forEach((el) => { el.value = ''; el.classList.remove('is-visible'); });
  document.querySelectorAll('.selected-rating-feedback').forEach((el) => el.remove());
}
function saveLocal(payload) {
  let list = [];
  try { list = JSON.parse(localStorage.getItem('amorsaude_feedbacks_medicos') || '[]'); } catch {}
  if (!Array.isArray(list)) list = [];
  list.unshift({ ...payload, id: Date.now(), createdAt: new Date().toISOString() });
  localStorage.setItem('amorsaude_feedbacks_medicos', JSON.stringify(list.slice(0, 2000)));
}
form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = getPayload();
  if (payload.doctorName.length < 3) return setMessage('Preencha o nome do médico.', 'error-box');
  if (payload.specialty.length < 2) return setMessage('Preencha a especialidade.', 'error-box');
  if (!fields.some((field) => Number.isInteger(payload[field]))) return setMessage('Escolha pelo menos uma nota.', 'error-box');
  submitBtn.disabled = true;
  submitBtn.querySelector('span').textContent = 'Enviando...';
  setMessage('');
  try {
    if (USE_API) {
      const response = await fetch(endpoint('/api/feedback-medico'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível salvar o feedback médico.');
    }
    saveLocal(payload);
    form.reset(); resetRatings();
    setMessage(`Feedback médico enviado para a unidade ${CURRENT_UNIT.name}. Obrigado!`, 'success-box');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    setMessage(error.message || 'Erro ao enviar feedback médico.', 'error-box');
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = 'Enviar feedback médico';
  }
});
setupStars();

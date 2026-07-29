const API_URL = (window.FEEDBACK_API_URL || '').replace(/\/$/, '');
const USE_API = window.FEEDBACK_USE_API !== false;
const CURRENT_UNIT = window.ASFUnit ? window.ASFUnit.get() : { slug: 'cerquilho', name: 'Cerquilho' };

const profissionaisMedicina = [
  'Dr. Yuri',
  'Dra. Karina',
  'Dr. Yanquel',
  'Dr. Leandro',
  'Dr. Pedro',
  'Dra. Isabeli',
  'Dra. Larissa',
  'Dr. Maúricio',
  'Dr. Carlos',
  'Dr. Enarco',
  'Dr. George',
  'Dr. Lucas',
  'Dra. Ingrid',
  'Dr. Juan',
  'Sra. Cristiane',
  'Sra. Francieli',
  'Dr. Sebastião',
  'Dr. Marcos',
  'Dra. Lisa',
  'Dr. Rodrigo',
  'Dra. Ithana',
  'Dr. Paulo',
  'Sra. Flávia',
  'Dra. Bruna',
  'Sr. Leonardo',
  'Dr. Matheus',
  'Dr. Edson',
  'Outro'
];

const profissionaisOdontologia = [
  'Dr. Gabriel Vieira Costa',
  'Dr. Gabriel Giovani Nogueira Camargo',
  'Dr. Guilherme Perazzo Emenegildo',
  'Dr. Matheus José Buzolin',
  'Dra. Erica Aparecida Lopes da Silva Oliveira',
  'Dra. Isabely Moreira dos Santos',
  'Dra. Larissa Amélia Fusco',
  'Dra. Teresa Mara Albuquerque Carneiro Pires',
  'Dra. Vitória Carolina de Oliveira',
  'Outro'
];

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
  'recomendacaoNota',
];

const state = {};

const form = document.getElementById('feedbackForm');
const message = document.getElementById('formMessage');
const submitBtn = document.getElementById('submitBtn');
const medicoSelect = document.getElementById('medicoNome');
const areaAtendimento = document.getElementById('areaAtendimento');
const serviceAreaOptions = document.getElementById('serviceAreaOptions');
const professionalSelectLabel = document.getElementById('professionalSelectLabel');
const outroMedico = document.getElementById('outroMedico');
const comentarioGeral = document.getElementById('comentarioGeral');
const counter = document.getElementById('counter');
const patientPhone = document.getElementById('patientPhone');
const patientName = document.getElementById('patientName');

function endpoint(path) {
  return `${API_URL}${path}`;
}

function onlyText(value, limit = 900) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

function starSvg(level) {
  return `
    <svg viewBox="0 0 50 50" aria-hidden="true" focusable="false">
      <path d="M25 4.5 31.15 17.2 45.1 19.2 35 29.15 37.35 43.1 25 36.5 12.65 43.1 15 29.15 4.9 19.2 18.85 17.2 25 4.5Z"></path>
    </svg>
    <span class="star-level-number" aria-hidden="true">${level}</span>
  `;
}

function getSelectedRatingInfo(level) {
  const levels = {
    1: {
      face: '😞',
      text: 'Você escolheu: 1 - Insatisfeito'
       },
    2: {
      face: '🙁',
      text: 'Você escolheu: 2 - Regular'
    },
    3: {
      face: '😐',
      text: 'Você escolheu: 3 - Bom'
    },
    4: {
      face: '🙂',
      text: 'Você escolheu: 4 - Excelente'
    },
    5: {
      face: '😄',
      text: 'Você escolheu: 5 - Muito satisfeito'
    }
  };

  return levels[level] || {
    face: '⭐',
    text: 'Escolha uma nota'
  };
}

function showSelectedRating(box, level) {
  const row = box.closest('.rating-row, .recommend-card');
  if (!row) return;

  const info = getSelectedRatingInfo(level);
  let result = row.querySelector('.selected-rating-feedback');

  if (!result) {
    result = document.createElement('div');
    row.appendChild(result);
  }

  result.className = `selected-rating-feedback level-${level}`;

  result.innerHTML = `
    <span class="selected-face">${info.face}</span>
    <span class="selected-text">${info.text}</span>
  `;
}

function fillProfissionais(area = 'medicina') {
  if (!medicoSelect) return;

  const isOdontologia = area === 'odontologia';
  const profissionais = isOdontologia
    ? profissionaisOdontologia
    : profissionaisMedicina;

  medicoSelect.innerHTML = '';

  const firstOption = document.createElement('option');
  firstOption.value = '';
  firstOption.textContent = isOdontologia
    ? 'Escolha o dentista'
    : 'Escolha o profissional de Medicina';
  medicoSelect.appendChild(firstOption);

  profissionais.forEach((nome) => {
    const option = document.createElement('option');
    option.value = nome;
    option.textContent = nome;
    medicoSelect.appendChild(option);
  });

  if (professionalSelectLabel) {
    professionalSelectLabel.textContent = isOdontologia
      ? 'Profissional de Odontologia'
      : 'Profissional de Medicina';
  }

  if (areaAtendimento) {
    areaAtendimento.value = isOdontologia ? 'Odontologia' : 'Medicina';
  }

  if (outroMedico) {
    outroMedico.value = '';
    outroMedico.classList.add('hidden');
    outroMedico.placeholder = isOdontologia
      ? 'Digite o nome do dentista'
      : 'Digite o nome do profissional';
  }
}

function setupServiceArea() {
  if (!serviceAreaOptions) return;

  const buttons = serviceAreaOptions.querySelectorAll('.service-area-btn');

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const area = button.dataset.area || 'medicina';

      buttons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle('is-selected', selected);
        item.setAttribute('aria-pressed', String(selected));
      });

      fillProfissionais(area);
    });
  });
}

function showRowComment(box) {
  const row = box.closest('[data-comment]');
  if (!row) return;

  const comment = row.querySelector('.row-comment');
  if (!comment) return;

  comment.classList.add('is-visible');
}

function setupStars() {
  document.querySelectorAll('.stars').forEach((box) => {
    const name = box.dataset.name;
    state[name] = null;

    for (let i = 1; i <= 5; i += 1) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'star-btn';
      btn.innerHTML = starSvg(i);
      btn.setAttribute('aria-label', `${i} de 5`);

      btn.addEventListener('click', () => {
        state[name] = i;

        [...box.children].forEach((child, index) => {
          child.classList.toggle('is-filled', index < i);
          child.classList.toggle('active', index === i - 1);
        });

        showRowComment(box);
        showSelectedRating(box, i);
      });

      box.appendChild(btn);
    }
  });
}


function setupYesNoRatings() {
  document.querySelectorAll('.yes-no-options').forEach((box) => {
    const name = box.dataset.name;
    if (!name) return;

    state[name] = null;

    const buttons = box.querySelectorAll('.yes-no-btn');

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = Number(btn.dataset.value);
        const label = btn.dataset.label || '';

        state[name] = value;

        buttons.forEach((button) => {
          button.classList.remove('is-selected');
        });

        btn.classList.add('is-selected');

        showRowComment(box);
        showSelectedYesNo(box, label);
      });
    });
  });
}

function showSelectedYesNo(box, label) {
  const row = box.closest('.rating-row, .recommend-card');
  if (!row) return;

  let result = row.querySelector('.selected-yes-no-feedback');

  if (!result) {
    result = document.createElement('div');
    row.appendChild(result);
  }

  const isYes = label.toLowerCase() === 'sim';

  result.className = `selected-yes-no-feedback ${isYes ? 'yes' : 'no'}`;
  result.innerHTML = `
    <span>${isYes ? '✓' : '○'}</span>
    <span>Você escolheu: ${label}</span>
  `;
}

function setMessage(text, type = '') {
  if (!message) return;

  message.textContent = text;
  message.className = `form-message ${type}`.trim();
}

function hasAnyRating(payload) {
  return ratingFields.some((field) => Number.isInteger(payload[field]));
}

function getPayload() {
  const data = new FormData(form);

  let medicoNome = onlyText(data.get('medicoNome'), 90);
  if (medicoNome === 'Outro') {
    medicoNome = onlyText(data.get('outroMedico'), 90);
  }

  return {
    cidade: CURRENT_UNIT.slug,
    patientName: onlyText(data.get('patientName'), 90),
    patientPhone: onlyText(data.get('patientPhone'), 20),

    medicoNome,
    areaAtendimento: onlyText(data.get('areaAtendimento'), 30),

    whatsappNota: state.whatsappNota,
    whatsappComentario: onlyText(data.get('whatsappComentario'), 500),

    agendamentoNota: state.agendamentoNota,
    agendamentoComentario: onlyText(data.get('agendamentoComentario'), 500),

    recepcaoNota: state.recepcaoNota,
    recepcaoComentario: onlyText(data.get('recepcaoComentario'), 500),

    tempoEsperaNota: state.tempoEsperaNota,
    tempoEsperaComentario: onlyText(data.get('tempoEsperaComentario'), 500),

    posConsultaNota: null,
    posConsultaComentario: '',

    enfermagemNota: state.enfermagemNota,
    enfermagemComentario: onlyText(data.get('enfermagemComentario'), 500),

    laboratorioNota: state.laboratorioNota,
    laboratorioComentario: onlyText(data.get('laboratorioComentario'), 500),

    odontologiaNota: state.odontologiaNota,
    odontologiaComentario: onlyText(data.get('odontologiaComentario'), 500),

    medicoNota: state.medicoNota,
    medicoComentario: onlyText(data.get('medicoComentario'), 500),

    limpezaNota: state.limpezaNota,
    limpezaComentario: onlyText(data.get('limpezaComentario'), 500),

    organizacaoNota: state.organizacaoNota,
    organizacaoComentario: onlyText(data.get('organizacaoComentario'), 500),

    estruturaNota: state.estruturaNota,
    estruturaComentario: onlyText(data.get('estruturaComentario'), 500),

    recomendacaoNota: state.recomendacaoNota,

    comentarioGeral: onlyText(data.get('comentarioGeral'), 500)
  };
}

function resetStarsAndComments() {
  Object.keys(state).forEach((key) => {
    state[key] = null;
  });

  document.querySelectorAll('.star-btn').forEach((btn) => {
    btn.classList.remove('active', 'is-filled');
  });

  document.querySelectorAll('.row-comment').forEach((comment) => {
    comment.value = '';
    comment.classList.remove('is-visible');
  });

  document.querySelectorAll('.selected-rating-feedback').forEach((item) => {
    item.remove();
  });

  document.querySelectorAll('.yes-no-btn').forEach((btn) => {
    btn.classList.remove('is-selected');
  });

  document.querySelectorAll('.selected-yes-no-feedback').forEach((item) => {
    item.remove();
  });
}

function maskPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

if (medicoSelect && outroMedico) {
  medicoSelect.addEventListener('change', () => {
    const show = medicoSelect.value === 'Outro';
    outroMedico.classList.toggle('hidden', !show);

    if (!show) {
      outroMedico.value = '';
    }
  });
}

if (comentarioGeral && counter) {
  comentarioGeral.addEventListener('input', () => {
    counter.textContent = `${comentarioGeral.value.length}/500`;
  });
}
if (patientName) {
  patientName.addEventListener('input', () => {
    markPatientFieldError(patientName, false);

    const patientCard = document.querySelector('.patient-card');
    if (patientCard) patientCard.classList.remove('has-error');
  });
}

if (patientPhone) {
  patientPhone.addEventListener('input', () => {
    markPatientFieldError(patientPhone, false);

    const patientCard = document.querySelector('.patient-card');
    if (patientCard) patientCard.classList.remove('has-error');
  });
}
if (patientPhone) {
  patientPhone.addEventListener('input', () => {
    patientPhone.value = maskPhone(patientPhone.value);
  });
}
function getPhoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function markPatientFieldError(input, hasError) {
  if (!input) return;
  input.classList.toggle('is-invalid', hasError);
}


function getStoredFeedbacks() {
  try {
    const value = localStorage.getItem('amorsaude_feedbacks');
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFeedbackLocal(payload) {
  const feedbacks = getStoredFeedbacks();
  feedbacks.unshift(payload);
  localStorage.setItem('amorsaude_feedbacks', JSON.stringify(feedbacks.slice(0, 2000)));
}

function validatePatientData() {
  const patientCard = document.querySelector('.patient-card');

  const nameValue = onlyText(patientName ? patientName.value : '', 90);
  const phoneValue = patientPhone ? patientPhone.value : '';
  const phoneDigits = getPhoneDigits(phoneValue);

  let hasError = false;

  markPatientFieldError(patientName, false);
  markPatientFieldError(patientPhone, false);

  if (patientCard) {
    patientCard.classList.remove('has-error');
  }

  if (!nameValue || nameValue.length < 3) {
    markPatientFieldError(patientName, true);
    hasError = true;
  }

  if (!phoneDigits || phoneDigits.length < 10) {
    markPatientFieldError(patientPhone, true);
    hasError = true;
  }

  if (hasError) {
    if (patientCard) {
      patientCard.classList.add('has-error');
      patientCard.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }

    if (!nameValue || nameValue.length < 3) {
      patientName.focus();
      setMessage('Preencha o nome do paciente antes de enviar.', 'error-box');
      return false;
    }

    patientPhone.focus();
    setMessage('Preencha um telefone válido antes de enviar.', 'error-box');
    return false;
  }

  return true;
}
if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!validatePatientData()) {
      return;
    }

    const payload = getPayload();

    if (!hasAnyRating(payload)) {
      setMessage('Escolha pelo menos uma nota antes de enviar.', 'error-box');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = 'Enviando...';
    setMessage('');

    try {
      let savedPayload = {
        ...payload,
        id: Date.now(),
        createdAt: new Date().toISOString(),
        origem: USE_API ? 'api' : 'local',
        cidade: CURRENT_UNIT.slug
      };

      if (USE_API) {
        const response = await fetch(endpoint('/api/feedback'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result.error || 'Não foi possível salvar na Cloudflare agora.');
        }

        savedPayload = {
          ...savedPayload,
          id: result.id || savedPayload.id,
          origem: 'api'
        };
      }

      saveFeedbackLocal(savedPayload);

      form.reset();
      resetStarsAndComments();

      if (counter) {
        counter.textContent = '0/500';
      }

      if (outroMedico) {
        outroMedico.classList.add('hidden');
      }

      const defaultAreaButton = serviceAreaOptions?.querySelector('[data-area="medicina"]');
      if (defaultAreaButton) {
        serviceAreaOptions.querySelectorAll('.service-area-btn').forEach((button) => {
          const selected = button === defaultAreaButton;
          button.classList.toggle('is-selected', selected);
          button.setAttribute('aria-pressed', String(selected));
        });
      }
      fillProfissionais('medicina');

      setMessage(`Avaliação enviada para a unidade ${CURRENT_UNIT.name}. Obrigado pela sua opinião!`, 'success-box');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setMessage(error.message || 'Erro ao enviar avaliação.', 'error-box');
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent = 'Enviar avaliação';
    }
  });
}

fillProfissionais('medicina');
setupServiceArea();
setupStars();
setupYesNoRatings();

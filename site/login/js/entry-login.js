(function () {
  const form = document.getElementById('entryLoginForm');
  const citySelect = document.getElementById('cidade');
  const usuario = document.getElementById('usuario');
  const senha = document.getElementById('senha');
  const lembrar = document.getElementById('lembrar');
  const toggleSenha = document.getElementById('toggleSenha');
  const areaPaciente = document.getElementById('areaPaciente');
  const toast = document.getElementById('toast');
  const API_URL = (window.FEEDBACK_API_URL || '').replace(/\/$/, '');

  if (!window.ASFUnit || !form || !citySelect) return;

  const query = new URLSearchParams(window.location.search);
  const currentUnit = window.ASFUnit.get();
  citySelect.value = currentUnit.slug;
  updateUnitContext(currentUnit.slug);

  const savedUser = localStorage.getItem('amorsaude_login_usuario');
  if (savedUser && usuario && lembrar) {
    usuario.value = savedUser;
    lembrar.checked = true;
  }

  function endpoint(path) {
    return `${API_URL}${path}`;
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function updateUnitContext(slug) {
    const unit = window.ASFUnit.set(slug);
    document.querySelectorAll('[data-unit-name]').forEach((el) => el.textContent = unit.name);
    document.querySelectorAll('[data-unit-full-name]').forEach((el) => el.textContent = `AmorSaúde ${unit.name}`);
    document.querySelectorAll('[data-unit-logo]').forEach((image) => {
      const prefix = image.dataset.logoPrefix || '';
      image.src = `${prefix}logo-dia-dos-pais-${unit.slug}.png`;
      image.alt = `AmorSaúde ${unit.name} - Dia dos Pais`;
    });
    return unit;
  }

  async function loginCloudflare(userValue, passValue) {
    const response = await fetch(endpoint('/api/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: userValue, senha: passValue })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Usuário ou senha incorretos.');
    if (!data.token || !data.user) throw new Error('A API não retornou uma sessão válida.');
    return data;
  }

  toggleSenha?.addEventListener('click', () => {
    const isPassword = senha.type === 'password';
    senha.type = isPassword ? 'text' : 'password';
    toggleSenha.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
  });

  citySelect.addEventListener('change', () => updateUnitContext(citySelect.value));

  areaPaciente?.addEventListener('click', () => {
    const unit = updateUnitContext(citySelect.value || currentUnit.slug);
    window.location.href = window.ASFUnit.withUnit('public/feedback.html', unit.slug);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const unit = updateUnitContext(citySelect.value || currentUnit.slug);
    const userValue = (usuario.value || '').trim();
    const passValue = (senha.value || '').trim();

    if (!userValue || !passValue) {
      showToast('Preencha o usuário e a senha para continuar.');
      (!userValue ? usuario : senha)?.focus();
      return;
    }

    const submitButton = document.getElementById('submitLoginBtn') || form.querySelector('button[type="submit"]');
    const original = submitButton?.innerHTML || '<span>Entrar</span>';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<span>Validando acesso...</span>';
    }

    try {
      const data = await loginCloudflare(userValue, passValue);
      if (lembrar?.checked) localStorage.setItem('amorsaude_login_usuario', data.user.username || userValue);
      else localStorage.removeItem('amorsaude_login_usuario');

      localStorage.setItem('amorsaude_auth', JSON.stringify({
        token: data.token,
        expiresAt: data.expiresAt,
        user: data.user.username || userValue,
        role: data.user.role,
        name: data.user.name,
        cidade: unit.slug,
        mode: 'cloudflare',
        loginAt: new Date().toISOString()
      }));

      showToast(`Acesso liberado para ${unit.name}.`);
      const redirectTarget = query.get('redirect') || 'admin/home-page.html';
      window.setTimeout(() => {
        window.location.href = window.ASFUnit.withUnit(redirectTarget, unit.slug);
      }, 350);
    } catch (error) {
      showToast(error.message || 'Não foi possível entrar.');
      senha.value = '';
      senha.focus();
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = original;
      }
    }
  });
})();

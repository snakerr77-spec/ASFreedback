(function () {
  const form = document.getElementById('entryLoginForm');
  const citySelect = document.getElementById('cidade');
  const usuario = document.getElementById('usuario');
  const senha = document.getElementById('senha');
  const lembrar = document.getElementById('lembrar');
  const toggleSenha = document.getElementById('toggleSenha');
  const areaPaciente = document.getElementById('areaPaciente');
  const entrarUnidadeLink = document.getElementById('entrarUnidadeLink');
  const toast = document.getElementById('toast');

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

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
  }


  function updateUnitContext(slug) {
    const unit = window.ASFUnit.set(slug);
    document.querySelectorAll('[data-unit-name]').forEach((el) => el.textContent = unit.name);
    document.querySelectorAll('[data-unit-full-name]').forEach((el) => el.textContent = 'AmorSaúde ' + unit.name);
    document.querySelectorAll('[data-unit-logo]').forEach((image) => {
      const prefix = image.dataset.logoPrefix || '';
      image.src = `${prefix}logo-dia-dos-pais-${unit.slug}.png`;
      image.alt = `AmorSaúde ${unit.name} - Dia dos Pais`;
    });
    if (entrarUnidadeLink) {
      entrarUnidadeLink.href = window.ASFUnit.withUnit('admin/home-page.html', unit.slug);
    }
    return unit;
  }


  toggleSenha?.addEventListener('click', () => {
    const isPassword = senha.type === 'password';
    senha.type = isPassword ? 'text' : 'password';
    toggleSenha.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
  });

  citySelect.addEventListener('change', () => {
    updateUnitContext(citySelect.value);
  });

  areaPaciente?.addEventListener('click', () => {
    const slug = citySelect.value || currentUnit.slug;
    const unit = updateUnitContext(slug);
    window.location.href = window.ASFUnit.withUnit('public/feedback.html', unit.slug);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const slug = citySelect.value || currentUnit.slug;
    const unit = updateUnitContext(slug);
    const userValue = (usuario.value || '').trim();
    const passValue = (senha.value || '').trim();

    if (!userValue || !passValue) {
      showToast('Preencha o usuário e a senha para continuar.');
      if (!userValue) usuario.focus(); else senha.focus();
      return;
    }

    const submitButton = document.getElementById('submitLoginBtn') || form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.originalText = submitButton.innerHTML;
      submitButton.innerHTML = '<span>Entrando...</span>';
    }

    try {
      if (lembrar && lembrar.checked) {
        localStorage.setItem('amorsaude_login_usuario', userValue);
      } else {
        localStorage.removeItem('amorsaude_login_usuario');
      }

      localStorage.setItem('amorsaude_auth', JSON.stringify({
        token: 'sessao-local',
        expiresAt: null,
        user: userValue,
        role: 'admin',
        name: userValue,
        cidade: unit.slug,
        mode: 'local',
        loginAt: new Date().toISOString()
      }));

      showToast('Acesso local liberado para ' + unit.name + '.');
      const redirectTarget = query.get('redirect') || 'admin/home-page.html';
      window.setTimeout(() => {
        window.location.href = window.ASFUnit.withUnit(redirectTarget, unit.slug);
      }, 300);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = submitButton.dataset.originalText || '<span>Entrar</span>';
      }
    }
  });
})();

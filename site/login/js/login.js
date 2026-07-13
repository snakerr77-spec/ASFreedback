(function () {
  const form = document.getElementById('loginForm');
  const usuario = document.getElementById('usuario');
  const senha = document.getElementById('senha');
  const lembrar = document.getElementById('lembrar');
  const toggleSenha = document.getElementById('toggleSenha');
  const areaPaciente = document.getElementById('areaPaciente');
  const toast = document.getElementById('toast');
  const anoAtual = document.getElementById('anoAtual');

  function endpoint(path) {
    return path;
  }

  if (anoAtual) {
    anoAtual.textContent = new Date().getFullYear();
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function goToControle() {
    window.location.href = 'admin/home-page.html';
  }

  function goToFeedback() {
    window.location.href = 'public/fredback.html';
  }

  async function loginCloudflare(userValue, passValue) {
    const response = await fetch(endpoint('/api/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: userValue, senha: passValue })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Usuário ou senha incorretos.');
    }

    if (!data.token || !data.user) {
      throw new Error('A API respondeu sem sessão. Verifique o Worker e o D1.');
    }

    return data;
  }

  const savedUser = localStorage.getItem('amorsaude_login_usuario');
  if (savedUser && usuario && lembrar) {
    usuario.value = savedUser;
    lembrar.checked = true;
  }

  if (toggleSenha && senha) {
    toggleSenha.addEventListener('click', () => {
      const isPassword = senha.type === 'password';
      senha.type = isPassword ? 'text' : 'password';
      toggleSenha.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
    });
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const userValue = (usuario.value || '').trim();
      const passValue = (senha.value || '').trim();

      if (!userValue || !passValue) {
        showToast('Preencha o usuário e a senha para continuar.');
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.dataset.originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<span>Validando acesso...</span>';
      }

      try {
        const data = await loginCloudflare(userValue, passValue);
        const account = data.user;

        if (lembrar && lembrar.checked) {
          localStorage.setItem('amorsaude_login_usuario', account.username || userValue);
        } else {
          localStorage.removeItem('amorsaude_login_usuario');
        }

        localStorage.setItem('amorsaude_auth', JSON.stringify({
          token: data.token,
          expiresAt: data.expiresAt,
          user: account.username || userValue,
          role: account.role,
          name: account.name,
          loginAt: new Date().toISOString()
        }));

        showToast('Acesso liberado pela Cloudflare. Abrindo painel...');
        window.setTimeout(goToControle, 450);
      } catch (error) {
        showToast(error.message || 'Falha ao validar acesso na Cloudflare.');
        senha.value = '';
        senha.focus();
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.innerHTML = submitButton.dataset.originalText || '<span>Entrar</span>';
        }
      }
    });
  }

  if (areaPaciente) {
    areaPaciente.addEventListener('click', goToFeedback);
  }
})();

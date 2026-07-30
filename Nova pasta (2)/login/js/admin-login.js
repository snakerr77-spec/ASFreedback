(function () {
  const form = document.getElementById('loginForm');
  const usuario = document.getElementById('usuario');
  const senha = document.getElementById('senha');
  const lembrar = document.getElementById('lembrar');
  const toggleSenha = document.getElementById('toggleSenha');
  const areaPaciente = document.getElementById('areaPaciente');
  const toast = document.getElementById('toast');
  const unit = window.ASFUnit.get();

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function redirectAfterLogin() {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('redirect') || 'admin/pages/controle.html';
    window.location.href = window.ASFUnit.withUnit(target, unit.slug);
  }

  async function loginCloudflare(userValue, passValue) {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: userValue, senha: passValue })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Usuário ou senha incorretos.');
    if (!data.token || !data.user) throw new Error('A API respondeu sem sessão.');
    return data;
  }

  const savedUser = localStorage.getItem('amorsaude_login_usuario');
  if (savedUser) { usuario.value = savedUser; lembrar.checked = true; }

  toggleSenha?.addEventListener('click', () => {
    const isPassword = senha.type === 'password';
    senha.type = isPassword ? 'text' : 'password';
    toggleSenha.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
  });

  areaPaciente?.addEventListener('click', () => {
    window.location.href = window.ASFUnit.withUnit('public/feedback.html', unit.slug);
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const userValue = usuario.value.trim();
    const passValue = senha.value.trim();
    if (!userValue || !passValue) return showToast('Preencha o usuário e a senha para continuar.');
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    const original = button.innerHTML;
    button.innerHTML = '<span>Validando acesso...</span>';
    try {
      const data = await loginCloudflare(userValue, passValue);
      if (lembrar.checked) localStorage.setItem('amorsaude_login_usuario', data.user.username || userValue);
      else localStorage.removeItem('amorsaude_login_usuario');
      localStorage.setItem('amorsaude_auth', JSON.stringify({
        token: data.token,
        expiresAt: data.expiresAt,
        user: data.user.username || userValue,
        role: data.user.role,
        name: data.user.name,
        cidade: unit.slug,
        loginAt: new Date().toISOString()
      }));
      showToast(`Acesso liberado para ${unit.name}.`);
      window.setTimeout(redirectAfterLogin, 350);
    } catch (error) {
      showToast(error.message || 'Falha ao validar acesso.');
      senha.value = '';
      senha.focus();
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  });
})();

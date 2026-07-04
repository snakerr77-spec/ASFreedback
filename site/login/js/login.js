(function () {
  const form = document.getElementById('loginForm');
  const usuario = document.getElementById('usuario');
  const senha = document.getElementById('senha');
  const lembrar = document.getElementById('lembrar');
  const toggleSenha = document.getElementById('toggleSenha');
  const areaPaciente = document.getElementById('areaPaciente');
  const toast = document.getElementById('toast');
  const anoAtual = document.getElementById('anoAtual');

  const USERS = {
    '1admin': {
      password: '1582',
      role: 'admin',
      name: 'Administrador'
    },
    'Colaborador1': {
      password: '123',
      role: 'colaborador',
      name: 'Colaborador'
    }
  };

  function findAccount(userValue) {
    const exact = USERS[userValue];
    if (exact) return { account: exact, normalizedUser: userValue };

    const foundKey = Object.keys(USERS).find(key => key.toLowerCase() === String(userValue).toLowerCase());
    if (!foundKey) return { account: null, normalizedUser: userValue };

    return { account: USERS[foundKey], normalizedUser: foundKey };
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
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const userValue = (usuario.value || '').trim();
      const passValue = (senha.value || '').trim();
      const { account, normalizedUser } = findAccount(userValue);

      if (!userValue || !passValue) {
        showToast('Preencha o usuário e a senha para continuar.');
        return;
      }

      if (!account || account.password !== passValue) {
        showToast('Usuário ou senha incorretos.');
        senha.value = '';
        senha.focus();
        return;
      }

      if (lembrar && lembrar.checked) {
        localStorage.setItem('amorsaude_login_usuario', normalizedUser);
      } else {
        localStorage.removeItem('amorsaude_login_usuario');
      }

      localStorage.setItem('amorsaude_auth', JSON.stringify({
        user: normalizedUser,
        role: account.role,
        name: account.name,
        loginAt: new Date().toISOString()
      }));

      showToast('Acesso liberado. Abrindo controle de feedbacks...');
      window.setTimeout(goToControle, 450);
    });
  }

  if (areaPaciente) {
    areaPaciente.addEventListener('click', goToFeedback);
  }
})();
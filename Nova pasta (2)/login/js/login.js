(function () {
  const form = document.getElementById('cityForm');
  const citySelect = document.getElementById('cidade');
  const toast = document.getElementById('toast');

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 1800);
  }

  if (!form || !citySelect || !window.ASFUnit) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!citySelect.value) {
      citySelect.focus();
      showToast('Selecione uma cidade para continuar.');
      return;
    }

    const unit = window.ASFUnit.set(citySelect.value);
    const submitButton = form.querySelector('button[type="submit"]');

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.originalText = submitButton.innerHTML;
      submitButton.innerHTML = '<span>Abrindo unidade...</span>';
    }

    showToast(`Abrindo AmorSaúde ${unit.name}...`);

    window.setTimeout(() => {
      window.location.href = window.ASFUnit.withUnit('admin/home-page.html', unit.slug);
    }, 320);
  });
})();
(function () {
  const STORAGE_KEY = 'amorsaude_unidade';
  const units = {
    'cerquilho': { slug: 'cerquilho', name: 'Cerquilho' },
    'tatui': { slug: 'tatui', name: 'Tatuí' },
    'itapeva': { slug: 'itapeva', name: 'Itapeva' },
    'embu-das-artes': { slug: 'embu-das-artes', name: 'Embu das Artes' }
  };

  function normalize(value) {
    const text = String(value || '').trim().toLowerCase();
    const aliases = {
      'tatuí': 'tatui',
      'embu': 'embu-das-artes',
      'embu das artes': 'embu-das-artes',
      'embu_das_artes': 'embu-das-artes'
    };
    const slug = aliases[text] || text;
    return units[slug] ? slug : 'cerquilho';
  }

  function fromQuery() {
    const params = new URLSearchParams(window.location.search);
    const value = params.get('cidade') || params.get('unidade');
    return value ? normalize(value) : '';
  }

  function get() {
    const queryUnit = fromQuery();
    if (queryUnit) {
      localStorage.setItem(STORAGE_KEY, queryUnit);
      return units[queryUnit];
    }

    const saved = normalize(localStorage.getItem(STORAGE_KEY) || 'cerquilho');
    return units[saved];
  }

  function set(slug) {
    const normalized = normalize(slug);
    localStorage.setItem(STORAGE_KEY, normalized);
    return units[normalized];
  }

  function withUnit(path, slug) {
    const unit = units[normalize(slug || get().slug)];
    const url = new URL(path, window.location.href);
    url.searchParams.set('cidade', unit.slug);
    return url.href;
  }

  function apply() {
    const unit = get();
    document.documentElement.dataset.unit = unit.slug;

    document.querySelectorAll('[data-unit-name]').forEach((element) => {
      element.textContent = unit.name;
    });

    document.querySelectorAll('[data-unit-full-name]').forEach((element) => {
      element.textContent = `AmorSaúde ${unit.name}`;
    });

    document.querySelectorAll('[data-unit-logo]').forEach((image) => {
      const prefix = image.dataset.logoPrefix || '';
      image.src = `${prefix}logo-dia-dos-pais-${unit.slug}.png`;
      image.alt = `AmorSaúde ${unit.name} - Dia dos Pais`;
    });

    document.querySelectorAll('[data-patient-link]').forEach((link) => {
      const path = link.dataset.path || '../public/feedback.html';
      link.href = withUnit(path, unit.slug);
    });

    document.querySelectorAll('[data-doctor-link]').forEach((link) => {
      const path = link.dataset.path || '../public/feedback-medico.html';
      link.href = withUnit(path, unit.slug);
    });

    document.querySelectorAll('[data-home-link]').forEach((link) => {
      const path = link.dataset.path || '../admin/home-page.html';
      link.href = withUnit(path, unit.slug);
    });

    document.querySelectorAll('[data-admin-link]').forEach((link) => {
      const target = link.dataset.redirect || 'pages/controle.html';
      link.href = withUnit(target, unit.slug);
    });

    if (document.title.includes('Cerquilho')) {
      document.title = document.title.replaceAll('Cerquilho', unit.name);
    }
  }

  window.ASFUnit = { units, normalize, get, set, withUnit, apply };
})();

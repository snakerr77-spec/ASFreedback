// Configuração do sistema de feedback AmorSaúde Cerquilho
// Este projeto está pronto para Cloudflare Pages + Pages Functions + D1.
//
// FEEDBACK_API_URL vazio significa: usar a API no mesmo domínio do site, exemplo:
// https://seusite.pages.dev/api/feedback
window.FEEDBACK_API_URL = '';

// true = enviar e buscar feedbacks na Cloudflare.
// false = usar apenas localStorage no navegador, somente para teste local.
window.FEEDBACK_USE_API = true;

// ATENÇÃO: coloque este mesmo valor na variável ADMIN_TOKEN do Cloudflare Pages.
// Depois, quando fizermos login/senha com banco, este token sai daqui.
window.FEEDBACK_ADMIN_TOKEN = 'AS_CERQUILHO_XNfXQV3KtaDe9BfLqV9Vg67GeVoH';

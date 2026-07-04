// Configuração do sistema de feedback AmorSaúde Cerquilho
// API vazia significa usar a API no mesmo domínio do Worker, exemplo:
// https://seusite.workers.dev/api/feedback
window.FEEDBACK_API_URL = '';

// true = enviar e buscar feedbacks na Cloudflare.
// false = usar apenas localStorage no navegador, somente para teste local.
window.FEEDBACK_USE_API = true;

// Login e senha agora são validados no Cloudflare D1 pela rota /api/login.
// Não deixe senhas dentro de JavaScript público.

// Gestion de la session : le backend utilise un token Sanctum (Bearer).
const TOKEN_KEY = 'salon_token';
const USER_KEY = 'salon_user';

const getToken = () => localStorage.getItem(TOKEN_KEY);
const getUser = () => JSON.parse(localStorage.getItem(USER_KEY) || 'null');
const isAdmin = () => getUser()?.role === 'admin';

function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Protège une page : redirige vers la connexion si aucun token.
function requireAuth() {
  if (!getToken()) { location.href = ROOT + 'login.html'; return false; }
  return true;
}

async function logout() {
  try { await Api.logout(); } catch (e) { /* token déjà invalide : on déconnecte quand même */ }
  clearSession();
  location.href = ROOT + 'login.html';
}

// Page de connexion
function initLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;
  if (getToken()) { location.href = ROOT + 'pages/dashboard.html'; return; }

  const alertBox = document.getElementById('login-alert');
  const pw = form.password;
  document.getElementById('toggle-pw').addEventListener('click', () => {
    pw.type = pw.type === 'password' ? 'text' : 'password';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    alertBox.hidden = true;
    // Validation simple côté frontend
    if (!form.email.value.trim()) return showFieldErrors(form, { email: ['L\'adresse e-mail est obligatoire.'] });
    if (!pw.value) return showFieldErrors(form, { password: ['Le mot de passe est obligatoire.'] });

    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      const data = await Api.login(form.email.value.trim(), pw.value);
      saveSession(data.token, data.user);
      location.href = ROOT + 'pages/dashboard.html';
    } catch (err) {
      const { message, errors } = apiError(err);
      if (errors) showFieldErrors(form, errors); else { alertBox.textContent = message; alertBox.hidden = false; }
    } finally { btn.disabled = false; }
  });
}
document.addEventListener('DOMContentLoaded', initLogin);

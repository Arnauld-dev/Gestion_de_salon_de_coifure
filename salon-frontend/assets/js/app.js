// Composants partagés : sidebar, header, modales, notifications, formatage.
const MENU = [
  { key: 'dashboard', label: 'Tableau de bord', icon: 'layout-dashboard', href: 'dashboard.html', ready: true },
  { key: 'clients', label: 'Clients', icon: 'users', href: 'clients.html', ready: true },
  { key: 'employes', label: 'Employés', icon: 'user-cog', href: 'employes.html', ready: true },
  { key: 'services', label: 'Services', icon: 'scissors', href: 'services.html', ready: true },
  { key: 'visites', label: 'Visites', icon: 'calendar-check', href: 'visites.html', ready: true },
  { key: 'factures', label: 'Factures', icon: 'file-text', href: 'factures.html', ready: true },
  { key: 'paiements', label: 'Paiements', icon: 'wallet', href: 'paiements.html', ready: true },
  { key: 'depenses', label: 'Dépenses', icon: 'receipt', href: 'depenses.html', adminOnly: true, ready: true },
  { key: 'profil', label: 'Mon profil', icon: 'user', href: 'profil.html', ready: true },
];

// ----- Formatage -----
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtMoney = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n) || 0) + ' ' + CURRENCY;
const fmtDate = (s) => (s ? new Date(String(s).slice(0, 10) + 'T00:00:00').toLocaleDateString('fr-FR') : '-');
// Les heures dépendent du format renvoyé par Laravel (voir README, point fuseau horaire)
const fmtDateTime = (s) => (s ? new Date(String(s).replace(' ', 'T')).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '-');
const fullName = (p) => (p ? `${p.prenom || ''} ${p.nom || ''}`.trim() : '-');
const labelOf = (v) => (v ? v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ') : '-');

// ----- Construction de la page (sidebar + header) -----
function buildShell(activeKey, title) {
  if (!requireAuth()) return null;
  const user = getUser() || {};
  const initials = (user.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const links = MENU.filter((m) => !m.adminOnly || isAdmin()).map((m) => m.ready
    ? `<a class="nav-link ${m.key === activeKey ? 'active' : ''}" href="${m.href}"><i data-lucide="${m.icon}"></i>${m.label}</a>`
    : `<span class="nav-link disabled" title="Bientôt disponible"><i data-lucide="${m.icon}"></i>${m.label}</span>`).join('');

  document.body.insertAdjacentHTML('afterbegin', `
    <aside class="sidebar" id="sidebar">
      <div class="brand"><i data-lucide="scissors"></i>${esc(SALON_NAME)}</div>
      <nav class="nav">${links}</nav>
      <button class="nav-link" id="logout-side"><i data-lucide="log-out"></i>Déconnexion</button>
    </aside>
    <div class="overlay" id="overlay"></div>
    <div class="main">
      <header class="topbar">
        <button class="icon-btn burger" id="burger" aria-label="Ouvrir le menu"><i data-lucide="menu"></i></button>
        <h1>${esc(title)}</h1>
        <div class="account">
          <button class="account-btn" id="account-btn">
            <span class="avatar">${esc(initials)}</span>
            <span class="user-meta">${esc(user.name)}<small>${esc(labelOf(user.role))}</small></span>
          </button>
          <div class="menu" id="account-menu">
            <a href="profil.html"><i data-lucide="user"></i>Mon profil</a>
            <button id="logout-menu"><i data-lucide="log-out"></i>Déconnexion</button>
          </div>
        </div>
      </header>
      <main class="content" id="content"></main>
    </div>
    <div id="toasts"></div>`);

  const sidebar = document.getElementById('sidebar'), overlay = document.getElementById('overlay');
  const toggle = (open) => { sidebar.classList.toggle('open', open); overlay.classList.toggle('open', open); };
  document.getElementById('burger').onclick = () => toggle(true);
  overlay.onclick = () => toggle(false);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 768) toggle(false); });
  document.getElementById('account-btn').onclick = (e) => { e.stopPropagation(); document.getElementById('account-menu').classList.toggle('open'); };
  document.addEventListener('click', () => document.getElementById('account-menu').classList.remove('open'));
  document.getElementById('logout-side').onclick = logout;
  document.getElementById('logout-menu').onclick = logout;
  refreshIcons();
  return document.getElementById('content');
}

// ----- États de chargement / vide / erreur -----
const loadingHtml = () => '<div class="state"><div class="spinner"></div>Chargement…</div>';
const emptyHtml = (msg) => `<div class="state">${esc(msg)}</div>`;
const errorHtml = (err) => `<div class="state" style="color:var(--error)">${esc(apiError(err).message)}</div>`;

// ----- Notifications -----
function toast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = 'toast ' + (type === 'error' ? 'error' : '');
  el.textContent = message;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ----- Modales -----
function openModal(title, bodyHtml) {
  closeModal();
  const el = document.createElement('div');
  el.className = 'modal-backdrop';
  el.id = 'modal';
  el.innerHTML = `<div class="modal"><div class="modal-head"><h3>${esc(title)}</h3>
    <button class="icon-btn" data-close aria-label="Fermer"><i data-lucide="x"></i></button></div>
    <div class="modal-body">${bodyHtml}</div></div>`;
  el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) closeModal(); });
  document.body.appendChild(el);
  refreshIcons();
  return el.querySelector('.modal-body');
}
const closeModal = () => document.getElementById('modal')?.remove();

// Confirmation avant suppression : retourne une promesse (true / false)
function confirmDialog(message) {
  return new Promise((resolve) => {
    const body = openModal('Confirmation', `<p style="margin-bottom:18px">${esc(message)}</p>
      <div class="form-actions"><button class="btn" data-close id="c-no">Annuler</button>
      <button class="btn btn-danger" id="c-yes">Supprimer</button></div>`);
    body.querySelector('#c-yes').onclick = () => { closeModal(); resolve(true); };
    body.querySelector('#c-no').onclick = () => resolve(false);
    document.querySelector('#modal [data-close]').addEventListener('click', () => resolve(false));
  });
}

// ----- Erreurs de validation Laravel (422) affichées sous chaque champ -----
function clearFieldErrors(form) { form.querySelectorAll('.field-error').forEach((e) => (e.textContent = '')); }
function showFieldErrors(form, errors) {
  Object.entries(errors).forEach(([name, msgs]) => {
    const span = form.querySelector(`[data-error-for="${name}"]`);
    if (span) span.textContent = msgs[0];
  });
}

// ----- Pagination (format standard Laravel) -----
function paginationHtml(p) {
  return `<div class="pagination"><span>${p.total} résultat(s) - page ${p.current_page} / ${p.last_page}</span>
    <span><button class="btn" data-page="${p.current_page - 1}" ${p.current_page <= 1 ? 'disabled' : ''}>Précédent</button>
    <button class="btn" data-page="${p.current_page + 1}" ${p.current_page >= p.last_page ? 'disabled' : ''}>Suivant</button></span></div>`;
}

// Affiche les icônes Lucide sans jamais bloquer la page si la librairie n'est pas chargée.
function refreshIcons() {
  if (window.lucide) lucide.createIcons();
}

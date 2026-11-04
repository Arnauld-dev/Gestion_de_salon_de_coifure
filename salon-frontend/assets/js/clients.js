// Module Clients : liste paginée, recherche, détails, ajout, modification, suppression (admin).
const content = buildShell('clients', 'Clients');
const state = { page: 1, q: '' };
if (content) init();

function init() {
  content.innerHTML = `
    <div class="toolbar">
      <div class="search"><i data-lucide="search"></i><input id="q" type="search" placeholder="Rechercher (nom, téléphone, e-mail)"></div>
      <button class="btn btn-primary" id="btn-add"><i data-lucide="plus"></i>Ajouter un client</button>
    </div>
    <div class="card"><div id="zone"></div></div>`;
  refreshIcons();

  let timer;
  document.getElementById('q').addEventListener('input', (e) => { // recherche avec petit délai
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = e.target.value.trim(); state.page = 1; load(); }, 350);
  });
  document.getElementById('btn-add').onclick = () => openForm();
  document.getElementById('zone').addEventListener('click', onZoneClick);
  load();
}

async function load() {
  const zone = document.getElementById('zone');
  zone.innerHTML = loadingHtml();
  try {
    const p = await Api.clients.list({ q: state.q || undefined, page: state.page });
    if (!p.data.length) { zone.innerHTML = emptyHtml(state.q ? 'Aucun client ne correspond à cette recherche.' : 'Aucun client enregistré. Ajoutez le premier.'); return; }
    zone.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Nom</th><th>Prénom</th><th>Téléphone</th><th>E-mail</th><th>Naissance</th><th>Préférences</th><th>Allergies</th><th></th></tr></thead>
      <tbody>${p.data.map(rowHtml).join('')}</tbody></table></div>${paginationHtml(p)}`;
    refreshIcons();
  } catch (err) { zone.innerHTML = errorHtml(err); }
}

const rowHtml = (c) => `<tr>
  <td>${esc(c.nom)}</td><td>${esc(c.prenom)}</td><td>${esc(c.telephone || '-')}</td><td>${esc(c.email || '-')}</td>
  <td>${fmtDate(c.date_naissance)}</td><td class="wrap">${esc(c.preferences || '-')}</td><td class="wrap">${esc(c.allergies || '-')}</td>
  <td class="actions">
    <button class="icon-btn" data-action="show" data-id="${c.id}" title="Détails"><i data-lucide="eye"></i></button>
    <button class="icon-btn" data-action="edit" data-id="${c.id}" title="Modifier"><i data-lucide="pencil"></i></button>
    ${isAdmin() ? `<button class="icon-btn danger" data-action="delete" data-id="${c.id}" data-name="${esc(c.prenom + ' ' + c.nom)}" title="Supprimer"><i data-lucide="trash-2"></i></button>` : ''}
  </td></tr>`;

// Un seul écouteur pour tous les boutons du tableau (délégation d'événements)
async function onZoneClick(e) {
  const page = e.target.closest('[data-page]');
  if (page) { state.page = Number(page.dataset.page); return load(); }
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id, name } = btn.dataset;
  if (action === 'show') showDetails(id);
  if (action === 'edit') openForm(await Api.clients.show(id).catch(() => null));
  if (action === 'delete' && await confirmDialog(`Supprimer le client ${name} ?`)) {
    try { await Api.clients.remove(id); toast('Client supprimé.'); load(); }
    catch (err) { toast(apiError(err).message, 'error'); } // ex. 409 : le client a des visites
  }
}

// Fiche client + historique des visites (GET /clients/{id})
async function showDetails(id) {
  const body = openModal('Détails du client', loadingHtml());
  try {
    const c = await Api.clients.show(id);
    const visites = c.visites || [];
    body.innerHTML = `<dl class="detail-list">
      <dt>Nom complet</dt><dd>${esc(fullName(c))}</dd><dt>Téléphone</dt><dd>${esc(c.telephone || '-')}</dd>
      <dt>E-mail</dt><dd>${esc(c.email || '-')}</dd><dt>Date de naissance</dt><dd>${fmtDate(c.date_naissance)}</dd>
      <dt>Préférences</dt><dd>${esc(c.preferences || '-')}</dd><dt>Allergies</dt><dd>${esc(c.allergies || '-')}</dd></dl>
      <h2>Historique des visites (${visites.length})</h2>
      ${visites.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Service</th><th>Employé</th><th>Prix</th><th>Facture</th></tr></thead><tbody>
        ${visites.map((v) => `<tr><td>${fmtDateTime(v.date_visite)}</td><td>${esc(v.service?.nom_service || '-')}</td><td>${esc(fullName(v.employe))}</td><td>${fmtMoney(v.prix)}</td><td>${esc(v.facture?.numero || '-')}</td></tr>`).join('')}
        </tbody></table></div>` : emptyHtml('Aucune visite pour ce client.')}`;
  } catch (err) { body.innerHTML = errorHtml(err); }
}

// Formulaire d'ajout / modification
function openForm(client = null) {
  const c = client || {};
  const f = (name, label, type = 'text', value = '') => `<div class="field"><label for="f-${name}">${label}</label>
    <input id="f-${name}" name="${name}" type="${type}" value="${esc(value)}"><div class="field-error" data-error-for="${name}"></div></div>`;
  const area = (name, label, value = '') => `<div class="field"><label for="f-${name}">${label}</label>
    <textarea id="f-${name}" name="${name}">${esc(value)}</textarea><div class="field-error" data-error-for="${name}"></div></div>`;

  const body = openModal(client ? 'Modifier le client' : 'Ajouter un client', `<form id="client-form" novalidate>
    <div class="form-grid">${f('nom', 'Nom', 'text', c.nom)}${f('prenom', 'Prénom', 'text', c.prenom)}
    ${f('telephone', 'Téléphone', 'text', c.telephone)}${f('email', 'E-mail', 'email', c.email)}</div>
    ${f('date_naissance', 'Date de naissance', 'date', (c.date_naissance || '').slice(0, 10))}
    ${area('preferences', 'Préférences', c.preferences)}${area('allergies', 'Allergies', c.allergies)}
    <div class="form-actions"><button type="button" class="btn" data-close>Annuler</button>
    <button type="submit" class="btn btn-primary">Enregistrer</button></div></form>`);

  const form = body.querySelector('#client-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    const data = Object.fromEntries(new FormData(form)); // noms de champs = noms attendus par Laravel
    if (!data.nom.trim()) return showFieldErrors(form, { nom: ['Le nom est obligatoire.'] });
    if (!data.prenom.trim()) return showFieldErrors(form, { prenom: ['Le prénom est obligatoire.'] });
    try {
      client ? await Api.clients.update(client.id, data) : await Api.clients.create(data);
      closeModal(); toast(client ? 'Client modifié.' : 'Client ajouté.'); load();
    } catch (err) {
      const { message, errors } = apiError(err);
      errors ? showFieldErrors(form, errors) : toast(message, 'error');
    }
  });
}

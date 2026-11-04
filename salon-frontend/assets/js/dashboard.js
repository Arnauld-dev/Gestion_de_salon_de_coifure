// Tableau de bord. Admin : /rapports/*. Réception : seulement les routes qui lui sont ouvertes.
const content = buildShell('dashboard', 'Tableau de bord');
if (content) loadDashboard();

const statCard = (icon, label, value) => `<div class="card stat"><div class="stat-icon"><i data-lucide="${icon}"></i></div>
  <div><small>${esc(label)}</small><strong>${esc(value)}</strong></div></div>`;

async function loadDashboard() {
  content.innerHTML = loadingHtml();
  try {
    isAdmin() ? await renderAdmin() : await renderReception();
    refreshIcons();
  } catch (err) { content.innerHTML = errorHtml(err); }
}

async function renderAdmin() {
  const [dash, annuel, mensuel, emp, serv, visites, paiements, depenses] = await Promise.all([
    Api.rapports.dashboard(), Api.rapports.annuel(), Api.rapports.mensuel(),
    Api.employes.list({ actif: 1, per_page: 1 }), Api.services.list({ actif: 1 }),
    Api.visites.list({ per_page: 5 }), Api.paiements.list({ per_page: 5 }), Api.depenses.list({ per_page: 5 }),
  ]);
  content.innerHTML = `
    <div class="grid stats">
      ${statCard('users', 'Clients', dash.clients_total)}
      ${statCard('user-cog', 'Employés actifs', emp.total)}
      ${statCard('scissors', 'Services actifs', serv.length)}
      ${statCard('calendar-check', 'Visites (total)', visites.total)}
      ${statCard('wallet', 'Chiffre d\'affaires du jour', fmtMoney(dash.ca_jour))}
      ${statCard('wallet', 'Chiffre d\'affaires du mois', fmtMoney(dash.ca_mois))}
      ${statCard('receipt', 'Dépenses du mois', fmtMoney(dash.depenses_mois))}
      ${statCard('wallet', 'Résultat du mois', fmtMoney(dash.resultat_mois))}
      ${statCard('file-text', 'Factures impayées', dash.factures_impayees.nombre + ' (reste ' + fmtMoney(dash.factures_impayees.reste_a_encaisser) + ')')}
    </div>
    <p style="color:var(--muted);margin-bottom:16px">Le résultat = encaissements - dépenses enregistrées. Les commissions et salaires n'y sont déduits que s'ils sont saisis en dépenses.</p>
    <div class="grid cols-2">
      <div class="card"><h2>Évolution ${annuel.annee} (CA et dépenses)</h2><div class="chart-box"><canvas id="chart-annuel"></canvas></div></div>
      <div class="card"><h2>Modes de paiement (mois en cours)</h2><div class="chart-box"><canvas id="chart-modes"></canvas></div></div>
    </div>
    <div class="grid cols-3">
      <div class="card"><h2>Dernières visites</h2>${listHtml(visites.data, (v) => [fullName(v.client), fmtDateTime(v.date_visite), fmtMoney(v.prix)])}</div>
      <div class="card"><h2>Derniers paiements</h2>${listHtml(paiements.paiements.data, (p) => [fullName(p.visite?.client), fmtDate(p.date_paiement), fmtMoney(p.montant)])}</div>
      <div class="card"><h2>Dernières dépenses</h2>${listHtml(depenses.depenses.data, (d) => [labelOf(d.type_depense), fmtDate(d.date_depense), fmtMoney(d.montant)])}</div>
    </div>`;

  const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  new Chart(document.getElementById('chart-annuel'), {
    type: 'bar',
    data: { labels: mois, datasets: [
      { label: 'Chiffre d\'affaires', data: annuel.mois.map((m) => m.chiffre_affaires), backgroundColor: '#B8955A' },
      { label: 'Dépenses', data: annuel.mois.map((m) => m.depenses), backgroundColor: '#777777' }] },
    options: { responsive: true, maintainAspectRatio: false },
  });
  const modes = Object.entries(mensuel.par_mode_paiement);
  new Chart(document.getElementById('chart-modes'), {
    type: 'doughnut',
    data: { labels: modes.map(([k]) => labelOf(k)), datasets: [{ data: modes.map(([, v]) => v), backgroundColor: ['#B8955A', '#2E7D5B', '#777777', '#1C1C1C', '#E8E5DF'] }] },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

// Réception : pas d'accès aux rapports, on affiche ce que les routes autorisées permettent.
async function renderReception() {
  const today = new Date().toISOString().slice(0, 10);
  const [clients, jour, impayees, visites, paiements] = await Promise.all([
    Api.clients.list({ per_page: 1 }), Api.visites.list({ debut: today, fin: today, per_page: 1 }),
    Api.factures.list({ statut: 'non_payee', per_page: 1 }),
    Api.visites.list({ per_page: 5 }), Api.paiements.list({ per_page: 5 }),
  ]);
  content.innerHTML = `
    <div class="grid stats">
      ${statCard('users', 'Clients', clients.total)}
      ${statCard('calendar-check', 'Visites du jour', jour.total)}
      ${statCard('file-text', 'Factures non payées', impayees.total)}
    </div>
    <div class="grid cols-2" style="grid-template-columns:1fr 1fr">
      <div class="card"><h2>Dernières visites</h2>${listHtml(visites.data, (v) => [fullName(v.client), fmtDateTime(v.date_visite), fmtMoney(v.prix)])}</div>
      <div class="card"><h2>Derniers paiements</h2>${listHtml(paiements.paiements.data, (p) => [fullName(p.visite?.client), fmtDate(p.date_paiement), fmtMoney(p.montant)])}</div>
    </div>`;
}

// Petit tableau de 3 colonnes pour les "dernières activités"
function listHtml(rows, mapFn) {
  if (!rows.length) return emptyHtml('Aucune donnée pour le moment.');
  return `<div class="table-wrap"><table><tbody>${rows.map((r) => `<tr>${mapFn(r).map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

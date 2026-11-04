'use strict';
// Module 4 : gestion financière (paiements, factures, dépenses, statistiques).
E.factures = {
  t: 'Factures', path: '/factures', ro: 1, nodel: 1,
  flt: ['statut', [['', 'Tous les statuts'], ['non_payee', 'Non payées'], ['partielle', 'Partielles'], ['payee', 'Payées']]],
  cols: [['N°', r => r.numero], ['Date', r => fdate(r.date_facture)], ['Client', r => nm(r.visite.client)], ['Service', r => r.visite.service.nom_service],
    ['Total', r => fmt(r.montant_total)], ['Payé', r => fmt(r.montant_paye)], ['Reste', r => fmt(r.reste_a_payer)], ['Statut', r => badge(r.statut)]],
  acts: [{ l: 'Détails', i: 'eye', fn: r => detail(r.id) }, { l: 'Encaisser', i: 'banknote', show: r => r.reste_a_payer > 0, fn: r => pay(r.visite_id, r.reste_a_payer) }],
};

E.paiements = {
  t: 'Paiements', path: '/paiements', ro: 1, del: 'admin', get: d => d.paiements, info: d => 'Total de la sélection : ' + fmt(d.total_selection),
  cols: [['Date', r => fdate(r.date_paiement)], ['Client', r => nm(r.visite && r.visite.client)], ['Montant', r => fmt(r.montant)], ['Mode', r => lab(MODES, r.mode_paiement)], ['Référence', r => r.reference]],
};

E.depenses = {
  t: 'Dépenses', path: '/depenses', w: 'admin', get: d => d.depenses, info: d => 'Total de la sélection : ' + fmt(d.total_selection),
  cols: [['Date', r => fdate(r.date_depense)], ['Type', r => lab(TYPES, r.type_depense)], ['Description', r => r.description], ['Montant', r => fmt(r.montant)]],
  f: [['type_depense', 'Type', 'select', 1, TYPES], ['description', 'Description'], ['montant', 'Montant', 'number', 1], ['date_depense', 'Date', 'date', 1, null, 'today']],
};

let ongletFinance = 'paiements';
const ONGLETS = [['paiements', 'Paiements', 'wallet'], ['factures', 'Factures', 'receipt'], ['depenses', 'Dépenses', 'banknote', 1], ['stats', 'Statistiques', 'trending-up', 1]];

PAGES.finances = async function () {
  const onglets = ONGLETS.filter(o => !o[3] || admin()); // dépenses et statistiques : gérant seulement
  if (!onglets.some(o => o[0] === ongletFinance)) ongletFinance = 'paiements';
  $('#main').innerHTML = `<div class="tabs">${onglets.map(o => `<button data-t="${o[0]}" class="${o[0] === ongletFinance ? 'on' : ''}"><i data-lucide="${o[2]}"></i>${o[1]}</button>`).join('')}</div><div id="tab"></div>`;
  $$('.tabs button').forEach(b => b.onclick = () => { ongletFinance = b.dataset.t; viderGraphiques(); safe(PAGES.finances)(); });
  return ongletFinance === 'stats' ? statistiques() : list(ongletFinance, 1, '', '', 'tab');
};

// Statistiques : chiffre d'affaires, dépenses, bénéfice et graphiques d'un mois
async function statistiques(mois) {
  mois = mois || today().slice(0, 7);
  const [m, a, j] = await Promise.all([api('/rapports/mensuel?mois=' + mois), api('/rapports/annuel?annee=' + mois.slice(0, 4)), api('/rapports/jour')]);
  $('#tab').innerHTML = `<div class="bar"><span class="grow"></span><input type="month" id="mois" value="${mois}"></div>
    <div class="stats">${stat('Chiffre d’affaires du jour', fmt(j.chiffre_affaires))}${stat('Chiffre d’affaires du mois', fmt(m.chiffre_affaires))}${stat('Total des dépenses', fmt(m.depenses))}${stat('Bénéfice du mois', fmt(m.resultat))}</div>
    <div class="charts"><div class="card"><h3>Chiffre d’affaires par jour</h3><div class="chart-box"><canvas id="gs1"></canvas></div></div>
    <div class="card"><h3>Répartition des paiements</h3><div class="chart-box"><canvas id="gs2"></canvas></div></div></div>
    <div class="g2"><div class="card"><h3>Dépenses par type</h3>${tbl(['Type', 'Montant'], TYPES.map(([k, l]) => [l, fmt(m.depenses_par_type[k])]))}</div>
    <div class="card"><h3>Année ${a.annee}</h3>${tbl(['Mois', 'CA', 'Dépenses', 'Bénéfice'], a.mois.map(x => [x.mois, fmt(x.chiffre_affaires), fmt(x.depenses), fmt(x.resultat)]))}</div></div>`;
  viderGraphiques();
  dessiner('gs1', 'line', m.ca_par_jour.map(x => fdate(x.jour).slice(0, 5)), m.ca_par_jour.map(x => x.total), '#B8955A');
  dessiner('gs2', 'doughnut', MODES.map(x => x[1]), MODES.map(x => m.par_mode_paiement[x[0]]), COULEURS);
  $('#mois').onchange = e => e.target.value && safe(statistiques)(e.target.value);
}

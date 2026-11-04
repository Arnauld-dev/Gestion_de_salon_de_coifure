// Factures : lecture seule (le backend les crée avec la visite). Détail imprimable.
const factureStatut = (f) => {
  const paye = Number(f.paiements_sum_montant || 0), total = Number(f.montant_total);
  if (paye >= total) return '<span class="badge success">Payée</span>';
  return paye > 0 ? '<span class="badge">Partielle</span>' : '<span class="badge error">Non payée</span>';
};

async function factureDetail(id) {
  const f = await Api.factures.show(id);
  const v = f.visite || {}, pay = f.paiements || [];
  const paye = pay.reduce((s, p) => s + Number(p.montant), 0);
  const reste = Math.max(Number(f.montant_total) - paye, 0);
  return `<div class="invoice">
    <div class="inv-head"><h2>${esc(SALON_NAME)}</h2>
      <div class="inv-num"><strong>Facture ${esc(f.numero)}</strong><br>Date : ${fmtDate(f.date_facture)}</div></div>
    <p class="inv-block"><strong>Client</strong><br>${esc(fullName(v.client))}<br>${esc(v.client?.telephone || '')}<br>${esc(v.client?.email || '')}</p>
    <table><thead><tr><th>Prestation</th><th>Employé</th><th>Date de la visite</th><th>Prix</th></tr></thead>
      <tbody><tr><td>${esc(v.service?.nom_service)}</td><td>${esc(fullName(v.employe))}</td><td>${fmtDateTime(v.date_visite)}</td><td>${fmtMoney(f.montant_total)}</td></tr></tbody></table>
    <h3>Paiements</h3>
    ${pay.length ? `<table><thead><tr><th>Date</th><th>Mode</th><th>Référence</th><th>Montant</th></tr></thead><tbody>
      ${pay.map((p) => `<tr><td>${fmtDate(p.date_paiement)}</td><td>${esc(labelOf(p.mode_paiement))}</td><td>${esc(p.reference || '-')}</td><td>${fmtMoney(p.montant)}</td></tr>`).join('')}</tbody></table>` : '<p>Aucun paiement enregistré.</p>'}
    <p class="inv-total">Montant total : ${fmtMoney(f.montant_total)}<br>Déjà payé : ${fmtMoney(paye)}<br><strong>Reste à payer : ${fmtMoney(reste)}</strong></p>
  </div>
  <div class="form-actions no-print"><button class="btn btn-primary" onclick="window.print()"><i data-lucide="printer"></i>Imprimer la facture</button></div>`;
}

createCrudPage({
  key: 'factures', title: 'Factures', emptyMsg: 'Aucune facture trouvée.',
  canWrite: () => false, canDelete: () => false,
  list: Api.factures.list, detail: factureDetail, detailTitle: 'Facture', detailIcon: 'printer',
  filters: [
    { name: 'statut', label: 'Statut', type: 'select', options: [{ value: 'payee', label: 'Payée' }, { value: 'partielle', label: 'Partielle' }, { value: 'non_payee', label: 'Non payée' }] },
    { name: 'debut', label: 'Du', type: 'date' }, { name: 'fin', label: 'Au', type: 'date' },
  ],
  columns: [
    ['Numéro', (r) => r.numero], ['Client', (r) => fullName(r.visite?.client)], ['Date', (r) => fmtDate(r.date_facture)],
    ['Prestation', (r) => r.visite?.service?.nom_service || '-'], ['Total', (r) => fmtMoney(r.montant_total)],
    ['Payé', (r) => fmtMoney(r.paiements_sum_montant)], ['Reste', (r) => fmtMoney(Math.max(r.montant_total - (r.paiements_sum_montant || 0), 0))],
    ['Statut', factureStatut, true],
  ],
});

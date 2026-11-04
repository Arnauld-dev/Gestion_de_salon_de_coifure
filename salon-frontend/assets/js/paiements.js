// Paiements : création et suppression (admin). Pas de modification côté backend.
// Modes connus (SQL) : à compléter selon l'enum ModePaiement.
const MODES = ['especes', 'mobile_money'];

createCrudPage({
  key: 'paiements', title: 'Paiements', addLabel: 'Enregistrer un paiement', emptyMsg: 'Aucun paiement trouvé.',
  list: Api.paiements.list, paginated: (r) => r.paiements, create: Api.paiements.create, remove: Api.paiements.remove,
  summary: (r) => `<div class="card summary">Total de la sélection : <strong>${fmtMoney(r.total_selection)}</strong></div>`,
  deleteMsg: () => 'Annuler ce paiement ? La facture sera recalculée.',
  filters: [
    { name: 'mode_paiement', label: 'Mode', type: 'select', options: toOptions(MODES) },
    { name: 'debut', label: 'Du', type: 'date' }, { name: 'fin', label: 'Au', type: 'date' },
  ],
  columns: [
    ['Date', (r) => fmtDate(r.date_paiement)], ['Client', (r) => fullName(r.visite?.client)], ['Visite', (r) => 'Visite n° ' + r.visite_id],
    ['Montant', (r) => fmtMoney(r.montant)], ['Mode', (r) => labelOf(r.mode_paiement)], ['Référence', (r) => r.reference || '-'],
  ],
  fields: [
    { name: 'visite_id', label: 'Facture à payer', type: 'select', required: true, full: true,
      options: async () => { // seulement les factures non soldées
        const [a, b] = await Promise.all([Api.factures.list({ statut: 'non_payee', per_page: 100 }), Api.factures.list({ statut: 'partielle', per_page: 100 })]);
        return [...a.data, ...b.data].map((f) => ({ value: f.visite_id, label: `${f.numero} - ${fullName(f.visite?.client)} - reste ${fmtMoney(f.montant_total - (f.paiements_sum_montant || 0))}` }));
      } },
    { name: 'montant', label: 'Montant (FBu)', type: 'number', attrs: 'min="0.01" step="any"', required: true },
    { name: 'mode_paiement', label: 'Mode de paiement', type: 'select', options: toOptions(MODES), required: true },
    { name: 'date_paiement', label: 'Date du paiement', type: 'date' }, { name: 'reference', label: 'Référence' },
  ],
  defaults: { date_paiement: today() },
});

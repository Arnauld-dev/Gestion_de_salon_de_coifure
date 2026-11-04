// Dépenses : réservé à l'admin. Types connus (SQL + cahier des charges) : à confirmer avec l'enum TypeDepense.
const TYPES = ['loyer', 'electricite', 'produits', 'salaires', 'autres'];

createCrudPage({
  key: 'depenses', title: 'Dépenses', addLabel: 'Ajouter une dépense', adminOnly: true, emptyMsg: 'Aucune dépense trouvée.',
  list: Api.depenses.list, paginated: (r) => r.depenses, create: Api.depenses.create, update: Api.depenses.update, remove: Api.depenses.remove,
  summary: (r) => `<div class="card summary">Total de la sélection : <strong>${fmtMoney(r.total_selection)}</strong></div>`,
  deleteMsg: (r) => `Supprimer la dépense "${r.description || labelOf(r.type_depense)}" ?`,
  filters: [
    { name: 'type_depense', label: 'Type', type: 'select', options: toOptions(TYPES) },
    { name: 'debut', label: 'Du', type: 'date' }, { name: 'fin', label: 'Au', type: 'date' },
  ],
  columns: [['Date', (r) => fmtDate(r.date_depense)], ['Type', (r) => labelOf(r.type_depense)], ['Description', (r) => r.description || '-'], ['Montant', (r) => fmtMoney(r.montant)]],
  fields: [
    { name: 'type_depense', label: 'Type de dépense', type: 'select', options: toOptions(TYPES), required: true },
    { name: 'date_depense', label: 'Date', type: 'date', required: true },
    { name: 'montant', label: 'Montant (FBu)', type: 'number', attrs: 'min="0.01" step="any"', required: true },
    { name: 'description', label: 'Description' },
  ],
  defaults: { date_depense: today() },
  toForm: (r) => ({ date_depense: String(r.date_depense).slice(0, 10) }),
});

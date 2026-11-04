// Employés : lecture pour tous, écriture réservée à l'admin (backend).
// Valeurs de poste connues (SQL + cahier des charges) : à confirmer avec l'enum Poste.
const POSTES = ['coiffeur', 'coloriste', 'shampouineur', 'receptionniste'];
const remuneration = (r) => r.type_remuneration === 'commission'
  ? `${Math.round(Number(r.salaire_ou_commission) * 100)} % de commission`
  : fmtMoney(r.salaire_ou_commission) + ' / mois';

createCrudPage({
  key: 'employes', title: 'Employés', addLabel: 'Ajouter un employé', emptyMsg: 'Aucun employé enregistré.',
  canWrite: isAdmin,
  list: Api.employes.list, create: Api.employes.create, update: Api.employes.update, remove: Api.employes.remove,
  deleteMsg: (r) => `Supprimer ${fullName(r)} ? Si des visites existent, désactivez-le plutôt.`,
  filters: [
    { name: 'q', label: 'Rechercher un employé' },
    { name: 'poste', label: 'Poste', type: 'select', options: toOptions(POSTES) },
    { name: 'actif', label: 'Statut', type: 'select', options: [{ value: '1', label: 'Actif' }, { value: '0', label: 'Inactif' }] },
  ],
  columns: [
    ['Nom', (r) => r.nom], ['Prénom', (r) => r.prenom], ['Téléphone', (r) => r.telephone || '-'],
    ['Poste', (r) => labelOf(r.poste)], ['Spécialités', (r) => r.specialites || '-'], ['Horaires', (r) => r.horaires || '-'],
    ['Rémunération', remuneration],
    ['Services', (r) => (r.services || []).map((s) => `<span class="badge">${esc(s.nom_service)}</span>`).join(' ') || '-', true],
    ['Statut', (r) => statusBadge(r.actif), true],
  ],
  fields: [
    { name: 'nom', label: 'Nom', required: true }, { name: 'prenom', label: 'Prénom', required: true },
    { name: 'telephone', label: 'Téléphone' }, { name: 'adresse', label: 'Adresse' },
    { name: 'poste', label: 'Poste', type: 'select', options: toOptions(POSTES), required: true },
    { name: 'type_remuneration', label: 'Type de rémunération', type: 'select', required: true, options: toOptions(['commission', 'salaire_fixe']) },
    { name: 'salaire_ou_commission', label: 'Salaire (FBu) ou commission (%)', type: 'number', attrs: 'min="0" step="any"', required: true },
    { name: 'actif', label: 'Statut', type: 'select', options: [{ value: '1', label: 'Actif' }, { value: '0', label: 'Inactif' }] },
    { name: 'specialites', label: 'Spécialités' }, { name: 'horaires', label: 'Horaires' },
    { name: 'services', label: 'Services réalisés', type: 'checks',
      options: async () => (await Api.services.list({ actif: 1 })).map((s) => ({ value: s.id, label: s.nom_service })) },
  ],
  defaults: { actif: '1' },
  // Le backend attend un taux entre 0 et 1 : on saisit des pourcentages.
  toForm: (r) => ({
    actif: r.actif ? '1' : '0', services: (r.services || []).map((s) => s.id),
    salaire_ou_commission: r.type_remuneration === 'commission' ? Math.round(r.salaire_ou_commission * 100) : Number(r.salaire_ou_commission),
  }),
  beforeSend: (d) => { if (d.type_remuneration === 'commission') d.salaire_ou_commission = Number(d.salaire_ou_commission) / 100; return d; },
});

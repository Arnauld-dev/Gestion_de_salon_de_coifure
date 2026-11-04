// Services : l'API renvoie la liste complète (non paginée) -> recherche et pagination faites ici.
createCrudPage({
  key: 'services', title: 'Services', addLabel: 'Ajouter un service', emptyMsg: 'Aucun service trouvé.',
  canWrite: isAdmin,
  list: async (p) => {
    const all = await Api.services.list(p.actif !== undefined ? { actif: p.actif } : {});
    const q = (p.q || '').toLowerCase();
    const rows = all.filter((s) => s.nom_service.toLowerCase().includes(q));
    const per = 10, page = p.page || 1;
    return { data: rows.slice((page - 1) * per, page * per), current_page: page, last_page: Math.max(1, Math.ceil(rows.length / per)), total: rows.length };
  },
  create: Api.services.create, update: Api.services.update, remove: Api.services.remove,
  deleteMsg: (r) => `Supprimer le service "${r.nom_service}" ? S'il a déjà été réalisé, désactivez-le plutôt.`,
  filters: [
    { name: 'q', label: 'Rechercher un service' },
    { name: 'actif', label: 'Statut', type: 'select', options: [{ value: '1', label: 'Actif' }, { value: '0', label: 'Inactif' }] },
  ],
  columns: [
    ['Service', (r) => r.nom_service], ['Durée', (r) => r.duree_minutes + ' min'], ['Prix', (r) => fmtMoney(r.prix)],
    ['Employés', (r) => (r.employes || []).map((e) => `<span class="badge">${esc(fullName(e))}</span>`).join(' ') || '-', true],
    ['Statut', (r) => statusBadge(r.actif), true],
  ],
  fields: [
    { name: 'nom_service', label: 'Nom du service', required: true, full: true },
    { name: 'duree_minutes', label: 'Durée (minutes)', type: 'number', attrs: 'min="5" max="600"', required: true },
    { name: 'prix', label: 'Prix (FBu)', type: 'number', attrs: 'min="0" step="any"', required: true },
    { name: 'actif', label: 'Statut', type: 'select', options: [{ value: '1', label: 'Actif' }, { value: '0', label: 'Inactif' }] },
    { name: 'employes', label: 'Employés pouvant le réaliser', type: 'checks',
      options: async () => (await Api.employes.list({ actif: 1, per_page: 100 })).data.map((e) => ({ value: e.id, label: fullName(e) })) },
  ],
  defaults: { actif: '1' },
  toForm: (r) => ({ actif: r.actif ? '1' : '0', employes: (r.employes || []).map((e) => e.id) }),
});

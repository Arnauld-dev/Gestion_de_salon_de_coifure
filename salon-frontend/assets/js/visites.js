// Visites : création et modification pour tous ; suppression admin (supprime aussi facture et paiements).
const optClients = async () => (await Api.clients.list({ per_page: 100 })).data.map((c) => ({ value: c.id, label: fullName(c) }));
const optEmployes = async () => (await Api.employes.list({ per_page: 100 })).data.map((e) => ({ value: e.id, label: fullName(e) }));
const optServices = async () => (await Api.services.list()).map((s) => ({ value: s.id, label: s.nom_service }));

createCrudPage({
  key: 'visites', title: 'Visites', addLabel: 'Enregistrer une visite', emptyMsg: 'Aucune visite enregistrée.',
  list: Api.visites.list, create: Api.visites.create, update: Api.visites.update, remove: Api.visites.remove,
  deleteMsg: () => 'Supprimer cette visite ? Sa facture et ses paiements seront aussi supprimés.',
  filters: [
    { name: 'client_id', label: 'Client', type: 'select', options: optClients },
    { name: 'employe_id', label: 'Employé', type: 'select', options: optEmployes },
    { name: 'service_id', label: 'Service', type: 'select', options: optServices },
    { name: 'debut', label: 'Du', type: 'date' }, { name: 'fin', label: 'Au', type: 'date' },
  ],
  columns: [
    ['Date', (r) => fmtDateTime(r.date_visite)], ['Client', (r) => fullName(r.client)], ['Employé', (r) => fullName(r.employe)],
    ['Service', (r) => r.service?.nom_service || '-'], ['Prix', (r) => fmtMoney(r.prix)],
    ['Notes', (r) => r.notes || '-'], ['Facture', (r) => r.facture?.numero || '-'],
  ],
  fields: [
    { name: 'client_id', label: 'Client', type: 'select', options: optClients, required: true, createOnly: true },
    { name: 'employe_id', label: 'Employé', type: 'select', required: true, createOnly: true,
      options: async () => (await Api.employes.list({ actif: 1, per_page: 100 })).data.map((e) => ({ value: e.id, label: fullName(e) })) },
    { name: 'service_id', label: 'Service', type: 'select', options: optServices, required: true, createOnly: true },
    { name: 'date_visite', label: 'Date et heure', type: 'datetime-local', required: true },
    { name: 'prix', label: 'Prix (vide = prix du service)', type: 'number', attrs: 'min="0" step="any"' },
    { name: 'notes', label: 'Notes', type: 'textarea', full: true },
  ],
  editNote: (r) => `Client, employé et service ne sont pas modifiables : ${esc(fullName(r.client))} - ${esc(fullName(r.employe))} - ${esc(r.service?.nom_service)}.`,
  toForm: (r) => ({ date_visite: String(r.date_visite).replace(' ', 'T').slice(0, 16) }),
  beforeSend: (d) => { if (d.prix === '') delete d.prix; return d; },
});

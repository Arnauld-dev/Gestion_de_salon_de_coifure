'use strict';
// Module 2 : gestion des employés (fiche, horaires, congés, rémunération).
E.employes = {
  t: 'Employés', path: '/employes', search: 1, w: 'admin',
  acts: [{ l: 'Détails', i: 'eye', fn: r => employeDetail(r.id) }],  cols: [['Nom', nm], ['Poste', r => lab(POSTES, r.poste)], ['Services', r => (r.services || []).map(s => s.nom_service).join(', ')], ['Horaires', r => r.horaires],
    ['Rémunération', r => r.type_remuneration === 'commission' ? Math.round(r.salaire_ou_commission * 100) + ' %' : fmt(r.salaire_ou_commission)], ['Actif', r => r.actif ? 'Oui' : 'Non']],
  f: [['nom', 'Nom', 'text', 1], ['prenom', 'Prénom', 'text', 1], ['telephone', 'Téléphone'], ['adresse', 'Adresse'], ['poste', 'Poste', 'select', 1, POSTES],
    ['specialites', 'Spécialités'], ['horaires', 'Horaires de travail'], ['type_remuneration', 'Type de rémunération', 'select', 1, [['commission', 'Commission'], ['salaire_fixe', 'Salaire fixe']]],
    ['salaire_ou_commission', 'Taux de commission (0.30 = 30 %) ou salaire mensuel', 'number', 1], ['actif', 'En activité', 'checkbox', 0, null, true], ['services', 'Services qu’il peut réaliser', 'multi', 0, 'services']],
};

PAGES.employes = () => list('employes');

// Fiche d'un employé : informations, services, rémunération du mois et congés
async function employeDetail(id) {
  const e = await api('/employes/' + id);
  const taux = e.type_remuneration === 'commission' ? Math.round(e.salaire_ou_commission * 100) + ' % de commission' : fmt(e.salaire_ou_commission) + ' par mois';
  const ligne = (l, v) => `<div><span>${l}</span>${esc(v) || '-'}</div>`;
  let paie = '';
  if (admin()) { // la rémunération du mois vient des rapports (réservés au gérant)
    const r = await api('/rapports/employes?mois=' + today().slice(0, 7));
    const x = r.employes.find(l => l.employe_id === e.id);
    if (x) paie = `<div class="detail">${ligne('Prestations du mois', fmt(x.total_prestations))}${ligne('Rémunération due ce mois-ci', fmt(x.remuneration_due))}</div>`;
  }
  const conges = e.conges.map(c => `<div class="conge-row"><span>${fdate(c.date_debut)} au ${fdate(c.date_fin)} ${esc(c.motif)}</span>
    ${admin() ? `<button class="btn sm icon danger" data-del="${c.id}" title="Supprimer" aria-label="Supprimer"><i data-lucide="trash-2"></i></button>` : ''}</div>`).join('');
  const m = modal(`<h3>${esc(nm(e))}</h3>
    <div class="detail">${ligne('Poste', lab(POSTES, e.poste))}${ligne('Téléphone', e.telephone)}${ligne('Adresse', e.adresse)}${ligne('Horaires de travail', e.horaires)}${ligne('Spécialités', e.specialites)}${ligne('Rémunération', taux)}</div>${paie}
    <div><span class="lbl">Services qu’il peut réaliser</span><div class="tags">${e.services.map(s => `<span class="tag">${esc(s.nom_service)}</span>`).join('') || 'Aucun'}</div></div>
    <h3>Congés</h3>${conges || '<p class="muted">Aucun congé enregistré.</p>'}
    ${admin() ? `<form class="inline-form" id="cf"><input type="date" name="d" required><input type="date" name="f" required><input name="mo" placeholder="Motif"><button class="btn sm">Ajouter un congé</button></form>` : ''}
    <div class="row"><button class="btn secondary" data-close>Fermer</button></div>`);
  const rouvrir = () => { m.close(); safe(employeDetail)(id); };
  $$('[data-del]', m.o).forEach(b => b.onclick = safe(async () => { await api('/conges/' + b.dataset.del, { method: 'DELETE' }); toast('Congé supprimé.'); rouvrir(); }));
  if ($('#cf', m.o)) $('#cf', m.o).onsubmit = safe(async ev => {
    ev.preventDefault();
    const f = ev.target;
    await api('/conges', { method: 'POST', body: { employe_id: e.id, date_debut: f.d.value, date_fin: f.f.value, motif: f.mo.value } });
    toast('Congé ajouté.'); rouvrir();
  });
}
